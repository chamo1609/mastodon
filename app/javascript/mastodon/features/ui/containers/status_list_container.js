import { createSelector } from '@reduxjs/toolkit';
import { Map as ImmutableMap, List as ImmutableList } from 'immutable';
import { connect } from 'react-redux';

import { debounce } from 'lodash';

import { scrollTopTimeline, loadPending } from '@/mastodon/actions/timelines';
import { isNonStatusId } from '@/mastodon/actions/timelines_typed';
import StatusList from '@/mastodon/components/status_list';
import { me } from '@/mastodon/initial_state';

const makeGetStatusIds = (pending = false) => createSelector([
  (state, { type }) => state.getIn(['settings', type], ImmutableMap()),
  (state, { type, maxItems }) => {
    const items = state.getIn(['timelines', type, pending ? 'pendingItems' : 'items'], ImmutableList());

    if (maxItems) {
      return items.take(maxItems);
    }

    return items;
  },
  (state)           => state.get('statuses'),
  (state, { type }) => type,
  // 게시판
  (state)           => state.getIn(['meta', 'chamomile_boards']),
], (columnSettings, statusIds, statuses, timelineType, chamomileBoardsData) => {
  const boards = chamomileBoardsData?.toJS ? chamomileBoardsData.toJS() : chamomileBoardsData || [];
  const BOARD_TAGS = boards.map(b => b.tag.replace(/^#/, '').toLowerCase());

  return statusIds.filter(id => {
    if (isNonStatusId(id)) return true;

    const statusForId = statuses.get(id);
    if (!statusForId) return false;

    // 홈 화면에서 다이렉트 메시지 필터링
    const visibility = statusForId.get('visibility');
    if (visibility === 'direct') {
      if (timelineType === 'home') {
        return false;
      }
    }

    // 홈 화면에서 게시판 해시태그 필터링
    if (timelineType === 'home' && BOARD_TAGS.length > 0) {
      const tags = statusForId.get('tags');
      if (tags && !tags.isEmpty()) {
        const hasBoardTag = tags.some(tag => {
          const tagName = tag.get('name');
          return tagName && BOARD_TAGS.includes(tagName.toLowerCase());
        });

        if (hasBoardTag) {
          return false; // 게시판 태그가 일치하면 타임라인에서 제외
        }
      }
    }

    if (statusForId.get('account') === me) return true;

    if (columnSettings.getIn(['shows', 'reblog']) === false && statusForId.get('reblog') !== null) {
      return false;
    }

    if (columnSettings.getIn(['shows', 'reply']) === false && statusForId.get('in_reply_to_id') !== null && statusForId.get('in_reply_to_account_id') !== me) {
      return false;
    }

    if (columnSettings.getIn(['shows', 'quote']) === false && statusForId.get('quote') !== null) {
      return false;
    }

    return true;
  });
});

const makeMapStateToProps = () => {
  const getStatusIds = makeGetStatusIds();
  const getPendingStatusIds = makeGetStatusIds(true);

  /**
   * @param {import('mastodon/store').RootState} state
   * @param {Object} props
   * @param {string} props.timelineId
   * @param {boolean} [props.initialLoadingState]
   * @param {number} [props.maxItems]
   */
  const mapStateToProps = (state, { timelineId, initialLoadingState = true, maxItems }) => ({
    statusIds: getStatusIds(state, { type: timelineId, maxItems }),
    lastId:    state.getIn(['timelines', timelineId, 'items'])?.last(),
    isLoading: state.getIn(['timelines', timelineId, 'isLoading'], initialLoadingState),
    isPartial: state.getIn(['timelines', timelineId, 'isPartial'], false),
    hasMore:   state.getIn(['timelines', timelineId, 'hasMore']),
    numPending: getPendingStatusIds(state, { type: timelineId }).size,
  });

  return mapStateToProps;
};

const mapDispatchToProps = (dispatch, { timelineId }) => ({
  onScrollToTop: debounce(() => {
    dispatch(scrollTopTimeline(timelineId, true));
  }, 100),

  onScroll: debounce(() => {
    dispatch(scrollTopTimeline(timelineId, false));
  }, 100),

  onLoadPending: () => dispatch(loadPending(timelineId)),
});

export default connect(makeMapStateToProps, mapDispatchToProps)(StatusList);