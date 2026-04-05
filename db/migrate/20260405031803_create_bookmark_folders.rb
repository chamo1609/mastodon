class CreateBookmarkFolders < ActiveRecord::Migration[8.1]
  def change
    create_table :bookmark_folders do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }, index: true
      t.string :name, null: false
      t.integer :position, null: false, default: 0

      t.timestamps
    end

    create_table :bookmark_folder_items do |t|
      t.references :bookmark_folder, null: false, foreign_key: { on_delete: :cascade }, index: true
      t.references :status, null: false, foreign_key: { on_delete: :cascade }, index: true

      t.timestamps
    end

    add_index :bookmark_folder_items, [:bookmark_folder_id, :status_id], unique: true, name: 'idx_unique_bookmark_folder_items'
  end
end