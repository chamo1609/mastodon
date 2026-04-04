import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { List as ImmutableList } from 'immutable';

import { useAppDispatch, useAppSelector } from 'mastodon/store';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import { Avatar } from 'mastodon/components/avatar';

import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';
import { expandConversationTimeline } from 'mastodon/actions/conversations';

import MediaGallery from 'mastodon/components/media_gallery';
import { Poll } from 'mastodon/components/poll';

import './chat_room.scss';

interface RouteParams {
  id: string;
}

const ChatMessageBubble: React.FC<{
  status: any;
  isMe: boolean;
  account: any;
  cleanHtml: string;
  pollId: string | null;
  timeString: string;
  dateString: string;
  showDateDivider: boolean;
}> = ({ status, isMe, account, cleanHtml, pollId, timeString, dateString, showDateDivider }) => {
  const history = useHistory();
  
  const spoilerText = status.get('spoiler_text');
  const hasSpoiler = spoilerText && spoilerText.length > 0;
  
  const [isRevealed, setIsRevealed] = useState(!hasSpoiler);
  const mediaAttachments = status.get('media_attachments');

  // 말풍선 클릭 시 상세 페이지 이동
  const handleBubbleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('a, button, input, label, img, video, .chat-poll-area, .media-gallery');

    if (!isInteractive) {
      const acct = account.get('acct');
      const statusId = status.get('id');
      history.push(`/@${acct}/${statusId}`);
    }
  };

  // 아바타 클릭 시 프로필 페이지 이동
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const acct = account.get('acct');
    history.push(`/@${acct}`);
  };

  return (
    <React.Fragment>
      <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '15px', alignItems: 'flex-start' }}>
        
        {/* 아바타 영역 (클릭 이벤트 적용) */}
        {!isMe && account && (
          <div 
            style={{ marginRight: '10px', cursor: 'pointer' }} 
            onClick={handleAvatarClick}
            title={account.get('display_name') || account.get('username')}
          >
            <Avatar account={account} size={32} />
          </div>
        )}
        
        {/* 말풍선과 시간을 묶는 래퍼 */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMe ? 'row-reverse' : 'row', 
          alignItems: 'flex-end', 
          gap: '6px', 
          maxWidth: '85%' 
        }}>
          
          {/* 말풍선 */}
          <div 
            className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--partner'}`}
            onClick={handleBubbleClick}
            style={{ cursor: 'pointer', flexShrink: 1, minWidth: 0 }} 
          >
            {hasSpoiler && (
              <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                borderBottom: isRevealed ? '1px solid rgba(128, 128, 128, 0.3)' : 'none',
                paddingBottom: isRevealed ? '8px' : '0'
              }}>
                <span style={{ fontWeight: 'bold' }}>{spoilerText}</span>
                <button
                  onClick={() => setIsRevealed(!isRevealed)}
                  style={{
                    background: 'rgba(128, 128, 128, 0.2)', border: 'none', borderRadius: '4px',
                    padding: '4px 8px', cursor: 'pointer', color: 'inherit', fontSize: '0.85em', fontWeight: 'bold'
                  }}
                >
                  {isRevealed ? '숨기기' : '더 보기'}
                </button>
              </div>
            )}

            {isRevealed && (
              <>
                {cleanHtml.length > 0 && (
                  <div className="status__content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                )}
                {mediaAttachments && mediaAttachments.size > 0 && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                    <MediaGallery media={mediaAttachments} height={200} />
                  </div>
                )}
                {pollId && (
                  <div className="chat-poll-area" style={{ marginTop: '5px' }}>
                    <Poll pollId={pollId} status={status} />
                  </div>
                )}
              </>
            )}
          </div>

          {/* 시간 표시 */}
          <span className="chat-message-time">
            {timeString}
          </span>
        </div>
      </div>

      {/* 날짜 구분선 (column-reverse 구조이므로 시각적으로 말풍선 상단에 위치하게 됩니다) */}
      {showDateDivider && (
        <div className="chat-date-divider">
          <span>{dateString}</span>
        </div>
      )}
    </React.Fragment>
  );
};

