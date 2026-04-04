import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom'; // useHistory 추가
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

// ---- 개별 말풍선 상태를 관리하는 하위 컴포넌트 ----
const ChatMessageBubble: React.FC<{
  status: any;
  isMe: boolean;
  account: any;
  cleanHtml: string;
  pollId: string | null;
}> = ({ status, isMe, account, cleanHtml, pollId }) => {
  const history = useHistory();
  
  const spoilerText = status.get('spoiler_text');
  const hasSpoiler = spoilerText && spoilerText.length > 0;
  
  const [isRevealed, setIsRevealed] = useState(!hasSpoiler);
  const mediaAttachments = status.get('media_attachments');

  // 클릭 이벤트 핸들러 추가
  const handleBubbleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 클릭된 요소가 상호작용 가능한 컴포넌트 내부인지 확인하여 우선순위를 보장합니다.
    const isInteractive = target.closest('a, button, input, label, img, video, .chat-poll-area, .media-gallery');

    if (!isInteractive) {
      const acct = account.get('acct');
      const statusId = status.get('id');
      history.push(`/@${acct}/${statusId}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '15px' }}>
      {!isMe && account && (
        <div style={{ marginRight: '10px' }}>
          <Avatar account={account} size={32} />
        </div>
      )}
      
      <div 
        className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--partner'}`}
        onClick={handleBubbleClick}
        style={{ cursor: 'pointer' }} // 클릭 가능한 요소임을 나타냄
      >
        
        {/* CW 경고문 및 토글 버튼 */}
        {hasSpoiler && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start',
            gap: '8px',
            borderBottom: isRevealed ? '1px solid rgba(128, 128, 128, 0.3)' : 'none',
            paddingBottom: isRevealed ? '8px' : '0'
          }}>
            <span style={{ fontWeight: 'bold' }}>{spoilerText}</span>
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              style={{
                background: 'rgba(128, 128, 128, 0.2)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                color: 'inherit',
                fontSize: '0.85em',
                fontWeight: 'bold'
              }}
            >
              {isRevealed ? '숨기기' : '더 보기'}
            </button>
          </div>
        )}

        {/* 본문, 미디어, 투표 */}
        {isRevealed && (
          <>
            {cleanHtml.length > 0 && (
              <div 
                className="status__content" 
                dangerouslySetInnerHTML={{ __html: cleanHtml }} 
              />
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
    </div>
  );
};
// --------------------------------------------------------

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
          {statuses.map((status: any) => {
            const isMe = status.get('account') === me;
            const account = accounts.get(status.get('account'));
            
            const cleanHtml = getCleanedHtml(status.get('contentHtml') || '');
            
            const pollData = status.get('poll');
            const pollId = pollData ? (typeof pollData === 'string' ? pollData : pollData.get('id')) : null;
            
            return (
              <ChatMessageBubble 
                key={status.get('id')}
                status={status}
                isMe={isMe}
                account={account}
                cleanHtml={cleanHtml}
                pollId={pollId}
              />
            );
          })}
        </div>

        <div className="chat-compose-area" style={{ 
          flexShrink: 0, 
          borderTop: '1px solid var(--color-border-primary)', 
          backgroundColor: 'var(--color-bg-primary)' 
        }}>
          <ComposeFormContainer />
        </div>
      </div>
    </Column>
  );
};

export default ChatRoom;