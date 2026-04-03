import type { FC } from 'react';

import { FormattedMessage } from 'react-intl';

import type { NavLinkProps } from 'react-router-dom';
import { NavLink } from 'react-router-dom';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useAccountId } from '@/mastodon/hooks/useAccountId';

import { areCollectionsEnabled } from '../../collections/utils';

import classes from './redesign.module.scss';

const isActive: Required<NavLinkProps>['isActive'] = (match, location) =>
  match?.url === location.pathname ||
  (!!match?.url && location.pathname.startsWith(`${match.url}/tagged/`));

export const AccountTabs: FC = () => {
  const accountId = useAccountId();
  const account = useAccount(accountId);

  // 계정 정보를 불러오지 못했을 경우
  if (!account) {
    return <hr className={classes.noTabs} />;
  }

  const { acct, show_featured, show_media } = account;
  
  // 보여줄 탭이 전혀 없는 경우
  if (!show_featured && !show_media) {
    return <hr className={classes.noTabs} />;
  }

  return (
    <div className={classes.tabs}>
      {/* 기본 활동(게시물) 탭 */}
      <NavLink isActive={isActive} to={`/@${acct}`}>
        <FormattedMessage id='account.activity' defaultMessage='Activity' />
      </NavLink>

      {/* 미디어 탭 (권한이 있을 때만 표시) */}
      {show_media && (
        <NavLink exact to={`/@${acct}/media`}>
          <FormattedMessage id='account.media' defaultMessage='Media' />
        </NavLink>
      )}

      {/* 하이라이트/컬렉션 탭 (권한이 있을 때만 표시) */}
      {show_featured && (
        <NavLink exact to={`/@${acct}/featured`}>
          {areCollectionsEnabled() ? (
            <FormattedMessage
              id='account.featured.collections'
              defaultMessage='Collections'
            />
          ) : (
            <FormattedMessage id='account.featured' defaultMessage='Featured' />
          )}
        </NavLink>
      )}
    </div>
  );
};
