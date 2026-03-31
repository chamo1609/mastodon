// app/javascript/mastodon/features/ui/components/account_switcher.tsx

import React, { useState, useEffect, useMemo } from 'react';
import AccountIcon from '@/material-icons/400-24px/account_circle.svg?react'; // 마스토돈 기본 전환 아이콘
import { Dropdown } from 'mastodon/components/dropdown_menu';
import { Icon } from 'mastodon/components/icon';
import type { MenuItem } from 'mastodon/models/dropdown_menu';

import { getSavedAccounts, AccountData, removeAccount } from '@/mastodon/utils/multi_account';

export const AccountSwitcher: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);

  // 컴포넌트가 로드될 때 브라우저 창고에서 계정 목록을 가져옵니다.
  useEffect(() => {
    setAccounts(getSavedAccounts());
  }, []);

  // [계정 전환 로직]
  const killServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister(); // 캐시 귀신을 확실하게 죽입니다.
      }
    }
  };
  const handleSwitchAccount = async (account: AccountData) => {
    try {
      await killServiceWorker();

      const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      const response = await fetch('/auth/account_switch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        window.location.href = '/'; // 꼬리표 없이도 최신 화면이 뜹니다.
      } else if (response.status === 401) {
        alert('토큰이 만료되었습니다. 다시 로그인해 주세요.');
      }
    } catch (e) {
      console.error('전환 통신 오류:', e);
    }
  };

  const handleAddNewAccount = async () => {
  await killServiceWorker();

  // remember_user_token이 HttpOnly가 아닐 경우 JS에서 선제 삭제
  // 이미 서버에서도 삭제하지만 이중 보호
  const cookiesToClear = ['remember_user_token', 'remember_token'];
  cookiesToClear.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
  });

  window.location.href = '/auth/add_new_account';
};
  
  const menu = useMemo(() => {
    const arr: MenuItem[] = [];

    // 1. 저장된 계정들을 메뉴 아이템으로 변환
    accounts.forEach((acc) => {
      arr.push({
        // text 속성 안에 HTML(JSX) 구조를 직접 넣어 커스텀 디자인을 만듭니다.
        text: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={acc.avatar} 
              alt="" 
              style={{ width: '24px', height: '24px', borderRadius: '4px' }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{acc.username}</span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>@{acc.acct}</span>
            </div>
          </div>
        ) as any, // TypeScript 에러 방지를 위한 처리
        action: () => handleSwitchAccount(acc),
      });
    });

    // 2. 계정이 하나라도 있다면 구분선(null)을 추가합니다.
    if (accounts.length > 0) {
      arr.push(null);
    }

    // 3. 마지막에 새 계정 추가 버튼을 넣습니다.
    arr.push({
      text: '+ 다른 계정 추가하기',
      action: handleAddNewAccount,
    });

    return arr;
  }, [accounts]);

  return (
    // 마스토돈 공식 Dropdown 컴포넌트로 메뉴를 감싸줍니다.
    <Dropdown items={menu} placement='bottom-start'>
      {/* 올려주신 MoreLink와 완전히 똑같은 클래스 네임을 사용합니다.
        이렇게 하면 마스토돈 사이드바 버튼과 100% 동일한 스타일이 적용됩니다. 
      */}
      <button className='column-link column-link--transparent' type='button'>
        {/* 아이콘도 공식 Icon 컴포넌트를 사용합니다 */}
        <Icon id='exchange' icon={AccountIcon} className='column-link__icon' />
        <span>계정 전환</span>
      </button>
    </Dropdown>
  );
};