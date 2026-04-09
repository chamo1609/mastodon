import api, { getLinks } from '../api';
import { importFetchedStatuses } from './importer';

export const BOOKMARKED_STATUSES_FETCH_REQUEST = 'BOOKMARKED_STATUSES_FETCH_REQUEST';
export const BOOKMARKED_STATUSES_FETCH_SUCCESS = 'BOOKMARKED_STATUSES_FETCH_SUCCESS';
export const BOOKMARKED_STATUSES_FETCH_FAIL    = 'BOOKMARKED_STATUSES_FETCH_FAIL';

export const BOOKMARKED_STATUSES_EXPAND_REQUEST = 'BOOKMARKED_STATUSES_EXPAND_REQUEST';
export const BOOKMARKED_STATUSES_EXPAND_SUCCESS = 'BOOKMARKED_STATUSES_EXPAND_SUCCESS';
export const BOOKMARKED_STATUSES_EXPAND_FAIL    = 'BOOKMARKED_STATUSES_EXPAND_FAIL';

// folderId 파라미터를 받을 수 있도록 인자를 추가합니다.
export function fetchBookmarkedStatuses(folderId = null) {
  return (dispatch, getState) => {
    if (getState().getIn(['status_lists', 'bookmarks', 'isLoading'])) {
      return;
    }

    dispatch(fetchBookmarkedStatusesRequest());

    // folderId가 존재하면 params 객체에 담아 백엔드로 전송합니다.
    const params = folderId ? { folder_id: folderId } : {};

    api().get('/api/v1/bookmarks', { params }).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(importFetchedStatuses(response.data));
      dispatch(fetchBookmarkedStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(fetchBookmarkedStatusesFail(error));
    });
  };
}

export function fetchBookmarkedStatusesRequest() {
  return {
    type: BOOKMARKED_STATUSES_FETCH_REQUEST,
  };
}

export function fetchBookmarkedStatusesSuccess(statuses, next) {
  return {
    type: BOOKMARKED_STATUSES_FETCH_SUCCESS,
    statuses,
    next,
  };
}

export function fetchBookmarkedStatusesFail(error) {
  return {
    type: BOOKMARKED_STATUSES_FETCH_FAIL,
    error,
  };
}

export function expandBookmarkedStatuses() {
  return (dispatch, getState) => {
    const url = getState().getIn(['status_lists', 'bookmarks', 'next'], null);

    if (url === null || getState().getIn(['status_lists', 'bookmarks', 'isLoading'])) {
      return;
    }

    dispatch(expandBookmarkedStatusesRequest());

    api().get(url).then(response => {
      const next = getLinks(response).refs.find(link => link.rel === 'next');
      dispatch(importFetchedStatuses(response.data));
      dispatch(expandBookmarkedStatusesSuccess(response.data, next ? next.uri : null));
    }).catch(error => {
      dispatch(expandBookmarkedStatusesFail(error));
    });
  };
}

export function expandBookmarkedStatusesRequest() {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_REQUEST,
  };
}

export function expandBookmarkedStatusesSuccess(statuses, next) {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_SUCCESS,
    statuses,
    next,
  };
}

export function expandBookmarkedStatusesFail(error) {
  return {
    type: BOOKMARKED_STATUSES_EXPAND_FAIL,
    error,
  };
}