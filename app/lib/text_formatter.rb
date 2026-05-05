# frozen_string_literal: true

require 'commonmarker'

class TextFormatter
  include ActionView::Helpers::TextHelper
  include ERB::Util
  include RoutingHelper

  URL_PREFIX_REGEX = %r{\A(https?://(www\.)?|xmpp:)}

  DEFAULT_REL = %w(nofollow noopener).freeze

  DEFAULT_OPTIONS = {
    multiline: true,
  }.freeze  

  attr_reader :text, :options

  # @param [String] text
  # @param [Hash] options
  # @option options [Boolean] :multiline
  # @option options [Boolean] :with_domains
  # @option options [Boolean] :with_rel_me
  # @option options [Array<Account>] :preloaded_accounts
  def initialize(text, options = {})
    @text    = text
    @options = DEFAULT_OPTIONS.merge(options)
  end

  def entities
    @entities ||= Extractor.extract_entities_with_indices(text, extract_url_without_protocol: false)
  end

  # def to_s
  #   return add_quote_fallback('').html_safe if text.blank? # rubocop:disable Rails/OutputSafety

  #   html = rewrite do |entity|
  #     if entity[:url]
  #       link_to_url(entity)
  #     elsif entity[:hashtag]
  #       link_to_hashtag(entity)
  #     elsif entity[:screen_name]
  #       link_to_mention(entity)
  #     end
  #   end

  #   html = simple_format(html, {}, sanitize: false).delete("\n") if multiline?
  #   html = add_quote_fallback(html) if options[:quoted_status].present?

  #   html.html_safe # rubocop:disable Rails/OutputSafety
  # end

  def to_s
    return add_quote_fallback('').html_safe if text.blank? # rubocop:disable Rails/OutputSafety

    html = rewrite do |entity|
      if entity[:url]
        link_to_url(entity)
      elsif entity[:hashtag]
        link_to_hashtag(entity)
      elsif entity[:screen_name]
        link_to_mention(entity)
      end
    end

    # --- 카모마일 에디션: 관리자 설정에 따른 마크다운 처리 ---
    if Setting.chamomile_markdown_enabled
      require 'cgi'
      html = CGI.unescapeHTML(html)

      # [추가됨] 1. 마크다운 코드 블록(```) 영역 추출 및 보호
      md_code_blocks = []
      html.gsub!(/^[ \t]*```.*?^[ \t]*```/m) do |match|
        md_code_blocks << match
        "___MD_CODE_BLOCK_#{md_code_blocks.size - 1}___"
      end

      # 2. ATX 헤더(#) 문법 무력화
      html.gsub!(/^([#]{1,6})\s+/) { |match| "\\#{match}" }

      # 3. Setext 헤더 및 수평선(=, -) 문법 무력화
      html.gsub!(/^([ \t]*)([=-]+)\s*$/) { "#{$1}\\#{$2}" }

      # [추가됨] 4. 보호했던 마크다운 코드 블록 복원
      md_code_blocks.each_with_index do |block, index|
        html.gsub!("___MD_CODE_BLOCK_#{index}___") { block }
      end

      # 5. 마크다운 파싱 및 HTML 변환
      html = Commonmarker.to_html(html, options: {
        render: { unsafe: true, hardbreaks: true },
        extension: { strikethrough: true, tagfilter: true, autolink: false }
      })
      
      # 6. HTML <pre> 블록 보호 및 개행 제거 (기존 로직)
      pre_blocks = []
      
      html.gsub!(/<pre.*?>.*?<\/pre>/m) do |match|
        pre_blocks << match
        "___PRE_BLOCK_#{pre_blocks.size - 1}___"
      end

      html.gsub!(/[\r\n]+/, '')

      pre_blocks.each_with_index do |block, index|
        html.gsub!("___PRE_BLOCK_#{index}___") { block }
      end
    else
      # 마크다운이 꺼져 있을 때의 기본 로직
      html = simple_format(html, {}, sanitize: false).delete("\n") if multiline?
    end
    # ------------------------------------------------

    html = add_quote_fallback(html) if options[:quoted_status].present?

    html.html_safe # rubocop:disable Rails/OutputSafety
  end

  class << self
    include ERB::Util
    include ActionView::Helpers::TagHelper

    def shortened_link(url, rel_me: false)
      url = Addressable::URI.parse(url).to_s
      rel = rel_me ? (DEFAULT_REL + %w(me)) : DEFAULT_REL

      prefix      = url.match(URL_PREFIX_REGEX).to_s
      display_url = url[prefix.length, 30]
      suffix      = url[(prefix.length + 30)..]
      cutoff      = url[prefix.length..].length > 30

      if suffix && suffix.length == 1 # revert truncation to account for ellipsis
        display_url += suffix
        suffix = nil
        cutoff = false
      end

      tag.a href: url, target: '_blank', rel: rel.join(' '), translate: 'no' do
        tag.span(prefix, class: 'invisible') +
          tag.span(display_url, class: (cutoff ? 'ellipsis' : '')) +
          tag.span(suffix, class: 'invisible')
      end
    rescue Addressable::URI::InvalidURIError, IDN::Idna::IdnaError
      h(url)
    end
  end

  private

  def rewrite
    entities.sort_by! do |entity|
      entity[:indices].first
    end

    result = +''

    last_index = entities.reduce(0) do |index, entity|
      indices = entity[:indices]
      result << h(text[index...indices.first])
      result << yield(entity)
      indices.last
    end

    result << h(text[last_index..])

    result
  end

  def link_to_url(entity)
    TextFormatter.shortened_link(entity[:url], rel_me: with_rel_me?)
  end

  def link_to_hashtag(entity)
    hashtag = entity[:hashtag]
    url     = tag_url(hashtag)

    <<~HTML.squish
      <a href="#{h(url)}" class="mention hashtag" rel="tag">#<span>#{h(hashtag)}</span></a>
    HTML
  end

  def link_to_mention(entity)
    username, domain = entity[:screen_name].split('@')
    domain           = nil if local_domain?(domain)
    account          = nil

    if preloaded_accounts?
      same_username_hits = 0

      preloaded_accounts.each do |other_account|
        same_username = other_account.username.casecmp(username).zero?
        same_domain   = other_account.domain.nil? ? domain.nil? : other_account.domain.casecmp(domain)&.zero?

        if same_username && !same_domain
          same_username_hits += 1
        elsif same_username && same_domain
          account = other_account
        end
      end
    else
      account = entity_cache.mention(username, domain)
    end

    return "@#{h(entity[:screen_name])}" if account.nil?

    url = ActivityPub::TagManager.instance.url_for(account)
    display_username = same_username_hits&.positive? || with_domains? ? account.pretty_acct : account.username

    <<~HTML.squish
      <span class="h-card" translate="no"><a href="#{h(url)}" class="u-url mention">@<span>#{h(display_username)}</span></a></span>
    HTML
  end

  def entity_cache
    @entity_cache ||= EntityCache.instance
  end

  def tag_manager
    @tag_manager ||= TagManager.instance
  end

  delegate :local_domain?, to: :tag_manager

  def multiline?
    options[:multiline]
  end

  def with_domains?
    options[:with_domains]
  end

  def with_rel_me?
    options[:with_rel_me]
  end

  def preloaded_accounts
    options[:preloaded_accounts]
  end

  def preloaded_accounts?
    preloaded_accounts.present?
  end

  def add_quote_fallback(html)
    return html if options[:quoted_status].nil?

    url = ActivityPub::TagManager.instance.url_for(options[:quoted_status]) || ActivityPub::TagManager.instance.uri_for(options[:quoted_status])
    return html if url.blank? || html.include?(url)

    <<~HTML.squish
      <p class="quote-inline">RE: #{TextFormatter.shortened_link(url)}</p>#{html}
    HTML
  end
end
