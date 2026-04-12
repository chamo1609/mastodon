import { useCallback, useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

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
import SettingsIcon from '@/material-icons/400-24px/settings.svg?react';
import type { IconProp } from 'mastodon/components/icon';
import { Icon } from 'mastodon/components/icon';
import { ButtonInTabsBar } from 'mastodon/features/ui/util/columns_context';
import { useIdentity } from 'mastodon/identity_context';

import { useColumnIndexContext } from '../features/ui/components/columns_area';
import { getColumnSkipLinkId } from '../features/ui/components/skip_links';

import { useAppHistory } from './router';

// 액션 불러오기
import { fetchBookmarkedStatuses } from 'mastodon/actions/bookmarks';
import { fetchBookmarkFolders } from 'mastodon/actions/bookmark_folders';
import { openModal } from 'mastodon/actions/modal';

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
  title?: React.ReactNode;
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
  const dispatch = useDispatch();

  useEffect(() => {
    const updateBoardContext = (path: string) => {
      if (path.startsWith('/tags/')) {
        const tag = path.split('/')[2];
        if (tag) {
          sessionStorage.setItem('chamomile_board', tag);
        }
      } else if (!path.startsWith('/publish') && !path.startsWith('/statuses/new')) {
        sessionStorage.removeItem('chamomile_board');
      }
    };

    updateBoardContext(history.location.pathname);
    const unlisten = history.listen((location) => {
      updateBoardContext(location.pathname);
    });

    return () => unlisten();
  }, [history]);
  
  const [collapsed, setCollapsed] = useState(true);
  const [animating, setAnimating] = useState(false);

  const boards = useSelector((state: any) => state.getIn(['meta', 'chamomile_boards']));
  const boardItems = (boards?.toJS ? boards.toJS() : boards || []).map((b: any) => ({
    text: b.name,
    action: () => history.push(`/tags/${b.tag}`),
  }));

  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [bookmarkMenuOpen, setBookmarkMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const bookmarkFolders = useSelector((state: any) => state.bookmark_folders?.get('items'));
  const [currentBookmarkFolder, setCurrentBookmarkFolder] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (icon === 'bookmarks') {
      dispatch(fetchBookmarkFolders() as any);
    }
  }, [icon, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setBoardMenuOpen(false);
        setBookmarkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBookmarkFolder = useCallback((folderId: number | null, folderName: string | null) => {
    setCurrentBookmarkFolder(folderId && folderName ? { id: folderId, name: folderName } : null);
    setBookmarkMenuOpen(false);
    
    dispatch((fetchBookmarkedStatuses as any)(folderId));
  }, [dispatch]);

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

  const isHomeBoard = icon === 'home' && boardItems && boardItems.length > 0;

  const component = (
    <div className={wrapperClassName} ref={dropdownRef}>
      <h1 className={buttonClassName} style={{ padding: 0, display: 'flex' }}>
        {hasTitle && (
          <div style={{ display: 'flex', flex: 1, width: '100%', alignItems: 'stretch' }}>
            {backButton}

            <div style={{ display: 'flex', width: '100%' }}>
              {onClick ? (
                <button
                  onClick={handleTitleClick}
                  className='column-header__title'
                  type='button'
                  id={getColumnSkipLinkId(columnIndex)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRight: isHomeBoard ? '1px solid rgba(127,127,127,0.2)' : 'none'
                  }}
                >
                  {titleContents}
                </button>
              ) : (
                <span
                  className='column-header__title'
                  tabIndex={-1}
                  id={getColumnSkipLinkId(columnIndex)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: isHomeBoard ? 'center' : 'flex-start',
                    alignItems: 'center',
                    borderRight: isHomeBoard ? '1px solid rgba(127,127,127,0.2)' : 'none'
                  }}
                >
                  {titleContents}
                </span>
              )}

              {/* 홈 게시판 드롭다운 */}
              {isHomeBoard && (
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
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

                  {boardMenuOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', borderRadius: '4px', boxShadow: 'var(--dropdown-shadow)', zIndex: 9999, overflow: 'hidden', marginTop: '4px' }}>
                      {boardItems.map((b: any, index: number) => (
                        <button
                          key={b.text}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setBoardMenuOpen(false); b.action(); }}
                          style={{ display: 'block', width: '100%', padding: '12px', background: 'transparent', border: 'none', borderBottom: index === boardItems.length - 1 ? 'none' : '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)', textAlign: 'center', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.1s ease-in-out' }}
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
          </div>
        )}

        {!hasTitle && backButton}

        <div className='column-header__buttons' style={{ position: 'absolute', right: '15px' }}>
          {extraButton}
          {collapseButton}
        </div>
      </h1>

      {/* ========================================== */}
      {/* 마스토돈 순정 알림 탭 구조 적용 (notification__filter-bar) */}
      {/* ========================================== */}
      {icon === 'bookmarks' && (
        <div className='notification__filter-bar' style={{ position: 'relative', zIndex: 2 }}>
          <button
            type='button'
            className={currentBookmarkFolder === null ? 'active' : ''}
            onClick={() => handleSelectBookmarkFolder(null, null)}
          >
            전체 북마크
          </button>
          
          <button
            type='button'
            className={currentBookmarkFolder !== null ? 'active' : ''}
            onClick={(e) => { e.stopPropagation(); setBookmarkMenuOpen(!bookmarkMenuOpen); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            {currentBookmarkFolder ? currentBookmarkFolder.name : '폴더 선택'}
            <Icon
              id='arrow-drop-down'
              icon={ArrowDropDownIcon}
              style={{
                width: '18px',
                height: '18px',
                fill: 'currentColor',
                transform: bookmarkMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          </button>

          {/* 폴더 선택 드롭다운 UI (버튼들을 flex 레이아웃에서 독립시키기 위해 absolute 처리) */}
          {bookmarkMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: '50%', // 우측 버튼의 너비와 맞춤
              background: 'var(--color-bg-primary)',
              border: '1px solid var(--color-border-primary)',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              boxShadow: 'var(--dropdown-shadow)',
              zIndex: 9999,
              overflow: 'hidden',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBookmarkMenuOpen(false);
                  dispatch(openModal({ 
                    modalType: 'BOOKMARK_FOLDER_MANAGEMENT', 
                    modalProps: {} 
                  } as any));
                }}
                style={{
                  display: 'flex', width: '100%', padding: '12px', background: 'var(--color-bg-secondary)', border: 'none',
                  borderBottom: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)',
                  justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '14px', gap: '8px'
                }}
              >
                <Icon id='settings' icon={SettingsIcon} style={{ width: '18px', height: '18px' }} />
                북마크 폴더 관리
              </button>
              {bookmarkFolders && bookmarkFolders.size > 0 ? bookmarkFolders.map((folder: any, index: number) => (
                <button
                  key={folder.get('id')}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectBookmarkFolder(folder.get('id'), folder.get('name'));
                  }}
                  style={{
                    display: 'block', width: '100%', padding: '12px', background: 'transparent', border: 'none',
                    borderBottom: index === bookmarkFolders.size - 1 ? 'none' : '1px solid var(--color-border-primary)',
                    color: 'var(--color-text-primary)', textAlign: 'center', cursor: 'pointer', fontSize: '14px',
                    transition: 'background-color 0.1s ease-in-out'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {folder.get('name')}
                </button>
              )) : (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  폴더가 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

export default ColumnHeader;