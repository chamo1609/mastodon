import { useState, useEffect } from 'react';
import classNames from 'classnames';

import logo from '@/images/logo.svg';

export const WordmarkLogo: React.FC = () => {
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  useEffect(() => {
    // 1. HAML에서 심어둔 메타 태그를 찾습니다.
    const themeMeta = document.querySelector('meta[name="current-theme"]');
    
    // 2. 메타 태그의 content 값이 'custom-theme'인지 확인하여 상태를 업데이트합니다.
    if (themeMeta && themeMeta.getAttribute('content') === 'custom-theme') {
      setIsCustomTheme(true);
    }
  }, []);

  return (
    <>
      {!isCustomTheme && (
        <svg viewBox='0 0 261 66' className='logo logo--wordmark mastodon-original-logo' role='img'>
          <title>Mastodon</title>
          <use xlinkHref='#logo-symbol-wordmark' />
        </svg>
      )}

      {isCustomTheme && (
        <img alt='Chamomile' className='logo logo--wordmark chamomile-custom-logo' />
      )}
    </>
  );
};

export const IconLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox='0 0 79 79'
    className={classNames('logo logo--icon', className)}
    role='img'
  >
    <title>Mastodon</title>
    <use xlinkHref='#logo-symbol-icon' />
  </svg>
);

export const SymbolLogo: React.FC<{ className?: string }> = ({ className }) => {
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="current-theme"]');
    
    if (themeMeta && themeMeta.getAttribute('content') === 'custom-theme') {
      setIsCustomTheme(true);
    }
  }, []);

  return (
    <>
      {!isCustomTheme && (
        <img 
          src={logo} 
          alt='Mastodon' 
          className='logo logo--icon mastodon-original-icon'
        />
      )}

      {isCustomTheme && (
        <img 
          alt='Chamomile' 
          className='logo logo--icon chamomile-custom-icon'
        />
      )}
    </>
  );
};