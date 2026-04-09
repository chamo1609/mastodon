# frozen_string_literal: true

class Api::V1::BookmarksController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:bookmarks' }
  before_action :require_user!
  after_action :insert_pagination_headers

  def index
    @statuses = load_statuses
    render json: @statuses, each_serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new(@statuses, current_user&.account_id)
  end

  private

  def load_statuses
    preloaded_bookmarks
  end

  def preloaded_bookmarks
    preload_collection(results.map(&:status), Status)
  end

  def results
    @results ||= account_bookmarks.joins(:status).eager_load(:status).to_a_paginated_by_id(
      limit_param(DEFAULT_STATUSES_LIMIT),
      params_slice(:max_id, :since_id, :min_id)
    )
  end

  # ==========================================
  # 변경된 부분 1: 요청에 따라 조회하는 테이블을 분기 처리합니다.
  # ==========================================
  def account_bookmarks
    if params[:folder_id].present?
      # 해당 폴더에 속한 status_id 목록을 서브쿼리로 추출한 뒤, 기존 bookmarks 테이블에서 필터링합니다.
      # 이렇게 하면 Bookmark 모델이 유지되므로 페이징(to_a_paginated_by_id) 메서드가 정상 작동합니다.
      current_account.bookmarks.where(status_id: BookmarkFolderItem.where(bookmark_folder_id: params[:folder_id]).select(:status_id))
    else
      # 파라미터가 없으면 기존처럼 전체 북마크 반환
      current_account.bookmarks
    end
  end

  def next_path
    api_v1_bookmarks_url pagination_params(max_id: pagination_max_id) if records_continue?
  end

  def prev_path
    api_v1_bookmarks_url pagination_params(min_id: pagination_since_id) unless results.empty?
  end

  def pagination_collection
    results
  end

  def records_continue?
    results.size == limit_param(DEFAULT_STATUSES_LIMIT)
  end

  # ==========================================
  # 변경된 부분 2: 무한 스크롤(페이징) 처리 시 파라미터 유지
  # ==========================================
  def pagination_params(core_params)
    # 스크롤을 내려 다음 페이지를 불러올 때, 현재 보고 있는 폴더 ID를 잃어버리지 않도록 헤더에 포함합니다.
    params.slice(:limit, :folder_id).permit(:limit, :folder_id).merge(core_params)
  end
end