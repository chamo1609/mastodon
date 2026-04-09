import { Map, List, fromJS } from 'immutable';
import {
  BOOKMARK_FOLDERS_FETCH_REQUEST,
  BOOKMARK_FOLDERS_FETCH_SUCCESS,
  BOOKMARK_FOLDERS_FETCH_FAIL,
  BOOKMARK_FOLDER_CREATE_SUCCESS,
  BOOKMARK_FOLDER_UPDATE_SUCCESS,
  BOOKMARK_FOLDER_DELETE_SUCCESS,
} from '../actions/bookmark_folders';

const initialState = Map({
  items: List(),
  isLoading: false,
});

export default function bookmarkFolders(state = initialState, action) {
  switch (action.type) {
    case BOOKMARK_FOLDERS_FETCH_REQUEST:
      return state.set('isLoading', true);
      
    case BOOKMARK_FOLDERS_FETCH_SUCCESS:
      return state.withMutations(map => {
        map.set('items', fromJS(action.folders));
        map.set('isLoading', false);
      });
      
    case BOOKMARK_FOLDERS_FETCH_FAIL:
      return state.set('isLoading', false);
      
    case BOOKMARK_FOLDER_CREATE_SUCCESS:
      return state.update('items', items => items.push(fromJS(action.folder)));
      
    case BOOKMARK_FOLDER_UPDATE_SUCCESS:
      return state.update('items', items => 
        items.map(item => 
          item.get('id') === action.folder.id ? fromJS(action.folder) : item
        )
      );
      
    case BOOKMARK_FOLDER_DELETE_SUCCESS:
      // action 파일에서 folderId로 데이터를 넘겼으므로 action.folderId를 참조합니다.
      return state.update('items', items => items.filterNot(item => item.get('id') === action.folderId));
      
    default:
      return state;
  }
}

// 폴더 순서 변경
export const reorderBookmarkFolders = (folderIds) => (dispatch, getState) => {
  return api(getState).post('/api/v1/bookmark_folders/reorder', { folder_ids: folderIds })
    .then(() => {
      // 서버에 순서가 성공적으로 저장되면, 헤더의 드롭다운 목록 등 전역 상태도 최신화되도록 폴더 목록을 한 번 새로고침(Refetch) 합니다.
      dispatch(fetchBookmarkFolders());
    })
    .catch(error => {
      console.error('Failed to reorder bookmark folders', error);
    });
};