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

// ---- 1. 개별 말풍선 컴포넌트 (ChatMessageBubble) ----
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

  const handleBubbleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('a, button, input, label, img, video, .chat-poll-area, .media-gallery');

    if (!isInteractive) {
      const acct = account.get('acct');
      const statusId = status.get('id');
      history.push(`/@${acct}/${statusId}`);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const acct = account.get('acct');
    history.push(`/@${acct}`);
  };

  return (
    <React.Fragment>
      {/* 2. 말풍선 본체 */}
      <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '15px', alignItems: 'flex-start' }}>
        {!isMe && account && (
          <div style={{ marginRight: '10px', cursor: 'pointer', flexShrink: 0 }} onClick={handleAvatarClick}>
            <Avatar account={account} size={32} />
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', minWidth: 0 }}>
          {!isMe && account && (
            <div className="chat-nickname" onClick={handleAvatarClick} style={{ cursor: 'pointer', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {account.get('display_name') || account.get('username')}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '6px', width: '100%' }}>
            <div className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--partner'}`} onClick={handleBubbleClick} style={{ cursor: 'pointer', flexShrink: 1, minWidth: 0 }}>
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
                  {cleanHtml.length > 0 && <div className="status__content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />}
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
            <span className="chat-message-time">{timeString}</span>
          </div>
        </div>
      </div>

      {/* 1. 날짜 구분선 (column-reverse 특성상 아래에 배치해야 화면 최상단에 뜹니다) */}
      {showDateDivider && (
        <div className="chat-date-divider">
          <span>{dateString}</span>
        </div>
      )}
    </React.Fragment>
  );
};

// ---- 2. 메인 채팅방 컴포넌트 (ChatRoom) ----
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
      return () => clearInterval(syncInterval);
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
        .sort((a: any, b: any) => a.get('id') > b.get('id') ? -1 : 1);
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
      });
    }

    if (partnerIds.size > 0) {
      mStr = Array.from(partnerIds).map(id => `@${accounts.getIn([id, 'acct'])}`).join(' ');
      const names = Array.from(partnerIds).map(id => accounts.getIn([id, 'display_name']) || accounts.getIn([id, 'username']));
      if (names.length > 0) pNames = names.join(', ');
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
    if (mentionsStr) (window as any).chatRoomMentions = `${mentionsStr} `;
    if (statuses && statuses.size > 0) (window as any).chatRoomLastStatusId = statuses.first().get('id');
  }, [mentionsStr, statuses]);

  const getCleanedHtml = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('.h-card').forEach(mention => {
      let hasPrecedingText = false;
      let prev = mention.previousSibling;
      while (prev) {
        if (prev.nodeType === Node.TEXT_NODE && prev.textContent?.trim() !== '') { hasPrecedingText = true; break; }
        if (prev.nodeType === Node.ELEMENT_NODE) { hasPrecedingText = true; break; }
        prev = prev.previousSibling;
      }
      if (!hasPrecedingText) {
        if (mention.nextSibling?.nodeType === Node.TEXT_NODE && mention.nextSibling.textContent?.trim() === '') mention.nextSibling.remove();
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
            
            const createdAt = status.get('created_at');
            const dateObj = new Date(createdAt);
            const timeString = dateObj.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
            const dateString = dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

            const nextStatus = statuses.get(index + 1);
            let showDateDivider = false;

            if (nextStatus) {
              const nextDateString = new Date(nextStatus.get('created_at')).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
              if (dateString !== nextDateString) showDateDivider = true;
            } else {
              showDateDivider = true; // 최초 메시지 상단 구분선 활성화
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