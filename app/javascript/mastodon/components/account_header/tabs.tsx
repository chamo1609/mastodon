import type { FC } from 'react';

import { FormattedMessage } from 'react-intl';

import type { NavLinkProps } from 'react-router-dom';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useAccountId } from '@/mastodon/hooks/useAccountId';

import { TabLink, TabList } from '../tab_list';

import classes from './styles.module.scss';

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
    <TabList>
      {/* 기본 활동(게시물) 탭 */}
      <TabLink isActive={isActive} to={`/@${acct}`}>
        <FormattedMessage id='account.activity' defaultMessage='Activity' />
      </TabLink>

      {/* 미디어 탭 (권한이 있을 때만 표시) */}
      {show_media && (
        <TabLink exact to={`/@${acct}/media`}>
          <FormattedMessage id='account.media' defaultMessage='Media' />
        </TabLink>
      )}

      {/* 하이라이트/컬렉션 탭 (권한이 있을 때만 표시) */}
      {show_featured && (
        <TabLink exact to={`/@${acct}/featured`}>
          <FormattedMessage id='account.featured' defaultMessage='Featured' />
        </TabLink>
      )}
    </TabList>
  );
};
