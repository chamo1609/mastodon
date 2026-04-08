import { useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { List } from 'immutable';

import { closeModal } from 'mastodon/actions/modal';
// 주의: removeStatusFromFolder 액션이 아직 없다면 Redux action 파일에 추가 구현이 필요합니다.
import { fetchBookmarkFolders, createBookmarkFolder, addStatusToFolder, removeStatusFromFolder } from 'mastodon/actions/bookmark_folders';
import { Button } from 'mastodon/components/button';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

import CheckIcon from '@/material-icons/400-24px/check.svg?react';

export const BookmarkFolderModal: React.FC<{
  statusId: string;
}> = ({ statusId }) => {
  const dispatch = useAppDispatch();
  const [newFolderName, setNewFolderName] = useState('');
  
  // 모달 내에서 임시로 선택 상태를 관리하기 위한 로컬 상태
  const [selectedFolders, setSelectedFolders] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  const folders = useAppSelector((state: any) => state.bookmark_folders.get('items'));
  const isLoading = useAppSelector((state: any) => state.bookmark_folders.get('isLoading'));

  const status = useAppSelector((state: any) => state.statuses.get(statusId));
  const addedFolderIds = status?.get('bookmark_folder_ids') || List();

  // 초기 렌더링 시 기존에 포함된 폴더 ID 목록을 로컬 상태로 복사
  useEffect(() => {
    if (!isInitialized && addedFolderIds) {
      setSelectedFolders(new Set(addedFolderIds.toArray()));
      setIsInitialized(true);
    }
  }, [addedFolderIds, isInitialized]);

  useEffect(() => {
    dispatch(fetchBookmarkFolders());
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    dispatch(closeModal({ modalType: undefined, ignoreFocus: false }));
  }, [dispatch]);

  const handleCreateFolder = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim().length > 0) {
      dispatch(createBookmarkFolder(newFolderName.trim()));
      setNewFolderName('');
    }
  }, [dispatch, newFolderName]);

  // 클릭 시 모달을 닫거나 서버에 즉시 전송하지 않고 로컬 상태만 토글(Toggle)
  const handleToggleFolder = useCallback((folderId: number) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId); // 이미 선택된 경우 해제
      } else {
        next.add(folderId);    // 선택되지 않은 경우 추가
      }
      return next;
    });
  }, []);

  // 확인 버튼 클릭 시 변경사항을 일괄 처리
  // 확인 버튼 클릭 시 변경사항을 일괄 처리
  const handleSave = useCallback(() => {
    // 배열 내부의 값들이 number 타입임을 TypeScript에 명시적으로 선언합니다.
    const original = new Set<number>(addedFolderIds.toArray() as number[]);

    // 새로 추가된 폴더 처리
    selectedFolders.forEach((id) => {
      if (!original.has(id)) {
        dispatch(addStatusToFolder(statusId, id));
      }
    });

    // 기존에서 해제된 폴더 처리
    original.forEach((id) => {
      if (!selectedFolders.has(id)) {
        dispatch(removeStatusFromFolder(statusId, id));
      }
    });

    dispatch(closeModal({ modalType: undefined, ignoreFocus: false }));
  }, [dispatch, addedFolderIds, selectedFolders, statusId]);
  
  return (
    <div className='modal-root__modal safety-action-modal' aria-live='polite'>
      <div className='safety-action-modal__top'>
        <div className='safety-action-modal__header'>
          <div>
            <h1>북마크 폴더 선택</h1>
            <div>이 게시물을 저장할 폴더를 선택하거나 새 폴더를 만드세요. 다중 선택이 가능합니다.</div>
          </div>
        </div>

        <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '15px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {folders && folders.map((folder: any) => {
            const folderId = folder.get('id');
            // 로컬 상태(selectedFolders)를 기준으로 체크 표시 렌더링
            const isAdded = selectedFolders.has(folderId);

            return (
              <div
                key={folderId}
                onClick={() => handleToggleFolder(folderId)}
                role='button'
                tabIndex={0}
                style={{
                  cursor: 'pointer',
                  padding: '14px 16px',
                  border: '1px solid var(--color-border-primary)',
                  borderRadius: '4px',
                  background: 'var(--color-bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'filter 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
              >
                <strong>{folder.get('name')}</strong>
                
                {isAdded && (
                  <CheckIcon 
                    style={{ 
                      color: 'var(--color-text-brand)', 
                      fill: 'currentColor', 
                      width: '20px', 
                      height: '20px' 
                    }} 
                  />
                )}
              </div>
            );
          })}
          {(!folders || folders.size === 0) && !isLoading && (
             <div style={{ padding: '20px', color: 'var(--darker-text-color)', textAlign: 'center' }}>
               생성된 폴더가 없습니다.
             </div>
          )}
        </div>

        <form onSubmit={handleCreateFolder} style={{ padding: '20px 24px', display: 'flex', gap: '10px', background: 'var(--color1)' }}>
          <input
            type='text'
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder='새 폴더 이름...'
            maxLength={30}
            style={{ 
              flex: 1, 
              padding: '10px 14px', 
              borderRadius: '4px', 
              border: '1px solid var(--color-border-primary)',
              background: 'var(--color-bg-secondary)',
              color: 'var(--text-color)'
            }}
          />
          <Button type='submit' disabled={newFolderName.trim().length === 0 || isLoading}>
            생성
          </Button>
        </form>
      </div>

      <div className='safety-action-modal__bottom'>
        <div className='safety-action-modal__actions'>
          <button onClick={handleCancel} className='link-button' type='button' style={{ marginRight: '16px' }}>
            <FormattedMessage
              id='confirmation_modal.cancel'
              defaultMessage='Cancel'
            />
          </button>
          
          <Button onClick={handleSave}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkFolderModal;