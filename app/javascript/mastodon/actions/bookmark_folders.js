import api from '../api';

export const BOOKMARK_FOLDERS_FETCH_REQUEST = 'BOOKMARK_FOLDERS_FETCH_REQUEST';
export const BOOKMARK_FOLDERS_FETCH_SUCCESS = 'BOOKMARK_FOLDERS_FETCH_SUCCESS';
export const BOOKMARK_FOLDERS_FETCH_FAIL    = 'BOOKMARK_FOLDERS_FETCH_FAIL';

export const BOOKMARK_FOLDER_CREATE_SUCCESS = 'BOOKMARK_FOLDER_CREATE_SUCCESS';
export const BOOKMARK_FOLDER_DELETE_SUCCESS = 'BOOKMARK_FOLDER_DELETE_SUCCESS';

// 폴더 목록 조회 (페이지네이션 포함)
export const fetchBookmarkFolders = (limit = 10, offset = 0) => (dispatch, getState) => {
  dispatch({ type: BOOKMARK_FOLDERS_FETCH_REQUEST });

  api(getState).get('/api/v1/bookmark_folders', { params: { limit, offset } })
    .then(response => {
      dispatch({ type: BOOKMARK_FOLDERS_FETCH_SUCCESS, folders: response.data });
    })
    .catch(error => {
      dispatch({ type: BOOKMARK_FOLDERS_FETCH_FAIL, error });
    });
};

// 새 폴더 생성
export const createBookmarkFolder = (name) => (dispatch, getState) => {
  api(getState).post('/api/v1/bookmark_folders', { name })
    .then(response => {
      dispatch({ type: BOOKMARK_FOLDER_CREATE_SUCCESS, folder: response.data });
    })
    .catch(error => {
      console.error('Failed to create bookmark folder', error);
    });
};

// 특정 툿을 폴더에 추가
export const addStatusToFolder = (statusId, folderId) => (dispatch, getState) => {
  api(getState).post(`/api/v1/statuses/${statusId}/bookmark_folder`, { folder_id: folderId })
    .then(() => {
      // 서버에서 북마크 처리가 완료되었으므로, 필요한 경우 알림(Toast) 액션을 여기서 호출할 수 있습니다.
    })
    .catch(error => {
      console.error('Failed to add status to folder', error);
    });
};

// 특정 툿을 폴더에서 제거 (새로 추가된 로직)
export const removeStatusFromFolder = (statusId, folderId) => (dispatch, getState) => {
  api(getState).delete(`/api/v1/statuses/${statusId}/bookmark_folder`, { data: { folder_id: folderId } })
    .then(() => {
      // 제거 완료 후 로직
    })
    .catch(error => {
      console.error('Failed to remove status from folder', error);
    });
};