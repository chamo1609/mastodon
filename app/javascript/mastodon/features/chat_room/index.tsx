import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { List as ImmutableList } from 'immutable';

import { useAppDispatch, useAppSelector } from 'mastodon/store';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import { Avatar } from 'mastodon/components/avatar';

import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';
import { expandConversationTimeline } from 'mastodon/actions/conversations';

import './chat_room.scss';

interface RouteParams {
  id: string;
}

const ChatRoom: React.FC = () => {
  const dispatch = useAppDispatch();
  const params = useParams<RouteParams>();
  const conversationId = params.id;

  useEffect(() => {
    if (conversationId) {
      dispatch(expandConversationTimeline(conversationId));
    }
  }, [dispatch, conversationId]);

  const conversation = useAppSelector((state: any) =>
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

  // ---- [핵심 수정] 멘션 대상자 및 타이틀 강제 추출 로직 ----
  let partnerNames = '대화';
  let mentionsStr = '';
  const partnerIds = new Set<string>();

  // 1. conversation 객체가 있으면 거기서 추출
  if (conversation) {
    conversation.get('accounts').forEach((id: string) => partnerIds.add(id));
  } 
  // 2. 객체가 증발했다면 화면에 뜬 채팅 내역(statuses)에서 나와 대화 중인 상대방을 긁어모음
  else if (statuses && statuses.size > 0) {
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

  // 추출된 상대방 ID를 기반으로 멘션 문자열과 헤더 이름을 구성
  if (partnerIds.size > 0) {
    mentionsStr = Array.from(partnerIds)
      .map(id => accounts.getIn([id, 'acct']))
      .filter(acct => acct)
      .map(acct => `@${acct}`)
      .join(' ');
    
    const names = Array.from(partnerIds)
      .map(id => accounts.getIn([id, 'display_name']) || accounts.getIn([id, 'username']))
      .filter(name => name);
      
    if (names.length > 0) {
      partnerNames = names.join(', ');
    }
  }

  // ---- 분리된 useEffect (안정성 강화) ----
  // 1. CSS 클래스와 변수 초기화는 마운트/언마운트 시에만 딱 한 번 실행
  useEffect(() => {
    document.body.classList.add('in-chat-room');
    return () => {
      document.body.classList.remove('in-chat-room');
      (window as any).chatRoomMentions = null;
      (window as any).chatRoomLastStatusId = null;
    };
  }, []);

  // 2. 상태 변동 시 전역 변수만 조용히 갱신
  useEffect(() => {
    if (mentionsStr) {
      (window as any).chatRoomMentions = `${mentionsStr} `;
    }
    if (statuses && statuses.size > 0) {
      (window as any).chatRoomLastStatusId = statuses.first().get('id');
    }
  }, [mentionsStr, statuses]);


  // ---- 데이터 가공 함수 ----
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
            
            return (
              <div key={status.get('id')} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom: '15px' }}>
                {!isMe && account && (
                  <div style={{ marginRight: '10px' }}>
                    <Avatar account={account} size={32} />
                  </div>
                )}
                <div style={{ 
                  maxWidth: '70%', 
                  backgroundColor: isMe ? 'var(--color-bg-brand-base)' : 'var(--color-bg-secondary)', 
                  padding: '10px', 
                  borderRadius: '8px' 
                }}>
                  <div 
                    className="status__content" 
                    style={{ color: isMe ? 'var(--color-text-on-brand-base)' : 'var(--color-text-primary)' }}
                    dangerouslySetInnerHTML={{ __html: cleanHtml }} 
                  />
                </div>
              </div>
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