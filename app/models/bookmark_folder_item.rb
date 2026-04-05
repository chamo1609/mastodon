# == Schema Information
#
# Table name: bookmark_folder_items
#
#  id                 :bigint(8)        not null, primary key
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  bookmark_folder_id :bigint(8)        not null
#  status_id          :bigint(8)        not null
#
class BookmarkFolderItem < ApplicationRecord
  belongs_to :bookmark_folder
  belongs_to :status

  validates :bookmark_folder_id, presence: true
  validates :status_id, presence: true
  validates :bookmark_folder_id, uniqueness: { scope: :status_id }
end
