class Api::V1::Statuses::BookmarkFoldersController < Api::BaseController
  before_action :require_user!
  before_action :set_status

  def create
    folder = current_account.bookmark_folders.find(params[:folder_id])

    # 1. 만약 해당 게시물이 기본 북마크에 없는 상태라면 자동으로 추가
    current_account.bookmarks.find_or_create_by!(status: @status)

    # 2. 선택한 폴더에 게시물 매핑 (중복 삽입 방지)
    BookmarkFolderItem.find_or_create_by!(
      bookmark_folder: folder,
      status: @status
    )

    # 툿의 최신 상태를 반환
    render json: @status, serializer: REST::StatusSerializer
  end

  private

  def set_status
    @status = Status.find(params[:status_id])
  end
end