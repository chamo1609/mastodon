// import { useCallback, useState } from 'react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';

import { FormattedMessage, defineMessages, useIntl } from 'react-intl';

import classNames from 'classnames';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import ArrowBackIcon from '@/material-icons/400-24px/arrow_back.svg?react';
import ChevronLeftIcon from '@/material-icons/400-24px/chevron_left.svg?react';
import ChevronRightIcon from '@/material-icons/400-24px/chevron_right.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import ArrowDropDownIcon from '@/material-icons/400-24px/arrow_drop_down.svg?react';
import UnfoldLessIcon from '@/material-icons/400-24px/unfold_less.svg?react';
import UnfoldMoreIcon from '@/material-icons/400-24px/unfold_more.svg?react';
import TuneIcon from '@/material-icons/400-24px/tune.svg?react';
import TuneActiveIcon from '@/material-icons/400-24px/tune-fill.svg?react';
import type { IconProp } from 'mastodon/components/icon';
import { Icon } from 'mastodon/components/icon';
import { ButtonInTabsBar } from 'mastodon/features/ui/util/columns_context';
import { useIdentity } from 'mastodon/identity_context';

import { useColumnIndexContext } from '../features/ui/components/columns_area';
import { getColumnSkipLinkId } from '../features/ui/components/skip_links';

import { useAppHistory } from './router';


export const messages = defineMessages({
  show: { id: 'column_header.show_settings', defaultMessage: 'Show settings' },
  hide: { id: 'column_header.hide_settings', defaultMessage: 'Hide settings' },
  moveLeft: {
    id: 'column_header.moveLeft_settings',
    defaultMessage: 'Move column to the left',
  },
  moveRight: {
    id: 'column_header.moveRight_settings',
    defaultMessage: 'Move column to the right',
  },
  back: { id: 'column_back_button.label', defaultMessage: 'Back' },
});

const BackButton: React.FC<{
  hasTitle: boolean;
}> = ({ hasTitle }) => {
  const history = useAppHistory();
  const intl = useIntl();
  const columnIndex = useColumnIndexContext();

  const handleBackClick = useCallback(() => {
    if (history.location.state?.fromMastodon) {
      history.goBack();
    } else {
      history.push('/');
    }
  }, [history]);

  return (
    <button
      onClick={handleBackClick}
      className={classNames('column-header__back-button', {
        compact: hasTitle,
      })}
      id={!hasTitle ? getColumnSkipLinkId(columnIndex) : undefined}
      aria-label={intl.formatMessage(messages.back)}
      type='button'
    >
      <Icon
        id='chevron-left'
        icon={ArrowBackIcon}
        className='column-back-button__icon'
      />
      {!hasTitle && (
        <FormattedMessage id='column_back_button.label' defaultMessage='Back' />
      )}
    </button>
  );
};

export interface Props {
  title?: string;
  icon?: string;
  iconComponent?: IconProp;
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
  pinned?: boolean;
  multiColumn?: boolean;
  extraButton?: React.ReactNode;
  showBackButton?: boolean;
  placeholder?: boolean;
  appendContent?: React.ReactNode;
  collapseIssues?: boolean;
  onClick?: () => void;
  onMove?: (arg0: number) => void;
  onPin?: () => void;
}

