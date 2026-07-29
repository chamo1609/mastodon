# frozen_string_literal: true

class PostStatusService < BaseService
  include Redisable
  include Lockable
  include LanguagesHelper

  # How much to delay sending an e-mail about a new post, to allow grouping multiple posts
  EMAIL_DISTRIBUTION_DELAY = 5.minutes.freeze

  # If the job is not executed within this timeframe, it will lose its arguments
  EMAIL_DISTRIBUTION_TTL = 1.hour.to_i

  class UnexpectedMentionsError < StandardError
    attr_reader :accounts

    def initialize(message, accounts)
      super(message)
      @accounts = accounts
    end
  end

  # Post a text status update, fetch and notify remote users mentioned
  # @param [Account] account Account from which to post
  # @param [Hash] options
  # @option [String] :text Message
  # @option [Status] :thread Optional status to reply to
  # @option [Status] :quoted_status Optional status to quote
  # @option [String] :quote_approval_policy Approval policy for quotes, one of `public`, `followers` or `nobody`
  # @option [Boolean] :sensitive
  # @option [String] :visibility
  # @option [String] :spoiler_text
  # @option [String] :language
  # @option [String] :scheduled_at
  # @option [Hash] :poll Optional poll to attach
  # @option [Enumerable] :media_ids Optional array of media IDs to attach
  # @option [Doorkeeper::Application] :application
  # @option [String] :idempotency Optional idempotency key
  # @option [Boolean] :with_rate_limit
  # @option [Enumerable] :allowed_mentions Optional array of expected mentioned account IDs, raises `UnexpectedMentionsError` if unexpected accounts end up in mentions
  # @return [Status]
  def call(account, options = {})
    @account     = account
    @options     = options
    @text        = @options[:text] || ''
    @in_reply_to = @options[:thread]
    @quoted_status = @options[:quoted_status]

    with_idempotency do
      validate_media!
      preprocess_attributes!

      if scheduled?
        schedule_status!
      else
        process_status!
      end
    end

    unless scheduled?
      postprocess_status!
      bump_potential_friendship!
    end

    @status
  rescue Antispam::SilentlyDrop => e
    e.status
  end

  private

  def preprocess_attributes!
    @sensitive    = (@options[:sensitive].nil? ? @account.user&.setting_default_sensitive : @options[:sensitive]) || @options[:spoiler_text].present?
    @text         = @options.delete(:spoiler_text) if @text.blank? && @options[:spoiler_text].present? && @quoted_status.blank?
    @visibility   = @options[:visibility] || @account.user&.setting_default_privacy
    @visibility   = :unlisted if @visibility&.to_sym == :public && @account.silenced?
    @visibility   = :private if @quoted_status&.private_visibility? && %i(public unlisted).include?(@visibility&.to_sym)
    @scheduled_at = @options[:scheduled_at]&.to_datetime
    @scheduled_at = nil if scheduled_in_the_past?
  rescue ArgumentError
    raise ActiveRecord::RecordInvalid
  end

  def process_status!
    @status = @account.statuses.new(status_attributes)
    # === 카모마일 에디션: 관리자 미포함 DM 차단 검증 ===
    safeguard_chamomile_admin_dm!

    process_mentions_service.call(@status)

    # === 카모마일 에디션: 채팅방 제삼자 멘션 유입 차단 검증 ===
    safeguard_chat_room_third_party_mention!(@status)
    
    safeguard_mentions!(@status)
    safeguard_private_mention_quote!(@status)
    attach_tagged_objects!(@status)
    attach_quote!(@status)

    antispam = Antispam.new(@status)
    antispam.local_preflight_check!

    # The following transaction block is needed to wrap the UPDATEs to
    # the media attachments when the status is created
    ApplicationRecord.transaction do
      @status.save!
    end
  end

  def safeguard_private_mention_quote!(status)
    return if @quoted_status.nil? || @visibility.to_sym != :direct

    # The mentions array test here is awkward because the relationship is not persisted at this time
    return if @quoted_status.account_id == @account.id || status.mentions.to_a.any? { |mention| mention.account_id == @quoted_status.account_id && !mention.silent }

    status.errors.add(:base, I18n.t('statuses.errors.quoted_user_not_mentioned'))
    raise ActiveRecord::RecordInvalid, status
  end

  def attach_quote!(status)
    return if @quoted_status.nil?

    status.quote = Quote.create(quoted_status: @quoted_status, status: status)
    status.quote.ensure_quoted_access

    status.quote.accept! if @quoted_status.local? && StatusPolicy.new(@status.account, @quoted_status).quote?
  end

  def attach_tagged_objects!(status)
    ProcessLinksService.new.call(status)
  end

  def safeguard_mentions!(status)
    return if @options[:allowed_mentions].nil?

    expected_account_ids = @options[:allowed_mentions].map(&:to_i)

    unexpected_accounts = status.mentions.map(&:account).to_a.reject { |mentioned_account| expected_account_ids.include?(mentioned_account.id) }
    return if unexpected_accounts.empty?

    raise UnexpectedMentionsError.new('Post would be sent to unexpected accounts', unexpected_accounts)
  end
  
  # === 카모마일 에디션: 관리자 미포함 DM 차단 로직 ===
  def safeguard_chamomile_admin_dm!
    # 1. 관리자 설정 및 다이렉트 여부 확인
    return unless Setting.chamomile_dm_admin_only
    return unless @visibility.to_sym == :direct

    admin_roles = ['Admin', 'Owner', 'moderator', '관리자', '총괄', '스탭']

    # 2. 작성자 본인이 관리자급이면 패스
    return if admin_roles.include?(@account.user&.role&.name)

    # 3. 작성된 원본 텍스트(@text)에서 정규표현식으로 멘션된 계정명만 사전 추출
    extracted_usernames = Extractor.extract_mentions_or_lists_with_indices(@text).map do |mention|
      mention[:screen_name].downcase
    end

    admin_mentioned = false

    # 4. 텍스트에 태그된 계정명이 존재할 경우 DB에서 로컬 계정 여부 및 권한 대조
    if extracted_usernames.any?
      mentioned_accounts = Account.local.where('LOWER(username) IN (?)', extracted_usernames).includes(:user)
      admin_mentioned = mentioned_accounts.any? do |mentioned_account|
        admin_roles.include?(mentioned_account.user&.role&.name)
      end
    end

    # 5. 차단 및 UI에 에러 메시지 반환
    unless admin_mentioned
      # 시스템 실행을 붕괴시키는 대신, 정상적인 유효성 검사 에러를 반환하여 사용자의 UI에 메시지 출력
      raise Mastodon::ValidationError, 'DM 발송 시 총괄 계정을 반드시 태그해야 합니다.'
    end
  end
  # === 여기까지 ===

  # === 카모마일 에디션: 채팅방 제삼자 멘션 유입 차단 로직 ===
  def safeguard_chat_room_third_party_mention!(status)
    # 1. 다이렉트 메시지(DM)가 아니거나 답글(reply)이 아닌 경우 검증 생략
    return unless status.visibility.to_sym == :direct
    return unless status.in_reply_to_id.present?

    # 2. 직전 부모 툿(Parent Status)을 조회
    parent_status = Status.find_by(id: status.in_reply_to_id)
    return unless parent_status

    # 3. 허용된 참여자 ID 집합 구성
    # (부모 툿의 작성자 + 부모 툿에 포함된 멘션 대상들 + 현재 작성자 본인)
    allowed_account_ids = [parent_status.account_id]
    allowed_account_ids += parent_status.mentions.pluck(:account_id)
    allowed_account_ids << status.account_id
    allowed_account_ids.uniq!

    # 4. 현재 툿에 파싱된 멘션들 중 허용되지 않은 제삼자가 있는지 검사
    status.mentions.each do |mention|
      unless allowed_account_ids.include?(mention.account_id)
        # 인가되지 않은 제삼자라면 데이터베이스에서 해당 멘션 객체를 즉시 파기
        mention.destroy
      end
    end
  end
  # === 여기까지 ===

  def schedule_status!
    status_for_validation = @account.statuses.build(status_attributes)

    # === 카모마일 에디션: 관리자 미포함 DM 차단 검증 ===
    safeguard_chamomile_admin_dm!

    safeguard_private_mention_quote!(status_for_validation)

    antispam = Antispam.new(status_for_validation)
    antispam.local_preflight_check!

    if status_for_validation.valid?
      # Marking the status as destroyed is necessary to prevent the status from being
      # persisted when the associated media attachments get updated when creating the
      # scheduled status.
      status_for_validation.destroy

      # The following transaction block is needed to wrap the UPDATEs to
      # the media attachments when the scheduled status is created

      ApplicationRecord.transaction do
        @status = @account.scheduled_statuses.create!(scheduled_status_attributes)
      end
    else
      raise ActiveRecord::RecordInvalid
    end
  rescue Antispam::SilentlyDrop
    @status = @account.scheduled_status.new(scheduled_status_attributes).tap(&:delete)
  end

  def postprocess_status!
    process_hashtags_service.call(@status)
    Trends.tags.register(@status)
    LinkCrawlWorker.perform_async(@status.id)
    DistributionWorker.perform_async(@status.id)
    process_email_subscriptions!
    ActivityPub::DistributionWorker.perform_async(@status.id)
    PollExpirationNotifyWorker.perform_at(@status.poll.expires_at, @status.poll.id) if @status.poll
    ActivityPub::QuoteRequestWorker.perform_async(@status.quote.id) if @status.quote&.quoted_status.present? && !@status.quote&.quoted_status&.local?
  end

  def process_email_subscriptions!
    return unless Rails.application.config.x.email_subscriptions && Setting.email_subscriptions &&
                  @status.public_visibility? && (!@status.reply? || @status.in_reply_to_account_id == @status.account_id) &&
                  @status.account.user_can?(:manage_email_subscriptions) &&
                  @status.account.user_email_subscriptions_enabled?

    # To allow e-mail grouping, pass the arguments via a redis set and schedule
    # a unique worker a few minutes in the future, in case the user makes subsequent
    # posts within that time window
    redis.sadd("email_subscriptions:#{@status.account_id}:next_batch", @status.id)
    redis.expire("email_subscriptions:#{@status.account_id}:next_batch", EMAIL_DISTRIBUTION_TTL)
    EmailDistributionWorker.perform_in(EMAIL_DISTRIBUTION_DELAY, @status.account_id)
  end

  def validate_media!
    if @options[:media_ids].blank? || !@options[:media_ids].is_a?(Enumerable)
      @media = []
      return
    end

    raise Mastodon::ValidationError, I18n.t('media_attachments.validations.too_many') if @options[:media_ids].size > Status::MEDIA_ATTACHMENTS_LIMIT

    @media = @account.media_attachments.where(status_id: nil).where(id: @options[:media_ids].take(Status::MEDIA_ATTACHMENTS_LIMIT).map(&:to_i))

    not_found_ids = @options[:media_ids].map(&:to_i) - @media.map(&:id)
    raise Mastodon::ValidationError, I18n.t('media_attachments.validations.not_found', ids: not_found_ids.join(', ')) if not_found_ids.any?

    raise Mastodon::ValidationError, I18n.t('media_attachments.validations.images_and_video') if @media.size > 1 && @media.find(&:audio_or_video?)
    raise Mastodon::ValidationError, I18n.t('media_attachments.validations.not_ready') if @media.any?(&:not_processed?)
  end

  def process_mentions_service
    ProcessMentionsService.new
  end

  def process_hashtags_service
    ProcessHashtagsService.new
  end

  def scheduled?
    @scheduled_at.present?
  end

  def idempotency_key
    "idempotency:status:#{@account.id}:#{@options[:idempotency]}"
  end

  def idempotency_given?
    @options[:idempotency].present?
  end

  def idempotency_duplicate
    if scheduled?
      @account.scheduled_statuses.find(@idempotency_duplicate)
    else
      @account.statuses.find(@idempotency_duplicate)
    end
  end

  def idempotency_duplicate?
    @idempotency_duplicate = redis.get(idempotency_key)
  end

  def with_idempotency
    return yield unless idempotency_given?

    with_redis_lock("idempotency:lock:status:#{@account.id}:#{@options[:idempotency]}") do
      return idempotency_duplicate if idempotency_duplicate?

      yield

      redis.setex(idempotency_key, 3_600, @status.id)
    end
  end

  def scheduled_in_the_past?
    @scheduled_at.present? && @scheduled_at <= Time.now.utc
  end

  def bump_potential_friendship!
    return if !@status.reply? || @account.id == @status.in_reply_to_account_id

    ActivityTracker.increment('activity:interactions')
  end

  def status_attributes
    {
      text: @text,
      media_attachments: @media || [],
      ordered_media_attachment_ids: (@options[:media_ids] || []).map(&:to_i) & @media.map(&:id),
      thread: @in_reply_to,
      poll_attributes: poll_attributes,
      sensitive: @sensitive,
      spoiler_text: @options[:spoiler_text] || '',
      visibility: @visibility,
      language: valid_locale_cascade(@options[:language], @account.user&.preferred_posting_language, I18n.default_locale),
      application: @options[:application],
      rate_limit: @options[:with_rate_limit],
      quote_approval_policy: @options[:quote_approval_policy],
    }.compact
  end

  def scheduled_status_attributes
    {
      scheduled_at: @scheduled_at,
      media_attachments: @media || [],
      params: scheduled_options,
    }
  end

  def poll_attributes
    return if @options[:poll].blank?

    @options[:poll].merge(account: @account, voters_count: 0)
  end

  def scheduled_options
    @options.dup.tap do |options_hash|
      options_hash[:in_reply_to_id]  = options_hash.delete(:thread)&.id
      options_hash[:application_id]  = options_hash.delete(:application)&.id
      options_hash[:quoted_status_id] = options_hash.delete(:quoted_status)&.id
      options_hash[:scheduled_at]    = nil
      options_hash[:idempotency]     = nil
      options_hash[:with_rate_limit] = false
    end
  end
end
