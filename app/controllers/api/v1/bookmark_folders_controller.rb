class Api::V1::BookmarkFoldersController < Api::BaseController
  before_action :require_user!
  before_action :set_bookmark_folder, only: [:destroy]

  def index
    # 프론트엔드에서 화살표를 누를 때마다 offset을 조정하여 10개씩 페이징 처리
    limit = (params[:limit] || 10).to_i
    offset = (params[:offset] || 0).to_i

    @bookmark_folders = current_account.bookmark_folders.ordered.limit(limit).offset(offset)

    render json: @bookmark_folders, each_serializer: REST::BookmarkFolderSerializer
  end

  def create
    @bookmark_folder = current_account.bookmark_folders.create!(bookmark_folder_params)
    render json: @bookmark_folder, serializer: REST::BookmarkFolderSerializer
  end

  def destroy
    @bookmark_folder.destroy!
    render_empty
  end

  private

  def set_bookmark_folder
    @bookmark_folder = current_account.bookmark_folders.find(params[:id])
  end

  def bookmark_folder_params
    params.permit(:name)
  end
end