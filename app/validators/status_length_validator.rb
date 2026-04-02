# frozen_string_literal: true

class StatusLengthValidator < ActiveModel::Validator
  MAX_CHARS = 500
  URL_PLACEHOLDER_CHARS = 23
  URL_PLACEHOLDER = 'x' * 23

  def validate(status)
    return unless status.local? && !status.reblog?

    # 관리자 설정값을 안전하게 정수(Integer)로 변환합니다.
    base_limit = (Setting.status_length_limit || MAX_CHARS).to_i
    effective_limit = base_limit + 100

    # too_long? 메서드에 status와 effective_limit 두 개의 인자를 전달합니다.
    if too_long?(status, effective_limit)
      # 글자 수를 초과했을 경우 사용자에게 보여줄 에러 메시지를 추가합니다.
      status.errors.add(:text, I18n.t('statuses.over_character_limit', max: base_limit))
    end
  end

  private

  # 이제 (status, limit) 두 개의 인자를 정상적으로 받습니다.
  def too_long?(status, limit)
    # 고정된 MAX_CHARS가 아닌 전달받은 limit(effective_limit) 값과 비교합니다.
    countable_length(combined_text(status)) > limit
  end

  def countable_length(str)
    str.each_grapheme_cluster.size
  end

  def combined_text(status)
    [status.spoiler_text, countable_text(status.text)].join
  end

  def countable_text(str)
    return '' if str.blank?

    # To ensure that we only give length concessions to entities that
    # will be correctly parsed during formatting, we go through full
    # entity extraction

    entities = Extractor.remove_overlapping_entities(Extractor.extract_urls_with_indices(str, extract_url_without_protocol: false) + Extractor.extract_mentions_or_lists_with_indices(str))

    rewrite_entities(str, entities) do |entity|
      if entity[:url]
        URL_PLACEHOLDER
      elsif entity[:screen_name]
        "@#{entity[:screen_name].split('@').first}"
      end
    end
  end

  def rewrite_entities(str, entities)
    entities.sort_by! { |entity| entity[:indices].first }
    result = +''

    last_index = entities.reduce(0) do |index, entity|
      result << str[index...entity[:indices].first]
      result << yield(entity)
      entity[:indices].last
    end

    result << str[last_index..]
    result
  end
end