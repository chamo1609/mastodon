import { useCallback } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { deleteBookmarkFolder } from 'mastodon/actions/bookmark_folders';
import { useAppDispatch } from 'mastodon/store';
import type { BaseConfirmationModalProps } from './confirmation_modal';
import { ConfirmationModal } from './confirmation_modal';

const messages = defineMessages({
  title: {
    id: 'confirmations.delete_bookmark_folder.title',
    defaultMessage: '북마크 폴더 삭제',
  },
  message: {
    id: 'confirmations.delete_bookmark_folder.message',
    defaultMessage: '정말 이 북마크 폴더를 삭제하시겠습니까? 폴더 안의 게시물은 북마크에서 해제되지 않습니다.',
  },
  confirm: {
    id: 'confirmations.delete_bookmark_folder.confirm',
    defaultMessage: '삭제',
  },
});

export const ConfirmDeleteBookmarkFolderModal: React.FC<
  {
    folderId: number;
  } & BaseConfirmationModalProps
> = ({ folderId, onClose }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const onConfirm = useCallback(() => {
    dispatch(deleteBookmarkFolder(folderId) as any);
  }, [dispatch, folderId]);

  return (
    <ConfirmationModal
      title={intl.formatMessage(messages.title)}
      message={intl.formatMessage(messages.message)}
      confirm={intl.formatMessage(messages.confirm)}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};