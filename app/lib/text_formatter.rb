# frozen_string_literal: true

class TextFormatter
  include ActionView::Helpers::TextHelper
  include ERB::Util
  include RoutingHelper

  # [추가 1] 헤더와 구분선을 텍스트로 치환하는 커스텀 마크다운 렌더러
  class ChamomileMarkdownRenderer < Redcarpet::Render::HTML
    def header(text, header_level)
      "<p>#{'#' * header_level} #{text}</p>"
    end

    def hrule
      "<p>---</p>"
    end
  end

  # [추가 2] 툿 본문 전용 Sanitize 규칙 (안전한 마크다운 태그만 허용)
  CHAMOMILE_TOOT_CONFIG = Sanitize::Config.merge(Sanitize::Config::MASTODON_STRICT,
    elements: Sanitize::Config::MASTODON_STRICT[:elements] + %w(b i strong em del blockquote code pre ul ol li),
    attributes: Sanitize::Config::MASTODON_STRICT[:attributes].merge(
      'code' => ['class'],
      'pre'  => ['class']
    )
  ).freeze

  URL_PREFIX_REGEX = %r{\A(https?://(www\.)?|xmpp:)}

  DEFAULT_REL = %w(nofollow noopener).freeze

  DEFAULT_OPTIONS = {
    multiline: true,
  }.freeze

  attr_reader :text, :options

  def initialize(text, options = {})
    @text    = text
    @options = DEFAULT_OPTIONS.merge(options)
  end

  def entities
    @entities ||= Extractor.extract_entities_with_indices(text, extract_url_without_protocol: false)
  end

  def to_s
    return add_quote_fallback('').html_safe if text.blank? # rubocop:disable Rails/OutputSafety

    # 관리자 설정이 켜져있고, 단일 줄이 아닌 일반 툿(multiline)일 때만 마크다운 활성화
    markdown_enabled = Setting.chamomile_markdown_enabled && multiline?

    # 마크다운을 사용할 때는 Redcarpet 파서가 읽을 수 있도록 원시 텍스트(escape: false)를 넘깁니다.
    html = rewrite(escape: !markdown_enabled) do |entity|
      if entity[:url]
        link_to_url(entity)
      elsif entity[:hashtag]
        link_to_hashtag(entity)
      elsif entity[:screen_name]
        link_to_mention(entity)
      end
    end

    if markdown_enabled
      html.gsub!(/^(\s*)#/, '\1&#35;')
      html.gsub!(/^(\s*)-{3,}/, '\1&#45;--')
      html.gsub!(/^([ \t]*>.*)\r?\n([ \t]*[^>\r\n])/, "\\1\n\n\\2")
      html.gsub!(/^(?![ \t]*(?:[-*+]|\d+\.)\s+)(.+)\r?\n([ \t]*(?:[-*+]|\d+\.)\s+)/, "\\1\n\n\\2")
      html.gsub!(/^([ \t]*(?:[-*+]|\d+\.)\s+.*)\r?\n(?![ \t]*(?:[-*+]|\d+\.)\s+)(.+)/, "\\1\n\n\\2")

      renderer = ChamomileMarkdownRenderer.new(escape_html: false, hard_wrap: true)
      extensions = {
        autolink: false,
        fenced_code_blocks: true,
        strikethrough: true,
        no_intra_emphasis: true
      }
      
      html = Redcarpet::Markdown.new(renderer, extensions).render(html)
      
      # 렌더링된 결과를 커스텀 규칙으로 살균하여 XSS 방어
      html = Sanitize.fragment(html, CHAMOMILE_TOOT_CONFIG)
      html = html.delete("\n")
    elsif multiline?
      # 마크다운 비활성화 시 기존 마스토돈 파이프라인
      html = simple_format(html, {}, sanitize: false).delete("\n")
    end

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

      if suffix && suffix.length == 1
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

    def link_to_mention(account, with_domain: false)
      url = ActivityPub::TagManager.instance.url_for(account)
      display_username = with_domain ? account.pretty_acct : account.username

      <<~HTML.squish
        <span class="h-card" translate="no"><a href="#{h(url)}" class="u-url mention">@<span>#{h(display_username)}</span></a></span>
      HTML
    end
  end

  private

  # [수정] 마크다운 변환 시 HTML 이스케이프 여부를 제어할 수 있도록 옵션 추가
  def rewrite(escape: true)
    entities.sort_by! do |entity|
      entity[:indices].first
    end

    result = +''

    last_index = entities.reduce(0) do |index, entity|
      indices = entity[:indices]
      chunk = text[index...indices.first]
      result << (escape ? h(chunk) : chunk)
      result << yield(entity)
      indices.last
    end

    chunk = text[last_index..]
    result << (escape ? h(chunk) : chunk)

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

    TextFormatter.link_to_mention(account, with_domain: same_username_hits&.positive? || with_domains?)
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
