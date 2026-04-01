import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';

import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import UnfoldLessIcon from '@/material-icons/400-24px/unfold_less.svg?react';
import UnfoldMoreIcon from '@/material-icons/400-24px/unfold_more.svg?react';

import { cancelReplyCompose } from 'mastodon/actions/compose';
import { IconButton } from 'mastodon/components/icon_button';
import { Dropdown } from 'mastodon/components/dropdown_menu';
import { Icon } from 'mastodon/components/icon';
import { me } from 'mastodon/initial_state';
import { useAppDispatch, useAppSelector } from 'mastodon/store';
import type { MenuItem } from 'mastodon/models/dropdown_menu';

// [추가] 로컬 스토리지에서 부계정들을 불러오기 위한 유틸리티
import { getSavedAccounts, AccountData } from '@/mastodon/utils/multi_account';

const messages = defineMessages({
  cancel: { id: 'reply_indicator.cancel', defaultMessage: 'Cancel' },
});

// [추가] ComposeForm과 통신하기 위해 Props 인터페이스 정의
interface NavigationBarProps {
  selectedAccount?: AccountData | null;
  onSelectAccount?: (account: AccountData | null) => void;
  onAddAccountClick?: () => void; // 팝업창을 띄우는 함수를 부모로부터 받을 예정
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  selectedAccount,
  onSelectAccount,
  onAddAccountClick,
}) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  
  // 드롭다운 열림/닫힘 상태 관리
  const [isOpen, setIsOpen] = useState(false);
  // 로컬 스토리지에 저장된 부계정 목록
  const [savedAccounts, setSavedAccounts] = useState<AccountData[]>([]);
  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, [isOpen, selectedAccount]);

  const isReplying = useAppSelector(
    (state) => !!state.compose.get('in_reply_to'),
  );

  // 본계정(A)의 정보 (Redux 스토어에서 가져옴)
  const baseAccount = useAppSelector((state) => {
    const currentUserId = me || '';
    if (!currentUserId) return null;

    // state.accounts는 Map 타입이므로 무조건 .get()을 사용합니다.
    return state.accounts.get(currentUserId);
  });

  const handleCancelClick = useCallback(() => {
    dispatch(cancelReplyCompose());
  }, [dispatch]);

  // 드롭다운 메뉴 아이템 구성
  const menu = useMemo(() => {
    const arr: MenuItem[] = [];

    // 1. 본계정(A) 메뉴 아이템 추가
    if (baseAccount) {
      arr.push({
        text: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={baseAccount.get('avatar')} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {baseAccount.display_name || baseAccount.username}
              </span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                기본 (@{baseAccount.acct})
              </span>
            </div>
          </div>
        ) as any,
        action: () => {
          if (onSelectAccount) onSelectAccount(null); // null은 본계정을 의미함
          setIsOpen(false);
        },
      });
    }

    // 2. 구분선
    if (savedAccounts.length > 0) {
      arr.push(null);
    }

    // 3. 부계정(B, C...) 메뉴 아이템 추가
    savedAccounts.forEach((acc) => {
      arr.push({
        text: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={acc.avatar} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{acc.username}</span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>부계정 (@{acc.acct})</span>
            </div>
          </div>
        ) as any,
        action: () => {
          if (onSelectAccount) onSelectAccount(acc);
          setIsOpen(false);
        },
      });
    });

    // 4. 새 계정 추가 버튼
    arr.push(null);
    arr.push({
      text: '+ 새 계정 연결하기',
      action: () => {
        if (onAddAccountClick) onAddAccountClick();
        setIsOpen(false);
      },
    });

    return arr;
  }, [baseAccount, savedAccounts, onSelectAccount, onAddAccountClick]);

  if (!me || !baseAccount) {
    return null;
  }

  // 현재 화면에 표시할 계정 결정 (선택된 부계정이 없으면 본계정 표시)
  const displayAvatar = selectedAccount ? selectedAccount.avatar : baseAccount.avatar;
  const displayUsername = selectedAccount ? selectedAccount.username : (baseAccount.display_name || baseAccount.username);
  const displayAcct = selectedAccount ? selectedAccount.acct : baseAccount.acct;

  return (
    <div className='navigation-bar' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      
      <Dropdown items={menu} placement='bottom-start'>
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s'
          }}
          className="account-switcher-trigger"
        >
          <img 
            src={displayAvatar} 
            alt="Current composing account" 
            style={{ width: '36px', height: '36px', borderRadius: '4px' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--primary-text-color)' }}>
              {displayUsername}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--darker-text-color)' }}>
              @{displayAcct}
            </span>
          </div>
          
          <Icon 
            id={isOpen ? 'unfold-less' : 'unfold-more'} 
            icon={isOpen ? UnfoldLessIcon : UnfoldMoreIcon} 
            style={{ color: 'var(--darker-text-color)', marginLeft: '4px' }}
          />
        </div>
      </Dropdown>

      {/* 답글 취소 버튼 (기존 로직 유지) */}
      {isReplying && (
        <IconButton
          title={intl.formatMessage(messages.cancel)}
          icon=''
          iconComponent={CloseIcon}
          onClick={handleCancelClick}
        />
      )}
    </div>
  );
};