export const ColumnHeader: React.FC<Props> = ({
  title,
  icon,
  iconComponent,
  active,
  children,
  className,
  pinned,
  multiColumn,
  extraButton,
  showBackButton,
  placeholder,
  appendContent,
  collapseIssues,
  onClick,
  onMove,
  onPin,
}) => {
  const intl = useIntl();
  const { signedIn } = useIdentity();
  const history = useAppHistory();
  // --- 카모마일 에디션 현재 게시판 위치 추적 및 모바일 전환 방어 로직 ---
  useEffect(() => {
    const updateBoardContext = (path: string) => {
      if (path.startsWith('/tags/')) {
        // 게시판(해시태그) 진입 시 위치 기억
        const tag = path.split('/')[2];
        
        // tag가 undefined가 아니고 실제 값이 있을 때만 저장소에 기록합니다.
        if (tag) {
          sessionStorage.setItem('chamomile_board', tag);
        }
      } else if (!path.startsWith('/publish') && !path.startsWith('/statuses/new')) {
        // 툿 작성 화면(/publish 등)으로 가는 게 아니라면 위치 정보 초기화
        sessionStorage.removeItem('chamomile_board');
      }
    };

    // 처음 렌더링될 때 주소 확인
    updateBoardContext(history.location.pathname);

    // 주소가 바뀔 때마다 감시
    const unlisten = history.listen((location) => {
      updateBoardContext(location.pathname);
    });

    return () => unlisten();
  }, [history]);
  // -------------------------------------------------------------
  const [collapsed, setCollapsed] = useState(true);
  const [animating, setAnimating] = useState(false);

  const boards = useSelector((state: any) => state.getIn(['meta', 'chamomile_boards']));
  const boardItems = (boards?.toJS ? boards.toJS() : boards || []).map((b: any) => ({
    text: b.name,
    action: () => history.push(`/tags/${b.tag}`),
  }));

  // --- 카모마일 에디션 게시판 추가: 커스텀 드롭다운 토글 및 바깥 클릭 감지 로직 ---
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 드롭다운 영역 바깥을 클릭하면 메뉴를 닫습니다.
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBoardMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // -------------------------------------------------------------

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCollapsed((value) => !value);
      setAnimating(true);
    },
    [setCollapsed, setAnimating],
  );

  const handleTitleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleMoveLeft = useCallback(() => {
    onMove?.(-1);
  }, [onMove]);

  const handleMoveRight = useCallback(() => {
    onMove?.(1);
  }, [onMove]);

  const handleTransitionEnd = useCallback(() => {
    setAnimating(false);
  }, [setAnimating]);

  const handlePin = useCallback(() => {
    if (!pinned) {
      history.replace('/');
    }

    onPin?.();
  }, [history, pinned, onPin]);

  const wrapperClassName = classNames('column-header__wrapper', className, {
    active,
  });

  const buttonClassName = classNames('column-header', {
    active,
  });

  const collapsibleClassName = classNames('column-header__collapsible', {
    collapsed,
    animating,
  });

  const collapsibleButtonClassName = classNames('column-header__button', {
    active: !collapsed,
  });

  let extraContent, pinButton, moveButtons, backButton, collapseButton;

  if (children) {
    extraContent = (
      <div key='extra-content' className='column-header__collapsible__extra'>
        {children}
      </div>
    );
  }

  if (multiColumn && pinned) {
    pinButton = (
      <button
        className='text-btn column-header__setting-btn'
        onClick={handlePin}
        type='button'
      >
        <Icon id='times' icon={CloseIcon} />{' '}
        <FormattedMessage id='column_header.unpin' defaultMessage='Unpin' />
      </button>
    );

    moveButtons = (
      <div className='column-header__setting-arrows'>
        <button
          title={intl.formatMessage(messages.moveLeft)}
          aria-label={intl.formatMessage(messages.moveLeft)}
          className='icon-button column-header__setting-btn'
          onClick={handleMoveLeft}
          type='button'
        >
          <Icon id='chevron-left' icon={ChevronLeftIcon} />
        </button>
        <button
          title={intl.formatMessage(messages.moveRight)}
          aria-label={intl.formatMessage(messages.moveRight)}
          className='icon-button column-header__setting-btn'
          onClick={handleMoveRight}
          type='button'
        >
          <Icon id='chevron-right' icon={ChevronRightIcon} />
        </button>
      </div>
    );
  } else if (multiColumn && onPin) {
    pinButton = (
      <button
        className='text-btn column-header__setting-btn'
        onClick={handlePin}
        type='button'
      >
        <Icon id='plus' icon={AddIcon} />{' '}
        <FormattedMessage id='column_header.pin' defaultMessage='Pin' />
      </button>
    );
  }

  if (
    !pinned &&
    ((multiColumn && history.location.state?.fromMastodon) || showBackButton)
  ) {
    backButton = <BackButton hasTitle={!!title} />;
  }

  const collapsedContent = [extraContent];

  if (multiColumn) {
    collapsedContent.push(
      <div key='buttons' className='column-header__advanced-buttons'>
        {pinButton}
        {moveButtons}
      </div>,
    );
  }

  if (signedIn && (children || (multiColumn && onPin))) {
    collapseButton = (
      <button
        className={collapsibleButtonClassName}
        title={intl.formatMessage(collapsed ? messages.show : messages.hide)}
        aria-label={intl.formatMessage(
          collapsed ? messages.show : messages.hide,
        )}
        onClick={handleToggleClick}
        type='button'
      >
        <i className='icon-with-badge'>
          <Icon
            id='sliders'
            icon={collapsed ? TuneIcon : TuneActiveIcon}
          />
          {collapseIssues && <i className='icon-with-badge__issue-badge' />}
        </i>
      </button>
    );
  }

  const hasIcon = icon && iconComponent;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const hasTitle = (hasIcon || backButton) && title;
  const columnIndex = useColumnIndexContext();

  const titleContents = (
    <>
      {!backButton && hasIcon && (
        <Icon id={icon} icon={iconComponent} className='column-header__icon' />
      )}
      {title}
    </>
  );

  const component = (
    <div className={wrapperClassName}>
      {/* h1 내부 여백을 없애고 flex 컨테이너로 만듭니다 */}
      <h1 className={buttonClassName} style={{ padding: 0, display: 'flex' }}>
        {hasTitle && (
          <div style={{ display: 'flex', flex: 1, width: '100%', alignItems: 'stretch' }}>
            {backButton}

{/* 타이틀 및 게시판 드롭다운 영역을 감싸는 래퍼 컨테이너 */}
            <div style={{ display: 'flex', width: '100%' }}>
              
              {/* 왼쪽: 타이틀 영역 (main 브랜치의 조건부 렌더링 + 카모마일 스타일 반영) */}
              {onClick ? (
                <button
                  onClick={handleTitleClick}
                  className='column-header__title'
                  type='button'
                  id={getColumnSkipLinkId(columnIndex)}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: boardItems && boardItems.length > 0 ? '1px solid rgba(127,127,127,0.2)' : 'none' }}
                >
                  {titleContents}
                </button>
              ) : (
                <span
                  className='column-header__title'
                  tabIndex={-1}
                  id={getColumnSkipLinkId(columnIndex)}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: boardItems && boardItems.length > 0 ? '1px solid rgba(127,127,127,0.2)' : 'none' }}
                >
                  {titleContents}
                </span>
              )}

              {/* 오른쪽: 카모마일 게시판 드롭다운 (HEAD 브랜치의 커스텀 코드 유지) */}
              {icon === 'home' && boardItems && boardItems.length > 0 && (
                <div ref={dropdownRef} style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  <button
                    type='button'
                    onClick={(e) => { e.stopPropagation(); setBoardMenuOpen(!boardMenuOpen); }}
                    style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    게시판
                    <Icon
                      id='arrow-drop-down'
                      icon={ArrowDropDownIcon}
                      className='column-header__board-icon'
                      style={{
                        marginRight: '8px',
                        transform: boardMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease-in-out',
                      }}
                    />
                  </button>

                  {/* 드롭다운 메뉴 본체 */}
                  {boardMenuOpen && (
                    <div style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      width: '100%', 
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: '4px', 
                      boxShadow: 'var(--dropdown-shadow)',
                      zIndex: 9999, 
                      overflow: 'hidden', 
                      marginTop: '4px' 
                    }}>
                      {boardItems.map((b: any, index: number) => (
                        <button
                          key={b.text}
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setBoardMenuOpen(false); 
                            b.action(); 
                          }}
                          style={{ 
                            display: 'block', 
                            width: '100%', 
                            padding: '12px', 
                            background: 'transparent', 
                            border: 'none', 
                            borderBottom: index === boardItems.length - 1 ? 'none' : '1px solid var(--color-border-primary)',
                            color: 'var(--color-text-primary)',
                            textAlign: 'center', 
                            cursor: 'pointer', 
                            fontSize: '14px',
                            transition: 'background-color 0.1s ease-in-out'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          {b.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
        )}

        {!hasTitle && backButton}

        {/* 기존의 추가 버튼과 접기 버튼 */}
        <div className='column-header__buttons' style={{ position: 'absolute', right: '15px' }}>
          {extraButton}
          {collapseButton}
        </div>
      </h1>

      <div
        className={collapsibleClassName}
        tabIndex={collapsed ? -1 : undefined}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className='column-header__collapsible-inner'>
          {(!collapsed || animating) && collapsedContent}
        </div>
      </div>

      {appendContent}
    </div>
  );

  if (placeholder) {
    return component;
  } else {
    return <ButtonInTabsBar>{component}</ButtonInTabsBar>;
  }
};

// eslint-disable-next-line import/no-default-export
export default ColumnHeader;
