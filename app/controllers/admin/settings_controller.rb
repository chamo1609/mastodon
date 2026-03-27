# frozen_string_literal: true

module Admin
  class SettingsController < BaseController
    def show
      authorize :settings, :show?

      @admin_settings = Form::AdminSettings.new
    end

    def update
      authorize :settings, :update?

      @admin_settings = Form::AdminSettings.new(settings_params)

      if @admin_settings.save
        redirect_to after_update_redirect_path, notice: t('generic.changes_saved_msg')
      else
        render :show
      end
    end

    private

    def after_update_redirect_path
      raise NotImplementedError
    end

    def settings_params
      safe_keys = Form::AdminSettings::KEYS - [:chamomile_boards]
      params.expect(form_admin_settings: [
        *safe_keys,
        { chamomile_boards: [:name, :tag] }
      ])
    end
  end
end
