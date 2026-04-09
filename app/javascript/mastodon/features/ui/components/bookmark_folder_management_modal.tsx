import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { closeModal, openModal } from 'mastodon/actions/modal';
import { fetchBookmarkFolders, updateBookmarkFolder, createBookmarkFolder } from 'mastodon/actions/bookmark_folders'; // createBookmarkFolder 추가
import { useAppDispatch, useAppSelector } from 'mastodon/store';

import MenuIcon from '@/material-icons/400-24px/menu.svg?react';
import EditIcon from '@/material-icons/400-24px/edit.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import CheckIcon from '@/material-icons/400-24px/check.svg?react';
import AddIcon from '@/material-icons/400-24px/add.svg?react'; // Add 아이콘 추가

export const BookmarkFolderManagementModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const folders = useAppSelector((state: any) => state.bookmark_folders?.get('items'));
  const isLoading = useAppSelector((state: any) => state.bookmark_folders?.get('isLoading'));

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>(''); // 새 폴더 이름 상태 추가

  useEffect(() => {
    dispatch(fetchBookmarkFolders() as any);
  }, [dispatch]);

  const handleClose = useCallback(() => {
    dispatch(closeModal({ modalType: undefined, ignoreFocus: false }));
  }, [dispatch]);

  const handleDeleteClick = useCallback((folderId: number) => {
    dispatch(
      openModal({
        modalType: 'CONFIRM_DELETE_BOOKMARK_FOLDER',
        modalProps: { folderId },
      })
    );
  }, [dispatch]);

  const handleEditStart = useCallback((folder: any) => {
    setEditingId(folder.get('id'));
    setEditName(folder.get('name'));
  }, []);

  const handleEditSave = useCallback((folderId: number) => {
    if (editName.trim().length > 0) {
      dispatch(updateBookmarkFolder(folderId, editName.trim()) as any);
    }
    setEditingId(null);
  }, [dispatch, editName]);

  // 새 폴더 생성 핸들러 추가
  const handleCreateFolder = useCallback((e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && (e as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    
    if (newFolderName.trim().length > 0) {
      dispatch(createBookmarkFolder(newFolderName.trim()) as any);
      setNewFolderName(''); // 생성 후 입력창 초기화
    }
  }, [dispatch, newFolderName]);

  return (
    <div className='modal-root__modal safety-action-modal' aria-live='polite'>
      <div className='safety-action-modal__top'>
        <div className='safety-action-modal__header'>
          <div>
            <h1>북마크 폴더 관리</h1>
            <div>새 폴더를 만들거나 기존 폴더의 이름을 변경, 삭제할 수 있습니다.</div>
          </div>
        </div>

        <div style={{ padding: '15px 24px 0 24px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="새 폴더 이름 입력..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleCreateFolder}
              style={{ 
                flex: 1, 
                padding: '10px 12px', 
                background: 'var(--color-bg-primary)', 
                border: '1px solid var(--color-border-primary)', 
                borderRadius: '4px', 
                color: 'var(--text-color)' 
              }}
            />
            <button 
              type="button"
              onClick={handleCreateFolder}
              disabled={newFolderName.trim().length === 0}
              style={{ 
                padding: '0 16px', 
                background: newFolderName.trim().length > 0 ? 'var(--color-text-brand)' : 'var(--color-bg-secondary)', 
                color: newFolderName.trim().length > 0 ? '#fff' : 'var(--color-text-secondary)', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: newFolderName.trim().length > 0 ? 'pointer' : 'default', 
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
            >
              <AddIcon style={{ width: '18px', height: '18px', fill: 'currentColor' }} />
              추가
            </button>
          </div>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0 24px 15px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {folders && folders.map((folder: any) => {
            const folderId = folder.get('id');
            const isEditing = editingId === folderId;

            return (
              <div
                key={folderId}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: '4px',
                  background: 'var(--color-bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                {/* 1. 드래그 앤 드롭 핸들 (Menu) */}
                <div style={{ cursor: 'grab', color: 'var(--darker-text-color)', display: 'flex', alignItems: 'center' }}>
                  <MenuIcon style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
                </div>

                {/* 2. 폴더 이름 또는 수정 인풋 */}
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(folderId); }}
                      style={{ width: '100%', padding: '4px 8px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--text-color)', borderRadius: '4px' }}
                      autoFocus
                    />
                  ) : (
                    <strong>{folder.get('name')}</strong>
                  )}
                </div>

                {/* 3. 액션 버튼 영역 (Edit / Delete / Save) */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isEditing ? (
                    <button type="button" onClick={() => handleEditSave(folderId)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-brand)' }}>
                      <CheckIcon style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleEditStart(folder)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--darker-text-color)' }}>
                      <EditIcon style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
                    </button>
                  )}
                  
                  <button type="button" onClick={() => handleDeleteClick(folderId)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger, #df405a)' }}>
                    <CloseIcon style={{ width: '20px', height: '20px', fill: 'currentColor' }} />
                  </button>
                </div>
              </div>
            );
          })}
          
          {(!folders || folders.size === 0) && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              아직 만들어진 북마크 폴더가 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className='safety-action-modal__bottom'>
        <div className='safety-action-modal__actions'>
          <button onClick={handleClose} className='button button--tertiary' type='button' style={{ width: '100%' }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};