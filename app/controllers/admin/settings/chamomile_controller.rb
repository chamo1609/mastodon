# frozen_string_literal: true

class Admin::Settings::ChamomileController < Admin::SettingsController
  private

  def after_update_redirect_path
    admin_settings_chamomile_path
  end
end