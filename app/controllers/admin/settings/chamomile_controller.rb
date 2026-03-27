# frozen_string_literal: true

class Admin::Settings::ChamomileController < Admin::SettingsController
  private

  def settings_params
    # Form::AdminSettings::KEYS에 이미 chamomile_boards가 포함되어 있다면 중복 허용을 방지하기 위해 뺍니다.
    # 하지만 더 확실하게 하기 위해 아래처럼 구조를 명시합니다.
    params.require(:form_admin_settings).permit(
      *(Form::AdminSettings::KEYS - [:chamomile_boards]),
      chamomile_boards: [:name, :tag]
    )
  end

  def after_update_redirect_path
    admin_settings_chamomile_path
  end
end