# frozen_string_literal: true

# == Schema Information
#
# Table name: bookmarks
#
#  id         :bigint(8)        not null, primary key
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint(8)        not null
#  status_id  :bigint(8)        not null
#

class Bookmark < ApplicationRecord
  include Paginable

  update_index('statuses', :status) if Chewy.enabled?

  belongs_to :account, inverse_of: :bookmarks
  belongs_to :status,  inverse_of: :bookmarks

  validates :status_id, uniqueness: { scope: :account_id }

  before_validation do
    self.status = status.reblog if status&.reblog?
  end

  after_destroy :invalidate_cleanup_info
  after_destroy :remove_from_folders

  def invalidate_cleanup_info
    return unless status&.account_id == account_id && account.local?

    account.statuses_cleanup_policy&.invalidate_last_inspected(status, :unbookmark)
  end

  private

  def remove_from_folders
    # 해당 사용자의 폴더들 중에서 이 status_id를 가진 아이템들을 찾아 일괄 삭제
    folder_ids = account.bookmark_folders.pluck(:id)
    BookmarkFolderItem.where(bookmark_folder_id: folder_ids, status_id: status_id).destroy_all
  end
end
