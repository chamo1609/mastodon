class REST::BookmarkFolderSerializer < ActiveModel::Serializer
  attributes :id, :name, :position
end