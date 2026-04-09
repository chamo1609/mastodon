class Api::V1::BookmarkFoldersController < Api::BaseController
  before_action :require_user!
  before_action :set_bookmark_folder, only: [:update, :destroy] # :update를 추가했습니다.

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

  # ==========================================
  # 폴더 이름 수정 (신규 추가)
  # ==========================================
  def update
    @bookmark_folder.update!(bookmark_folder_params)
    render json: @bookmark_folder, serializer: REST::BookmarkFolderSerializer
  end

  def destroy
    # 폴더가 삭제될 때 연결된 툿(BookmarkFolderItem) 매핑 데이터가 고아(Orphan) 상태로 
    # 데이터베이스에 남는 것을 방지하기 위해 먼저 지워줍니다. 
    # (만약 모델 파일에 dependent: :destroy를 이미 설정해 두셨다면 이 줄은 생략해도 됩니다)
    BookmarkFolderItem.where(bookmark_folder: @bookmark_folder).destroy_all
    
    @bookmark_folder.destroy!
    render_empty
  end

  # ==========================================
  # 폴더 순서 일괄 변경 (신규 추가)
  # ==========================================
  def reorder
    folder_ids = params[:folder_ids] || []

    # 트랜잭션(Transaction)으로 묶어서, 중간에 에러가 나면 전체 순서 변경을 취소하여 데이터 꼬임을 방지합니다.
    ActiveRecord::Base.transaction do
      folder_ids.each_with_index do |id, index|
        # 콜백(Callback)을 타지 않고 빠르고 조용하게 숫자만 바꿉니다.
        current_account.bookmark_folders.where(id: id).update_all(position: index)
      end
    end

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