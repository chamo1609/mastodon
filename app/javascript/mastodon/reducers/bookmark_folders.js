import { Map, List, fromJS } from 'immutable';
import {
  BOOKMARK_FOLDERS_FETCH_REQUEST,
  BOOKMARK_FOLDERS_FETCH_SUCCESS,
  BOOKMARK_FOLDERS_FETCH_FAIL,
  BOOKMARK_FOLDER_CREATE_SUCCESS,
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
        // 기존 목록에 덮어쓰거나 페이징 로직에 따라 이어붙일 수 있습니다. 여기서는 기본 덮어쓰기입니다.
        map.set('items', fromJS(action.folders));
        map.set('isLoading', false);
      });
      
    case BOOKMARK_FOLDERS_FETCH_FAIL:
      return state.set('isLoading', false);
      
    case BOOKMARK_FOLDER_CREATE_SUCCESS:
      return state.update('items', items => items.push(fromJS(action.folder)));
      
    case BOOKMARK_FOLDER_DELETE_SUCCESS:
      return state.update('items', items => items.filterNot(item => item.get('id') === action.id));
      
    default:
      return state;
  }
}