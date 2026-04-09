import api from '../api';
import { importFetchedStatus } from './importer'; // 마스토돈 내장 임포터 불러오기

export const BOOKMARK_FOLDERS_FETCH_REQUEST = 'BOOKMARK_FOLDERS_FETCH_REQUEST';
export const BOOKMARK_FOLDERS_FETCH_SUCCESS = 'BOOKMARK_FOLDERS_FETCH_SUCCESS';
export const BOOKMARK_FOLDERS_FETCH_FAIL    = 'BOOKMARK_FOLDERS_FETCH_FAIL';

export const BOOKMARK_FOLDER_CREATE_SUCCESS = 'BOOKMARK_FOLDER_CREATE_SUCCESS';
export const BOOKMARK_FOLDER_UPDATE_SUCCESS = 'BOOKMARK_FOLDER_UPDATE_SUCCESS'; // 수정 성공 액션 추가
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

// 폴더 이름 수정 (신규 추가)
export const updateBookmarkFolder = (folderId, name) => (dispatch, getState) => {
  return api(getState).put(`/api/v1/bookmark_folders/${folderId}`, { name })
    .then(response => {
      dispatch({ type: BOOKMARK_FOLDER_UPDATE_SUCCESS, folder: response.data });
    })
    .catch(error => {
      console.error('Failed to update bookmark folder', error);
    });
};

// 폴더 삭제 (신규 추가)
export const deleteBookmarkFolder = (folderId) => (dispatch, getState) => {
  return api(getState).delete(`/api/v1/bookmark_folders/${folderId}`)
    .then(() => {
      dispatch({ type: BOOKMARK_FOLDER_DELETE_SUCCESS, folderId });
    })
    .catch(error => {
      console.error('Failed to delete bookmark folder', error);
    });
};

export const addStatusToFolder = (statusId, folderId) => (dispatch, getState) => {
  // 모달의 비동기 제어를 위해 Promise를 반환하도록 return 추가
  return api(getState).post(`/api/v1/statuses/${statusId}/bookmark_folder`, { folder_id: folderId })
    .then(response => {
      // JSON 데이터를 Immutable Map으로 변환하여 안전하게 Redux에 병합
      dispatch(importFetchedStatus(response.data));
    })
    .catch(error => {
      console.error('Failed to add status to folder', error);
    });
};

export const removeStatusFromFolder = (statusId, folderId) => (dispatch, getState) => {
  // 모달의 비동기 제어를 위해 Promise를 반환하도록 return 추가
  return api(getState).delete(`/api/v1/statuses/${statusId}/bookmark_folder`, { data: { folder_id: folderId } })
    .then(response => {
      // JSON 데이터를 Immutable Map으로 변환하여 안전하게 Redux에 병합
      dispatch(importFetchedStatus(response.data));
    })
    .catch(error => {
      console.error('Failed to remove status from folder', error);
    });
};

// 폴더 순서 변경 (신규 추가)
export const reorderBookmarkFolders = (folderIds) => (dispatch, getState) => {
  return api(getState).post('/api/v1/bookmark_folders/reorder', { folder_ids: folderIds })
    .then(() => {
      // 서버에 순서가 성공적으로 저장되면 폴더 목록을 새로고침합니다.
      dispatch(fetchBookmarkFolders());
    })
    .catch(error => {
      console.error('Failed to reorder bookmark folders', error);
    });
};