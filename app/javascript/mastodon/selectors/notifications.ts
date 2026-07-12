import type { Map as ImmutableMap } from 'immutable';
import { createSelector } from '@reduxjs/toolkit';

import { compareId } from 'mastodon/compare_id';
import type {
  NotificationGroup,
  NotificationGroupMention,
  NotificationGroupQuote,
} from 'mastodon/models/notification_group';
import type { Status, StatusVisibility } from 'mastodon/models/status';
import type { NotificationGap } from 'mastodon/reducers/notification_groups';
import type { RootState } from 'mastodon/store';

import {
  selectSettingsNotificationsExcludedTypes,
  selectSettingsNotificationsQuickFilterActive,
  selectSettingsNotificationsQuickFilterShow,
} from './settings';

const isDirectMention = (
  item: NotificationGroupMention | NotificationGroupQuote,
  statuses: ImmutableMap<string, Status>,
): boolean => {
  if (!item.statusId) return false;

  const status = statuses.get(item.statusId);
  if (!status) return false;

  const visibility = status.get('visibility') as StatusVisibility | undefined;
  return visibility === 'direct';
};

const filterNotificationsByAllowedTypes = (
  showFilterBar: boolean,
  allowedType: string,
  excludedTypes: string[],
  notifications: (NotificationGroup | NotificationGap)[],
  statuses: ImmutableMap<string, Status>,
) => {
  if (!showFilterBar || allowedType === 'all') {
    return notifications.filter(
      (item) => item.type === 'gap' || !excludedTypes.includes(item.type),
    );
  }

  if (allowedType === 'mention' || allowedType === 'direct_mention') {
    return notifications.filter((item) => {
      if (item.type === 'gap') return true;

      if (item.type === 'quote') return allowedType === 'mention';

      if (item.type !== 'mention') return false;

      const isDirect = isDirectMention(item, statuses);
      return allowedType === 'direct_mention' ? isDirect : !isDirect;
    });
  }

  return notifications.filter(
    (item) =>
      item.type === 'gap' ||
      allowedType === item.type ||
      (allowedType === 'collection' &&
        (item.type === 'collection_update' ||
          item.type === 'added_to_collection')),
  );
};

export const selectNotificationGroups = createSelector(
  [
    selectSettingsNotificationsQuickFilterShow,
    selectSettingsNotificationsQuickFilterActive,
    selectSettingsNotificationsExcludedTypes,
    (state: RootState) => state.notificationGroups.groups,
    (state: RootState) => state.statuses,
  ],
  filterNotificationsByAllowedTypes,
);

const selectPendingNotificationGroups = createSelector(
  [
    selectSettingsNotificationsQuickFilterShow,
    selectSettingsNotificationsQuickFilterActive,
    selectSettingsNotificationsExcludedTypes,
    (state: RootState) => state.notificationGroups.pendingGroups,
    (state: RootState) => state.statuses,
  ],
  filterNotificationsByAllowedTypes,
);

export const selectUnreadNotificationGroupsCount = createSelector(
  [
    (s: RootState) => s.notificationGroups.lastReadId,
    selectNotificationGroups,
    selectPendingNotificationGroups,
  ],
  (notificationMarker, groups, pendingGroups) => {
    return (
      groups.filter(
        (group) =>
          group.type !== 'gap' &&
          group.page_max_id &&
          compareId(group.page_max_id, notificationMarker) > 0,
      ).length +
      pendingGroups.filter(
        (group) =>
          group.type !== 'gap' &&
          group.page_max_id &&
          compareId(group.page_max_id, notificationMarker) > 0,
      ).length
    );
  },
);

export const selectAnyPendingNotification = createSelector(
  [
    (s: RootState) => s.notificationGroups.readMarkerId,
    selectNotificationGroups,
  ],
  (notificationMarker, groups) => {
    return groups.some(
      (group) =>
        group.type !== 'gap' &&
        group.page_max_id &&
        compareId(group.page_max_id, notificationMarker) > 0,
    );
  },
);

export const selectPendingNotificationGroupsCount = createSelector(
  [selectPendingNotificationGroups],
  (pendingGroups) =>
    pendingGroups.filter((group) => group.type !== 'gap').length,
);
