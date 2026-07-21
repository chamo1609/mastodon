# frozen_string_literal: true

class Admin::Settings::ChamomileController < Admin::SettingsController
  def update
    # 1. 커스텀 테마 색상 저장 (라이트 모드)
    Setting.chamomile_brand_light         = params[:chamomile_brand_light]         if params.key?(:chamomile_brand_light)
    Setting.chamomile_text_on_brand_light = params[:chamomile_text_on_brand_light] if params.key?(:chamomile_text_on_brand_light)
    Setting.chamomile_bg_light            = params[:chamomile_bg_light]            if params.key?(:chamomile_bg_light)
    Setting.chamomile_panel_light         = params[:chamomile_panel_light]         if params.key?(:chamomile_panel_light)
    Setting.chamomile_text_light          = params[:chamomile_text_light]          if params.key?(:chamomile_text_light)

    # 2. 커스텀 테마 색상 저장 (다크 모드)
    Setting.chamomile_brand_dark          = params[:chamomile_brand_dark]          if params.key?(:chamomile_brand_dark)
    Setting.chamomile_text_on_brand_dark  = params[:chamomile_text_on_brand_dark]  if params.key?(:chamomile_text_on_brand_dark)
    Setting.chamomile_bg_dark             = params[:chamomile_bg_dark]             if params.key?(:chamomile_bg_dark)
    Setting.chamomile_panel_dark          = params[:chamomile_panel_dark]          if params.key?(:chamomile_panel_dark)
    Setting.chamomile_text_dark           = params[:chamomile_text_dark]           if params.key?(:chamomile_text_dark)

    # 3. 라이트 모드 이미지 업로드 처리
    if params[:custom_logo_light]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_logo_light')
      upload.update(file: params[:custom_logo_light])
    end
    if params[:custom_icon_light]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_icon_light')
      upload.update(file: params[:custom_icon_light])
    end
    if params[:custom_background_light]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_background_light')
      upload.update(file: params[:custom_background_light])
    end

    # 4. 다크 모드 이미지 업로드 처리
    if params[:custom_logo_dark]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_logo_dark')
      upload.update(file: params[:custom_logo_dark])
    end
    if params[:custom_icon_dark]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_icon_dark')
      upload.update(file: params[:custom_icon_dark])
    end
    if params[:custom_background_dark]
      upload = SiteUpload.find_or_initialize_by(var: 'custom_background_dark')
      upload.update(file: params[:custom_background_dark])
    end

    super
  end

  private

  def settings_params
    params.require(:form_admin_settings).permit(
      *(Form::AdminSettings::KEYS - [:chamomile_boards]),
      chamomile_boards: [:name, :tag]
    )
  end

  def after_update_redirect_path
    admin_settings_chamomile_path
  end
end