const ChatRoom: React.FC = () => {
  const dispatch = useAppDispatch();
  const params = useParams<RouteParams>();
  const conversationId = params.id;

  useEffect(() => {
    if (conversationId) {
      dispatch(expandConversationTimeline(conversationId));

      const syncInterval = setInterval(() => {
        dispatch(expandConversationTimeline(conversationId));
      }, 3000);

      return () => {
        clearInterval(syncInterval);
      };
    }
  }, [dispatch, conversationId]);

  const currentConversation = useAppSelector((state: any) =>
    state.getIn(['conversations', 'items']).find((x: any) => x.get('id') === conversationId)
  );

  const timeline = useAppSelector((state: any) =>
    conversationId ? state.getIn(['conversations', 'timelines', conversationId]) : null
  );

  const accounts = useAppSelector((state: any) => state.get('accounts'));
  const me = useAppSelector((state: any) => state.getIn(['meta', 'me']));

  const statuses = useAppSelector((state: any) => {
    if (timeline && timeline.get('items')) {
      return timeline.get('items')
        .map((id: string) => state.getIn(['statuses', id]))
        .filter((x: any) => !!x)
        .sort((a: any, b: any) => {
          const aId = a.get('id');
          const bId = b.get('id');
          return aId > bId ? -1 : (aId < bId ? 1 : 0);
        });
    }
    return ImmutableList();
  });

  const { partnerNames, mentionsStr } = useMemo(() => {
    let pNames = '대화';
    let mStr = '';
    const partnerIds = new Set<string>();

    if (currentConversation) {
      currentConversation.get('accounts').forEach((id: string) => partnerIds.add(id));
    } else if (statuses && statuses.size > 0) {
      statuses.forEach((status: any) => {
        const accountId = status.get('account');
        if (accountId && accountId !== me) partnerIds.add(accountId);
        
        const mentionsList = status.get('mentions');
        if (mentionsList) {
          mentionsList.forEach((m: any) => {
            const mId = m.get('id');
            if (mId && mId !== me) partnerIds.add(mId);
          });
        }
      });
    }

    if (partnerIds.size > 0) {
      mStr = Array.from(partnerIds)
        .map(id => accounts.getIn([id, 'acct']))
        .filter(acct => acct)
        .map(acct => `@${acct}`)
        .join(' ');
      
      const names = Array.from(partnerIds)
        .map(id => accounts.getIn([id, 'display_name']) || accounts.getIn([id, 'username']))
        .filter(name => name);
        
      if (names.length > 0) {
        pNames = names.join(', ');
      }
    }

    return { partnerNames: pNames, mentionsStr: mStr };
  }, [currentConversation, statuses, accounts, me]);

  useEffect(() => {
    document.body.classList.add('in-chat-room');
    return () => {
      document.body.classList.remove('in-chat-room');
      (window as any).chatRoomMentions = null;
      (window as any).chatRoomLastStatusId = null;
    };
  }, []);

  useEffect(() => {
    if (mentionsStr) {
      (window as any).chatRoomMentions = `${mentionsStr} `;
    }
    if (statuses && statuses.size > 0) {
      (window as any).chatRoomLastStatusId = statuses.first().get('id');
    }
  }, [mentionsStr, statuses]);

  const getCleanedHtml = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const mentions = doc.querySelectorAll('.h-card');
    
    mentions.forEach(mention => {
      let hasPrecedingText = false;
      let prev = mention.previousSibling;
      
      while (prev) {
        if (prev.nodeType === Node.TEXT_NODE && prev.textContent?.trim() !== '') {
          hasPrecedingText = true;
          break;
        }
        if (prev.nodeType === Node.ELEMENT_NODE) {
          hasPrecedingText = true;
          break;
        }
        prev = prev.previousSibling;
      }

      if (!hasPrecedingText) {
        if (mention.nextSibling?.nodeType === Node.TEXT_NODE && mention.nextSibling.textContent?.trim() === '') {
          mention.nextSibling.remove();
        }
        mention.remove();
      }
    });

    return doc.body.innerHTML.trim();
  };

  return (
    <Column>
      <div className="chat-room-unified-box">
        <ColumnHeader showBackButton title={partnerNames} />
        
        <div className="chat-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column-reverse' }}>
          {statuses.map((status: any, index: number) => {
            const isMe = status.get('account') === me;
            const account = accounts.get(status.get('account'));
            const cleanHtml = getCleanedHtml(status.get('contentHtml') || '');
            const pollData = status.get('poll');
            const pollId = pollData ? (typeof pollData === 'string' ? pollData : pollData.get('id')) : null;
            
            // 날짜 및 시간 계산 로직
            const createdAt = status.get('created_at');
            const dateObj = new Date(createdAt);
            
            const timeString = dateObj.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

            const nextStatus = statuses.get(index + 1);
            let showDateDivider = false;

            if (nextStatus) {
              const nextDateObj = new Date(nextStatus.get('created_at'));
              const nextDateString = nextDateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
              
              if (dateString !== nextDateString) {
                showDateDivider = true;
              }
            } else {
              showDateDivider = true;
            }

            return (
              <ChatMessageBubble 
                key={status.get('id')}
                status={status}
                isMe={isMe}
                account={account}
                cleanHtml={cleanHtml}
                pollId={pollId}
                timeString={timeString}
                dateString={dateString}
                showDateDivider={showDateDivider}
              />
            );
          })}
        </div>

        <div className="chat-compose-area" style={{ flexShrink: 0, borderTop: '1px solid var(--color-border-primary)', backgroundColor: 'var(--color-bg-primary)' }}>
          <ComposeFormContainer />
        </div>
      </div>
    </Column>
  );
};

export default ChatRoom;