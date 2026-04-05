# == Schema Information
#
# Table name: bookmark_folders
#
#  id         :bigint(8)        not null, primary key
#  name       :string           not null
#  position   :integer          default(0), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  account_id :bigint(8)        not null
#
class BookmarkFolder < ApplicationRecord
  belongs_to :account
  has_many :bookmark_folder_items, dependent: :destroy
  has_many :statuses, through: :bookmark_folder_items

  validates :name, presence: true, length: { maximum: 30 }
  validates :account_id, presence: true

  # 커스텀 정렬
  scope :ordered, -> { order(position: :asc, created_at: :desc) }
end
