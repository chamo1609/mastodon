# frozen_string_literal: true

# chamomile_mealkit.yml 파일을 읽어 CHAMOMILE_MEALKIT 상수에 저장합니다.
mealkit_config_path = Rails.root.join('config', 'chamomile_mealkit.yml')

if File.exist?(mealkit_config_path)
  CHAMOMILE_MEALKIT = YAML.safe_load(File.read(mealkit_config_path), symbolize_names: true) || {}
else
  # 파일이 없을 경우를 대비한 기본값 설정입니다.
  CHAMOMILE_MEALKIT = {
    elasticsearch_enabled: false
  }.freeze
end
