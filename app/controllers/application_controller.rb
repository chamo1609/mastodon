# frozen_string_literal: true

class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  include Localized
  include UserTrackingConcern
  include SessionTrackingConcern
  include CacheConcern
  include ErrorResponses
  include PreloadingConcern
  include DomainControlHelper
  include DatabaseHelper
  include AuthorizedFetchHelper
  include SelfDestructHelper

  helper_method :current_account
  helper_method :current_session
  helper_method :single_user_mode?
  helper_method :use_seamless_external_login?
  helper_method :sso_account_settings
  helper_method :limited_federation_mode?
  helper_method :skip_csrf_meta_tags?

  before_action :check_self_destruct!

  before_action :store_referrer, except: :raise_not_found, if: :devise_controller?
  before_action :require_functional!, if: :user_signed_in?

  before_action :set_cache_control_defaults

  skip_before_action :verify_authenticity_token, only: :raise_not_found

  before_action :require_chamomile_authentication!    # 카모마일 에디션: 비로그인 전면 차단

  def raise_not_found
    raise ActionController::RoutingError, "No route matches #{params[:unmatched_route]}"
  end

  private

  # --- 카모마일 에디션: 접근 제어 커스텀 로직 ---
  def require_chamomile_authentication!
    return if user_signed_in? || devise_controller?

    # 1. 정적 에셋 및 PWA 필수 파일
    public_assets = [
      '/assets/', '/packs/', '/sw.js', '/manifest.webmanifest', 
      '/browserconfig.xml', '/mask-icon.svg', '/favicon.ico'
    ]
    return if public_assets.any? { |path| request.path.start_with?(path) }

    # 2. 비로그인 사용자에게 허용된 웹 페이지 경로 (explore 제외)
    allowed_web_paths = ['/about', '/terms', '/privacy-policy']
    return if allowed_web_paths.any? { |path| request.path == path || request.path.start_with?("#{path}/") }

    # 3. 프론트엔드 앱 구동 및 회원가입, 모바일 앱 등록에 필수적인 API 리스트
    allowed_api_paths = [
      '/api/v1/instance',
      '/api/v2/instance',
      '/api/v1/accounts/lookup', 
      '/api/v1/announcements',
      '/api/v1/custom_emojis',
      '/api/v1/preferences',
      '/api/v1/apps'             # 모바일 앱이 최초 접속 시 스스로를 등록하기 위해 필수
    ]
    return if allowed_api_paths.any? { |path| request.path.start_with?(path) }

    # 4. 미디어 및 시스템 파일 접근 제어
    if request.path.start_with?('/system/')
      allowed_system_paths = [
        '/system/site_uploads/', 
        '/system/accounts/avatars/', 
        '/system/accounts/headers/'
      ]
      return if allowed_system_paths.any? { |path| request.path.start_with?(path) }
    end

    # 5. 모바일 앱 로그인 및 서버 정보 확인을 위한 Well-Known 경로
    well_known_paths = ['/.well-known/webfinger', '/.well-known/nodeinfo', '/.well-known/host-meta']
    return if well_known_paths.any? { |path| request.path.start_with?(path) }

    # 6. OAuth 인증 경로 (모바일 앱 로그인 지원)
    # 외부 앱 인증을 담당하는 Doorkeeper 컨트롤러에 대한 접근을 허용합니다.
    oauth_paths = ['/oauth/']
    return if oauth_paths.any? { |path| request.path.start_with?(path) }

    # 7. 위 조건에 맞지 않는 모든 요청은 차단 (타 서버와의 연합 통신 포함)
    if request.format.json? || request.xhr?
      render json: { error: 'Authentication required for Chamomile Edition' }, status: :unauthorized
      return
    end

    # 일반 웹 브라우저 접근 시 /about으로 강제 리다이렉트
    redirect_to '/about'
  end

  def public_fetch_mode?
    !authorized_fetch_mode?
  end

  def store_referrer
    return if request.referer.blank?

    redirect_uri = URI(request.referer)
    return if redirect_uri.path.start_with?('/auth', '/settings/two_factor_authentication', '/settings/otp_authentication')

    stored_url = redirect_uri.to_s if redirect_uri.host == request.host && redirect_uri.port == request.port

    store_location_for(:user, stored_url)
  end

  def mfa_setup_path(path_params = {})
    settings_two_factor_authentication_methods_path(path_params)
  end

  def require_functional!
    return if current_user.functional?

    respond_to do |format|
      format.any do
        if current_user.missing_2fa?
          redirect_to mfa_setup_path
        elsif current_user.confirmed?
          redirect_to edit_user_registration_path
        else
          redirect_to auth_setup_path
        end
      end

      format.json do
        if !current_user.confirmed?
          render json: { error: 'Your login is missing a confirmed e-mail address' }, status: 403
        elsif !current_user.approved?
          render json: { error: 'Your login is currently pending approval' }, status: 403
        elsif current_user.missing_2fa?
          render json: { error: 'Your account requires two-factor authentication' }, status: 403
        elsif !current_user.functional?
          render json: { error: 'Your login is currently disabled' }, status: 403
        end
      end
    end
  end

  def skip_csrf_meta_tags?
    false
  end

  def after_sign_out_path_for(_resource_or_scope)
    if ENV['OMNIAUTH_ONLY'] == 'true' && Rails.configuration.x.omniauth.oidc_enabled?
      '/auth/auth/openid_connect/logout'
    else
      new_user_session_path
    end
  end

  protected

  def truthy_param?(key)
    ActiveModel::Type::Boolean.new.cast(params[key])
  end

  def single_user_mode?
    @single_user_mode ||= Rails.configuration.x.single_user_mode && Account.without_internal.exists?
  end

  def use_seamless_external_login?
    Devise.pam_authentication || Devise.ldap_authentication
  end

  def sso_account_settings
    ENV.fetch('SSO_ACCOUNT_SETTINGS', nil)
  end

  def current_account
    return @current_account if defined?(@current_account)

    @current_account = current_user&.account
  end

  def current_session
    return @current_session if defined?(@current_session)

    @current_session = SessionActivation.find_by(session_id: cookies.signed['_session_id']) if cookies.signed['_session_id'].present?
  end

  def check_self_destruct!
    return unless self_destruct?

    respond_to do |format|
      format.any  { render 'errors/self_destruct', layout: 'auth', status: 410, formats: [:html] }
      format.json { render json: { error: Rack::Utils::HTTP_STATUS_CODES[410] }, status: 410 }
    end
  end

  def set_cache_control_defaults
    response.cache_control.replace(private: true, no_store: true)
  end
end
