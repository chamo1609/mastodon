import { useState, useEffect } from 'react';
import classNames from 'classnames';

import logo from '@/images/logo.svg';
import { custom_logo_light, custom_logo_dark } from 'mastodon/initial_state';

const useColorScheme = () => {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.getAttribute('data-color-scheme') === 'light');
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-scheme'],
    });

    return () => observer.disconnect();
  }, []);

  return isLightMode;
};

export const WordmarkLogo: React.FC = () => {
  const isLightMode = useColorScheme();
  const activeCustomLogo = isLightMode ? custom_logo_light : custom_logo_dark;

  if (activeCustomLogo) {
    return (
      <img 
        src={activeCustomLogo} 
        alt='Chamomile' 
        className='logo logo--wordmark custom-brand-logo' 
        style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
      />
    );
  }

  return (
    <svg viewBox='0 0 261 66' className='logo logo--wordmark' role='img'>
      <title>Mastodon</title>
      <use xlinkHref='#logo-symbol-wordmark' />
    </svg>
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

export const SymbolLogo: React.FC = () => (
  <img src={logo} alt='Mastodon' className='logo logo--icon' />
);