import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { List as ImmutableList } from 'immutable';

import { useAppDispatch, useAppSelector } from 'mastodon/store';
import Column from 'mastodon/components/column';
import ColumnHeader from 'mastodon/components/column_header';
import { Avatar } from 'mastodon/components/avatar';

import ComposeFormContainer from 'mastodon/features/compose/containers/compose_form_container';
import { expandConversationTimeline } from 'mastodon/actions/conversations';

interface RouteParams {
  id: string;
}

const ChatRoom: React.FC = () => {
  const dispatch = useAppDispatch();
  const params = useParams<RouteParams>();
  const conversationId = params.id;

  // 1. 방 진입 시 서버에 데이터 호출
  useEffect(() => {
    if (conversationId) {
      dispatch(expandConversationTimeline(conversationId));
    }
  }, [dispatch, conversationId]);

  // 2. Redux 상태 가져오기
  const conversation = useAppSelector((state: any) =>
    state.getIn(['conversations', 'items']).find((x: any) => x.get('id') === conversationId)
  );

  const timeline = useAppSelector((state: any) =>
    conversationId ? state.getIn(['conversations', 'timelines', conversationId]) : null
  );

  const accounts = useAppSelector((state: any) => state.get('accounts'));
  const me = useAppSelector((state: any) => state.getIn(['meta', 'me']));

  // 3. [오류 수정] statuses를 먼저 선언해야 아래의 useEffect에서 사용할 수 있습니다.
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

  // 4. 전송 가로채기를 위한 전역 변수 설정 (statuses 선언 이후로 위치 이동)
  useEffect(() => {
    if (conversation && accounts) {
      const targetIds = conversation.get('accounts');
      const mentions = targetIds.map((id: string) => `@${accounts.getIn([id, 'acct'])}`).join(' ') + ' ';
      
      (window as any).chatRoomMentions = mentions;

      if (statuses && statuses.size > 0) {
        (window as any).chatRoomLastStatusId = statuses.first().get('id');
      }
    }

    return () => {
      (window as any).chatRoomMentions = undefined;
      (window as any).chatRoomLastStatusId = undefined;
    };
  }, [conversation, accounts, statuses]);

  // ---- 사이드바 글쓰기 모듈 숨기기 ----
  useEffect(() => {
    // 동적으로 스타일 태그를 생성하여 문서(Head)에 주입합니다.
    const style = document.createElement('style');
    style.id = 'hide-side-compose-panel';
    style.innerHTML = `
      /* 마스토돈 기본 글쓰기 패널을 화면에서 완전히 숨깁니다 */
      .compose-panel {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const injectedStyle = document.getElementById('hide-side-compose-panel');
      if (injectedStyle) {
        document.head.removeChild(injectedStyle);
      }
    };
  }, []);

  // 5. 헤더 이름 설정
  let partnerNames = '대화';
  if (conversation) {
    partnerNames = conversation.get('accounts')
      .map((id: string) => accounts.getIn([id, 'display_name']) || accounts.getIn([id, 'username']))
      .join(', ');
  }

  // 6. UI 렌더링 (CSS 변수 적용)
  return (
    <Column>
      <ColumnHeader showBackButton title={partnerNames} />
      <div className="chat-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column-reverse' }}>
        {statuses.map((status: any) => {
          const isMe = status.get('account') === me;
          const account = accounts.get(status.get('account'));
          
          // 서버에서 전달받은 원본 HTML 데이터
          let cleanHtml = status.get('contentHtml') || '';
          
          // DOMParser를 사용하여 문자열을 조작 가능한 HTML 트리 노드로 변환합니다.
          const parser = new DOMParser();
          const doc = parser.parseFromString(cleanHtml, 'text/html');
          
          // 마스토돈 본문의 첫 번째 문단(<p>)을 식별합니다.
          const firstParagraph = doc.querySelector('p');
          if (firstParagraph) {
            // 문단의 맨 앞부터 순회하며 멘션 관련 노드를 제거합니다.
            while (firstParagraph.firstChild) {
              const child = firstParagraph.firstChild;
              
              // 1. 요소가 HTML 태그(ELEMENT_NODE)이고 'h-card' 클래스를 가진 경우 (멘션 링크)
              if (child.nodeType === Node.ELEMENT_NODE && (child as Element).classList.contains('h-card')) {
                firstParagraph.removeChild(child);
              } 
              // 2. 요소가 단순 텍스트(TEXT_NODE)이고 공백 문자열인 경우 (멘션 간의 띄어쓰기)
              else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() === '') {
                firstParagraph.removeChild(child);
              } 
              // 3. 실제 대화 내용(일반 텍스트나 다른 태그)이 시작되면 루프를 중단합니다.
              else {
                break;
              }
            }
          }
          
          // 가공이 완료된 HTML 트리를 다시 문자열로 변환하여 렌더링 준비를 마칩니다.
          cleanHtml = doc.body.innerHTML;
          
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
                color: isMe ? 'var(--color-text-on-brand-base)' : 'var(--color-text-primary)',
                padding: '10px', 
                borderRadius: '8px' 
              }}>
                <div className="status__content" dangerouslySetInnerHTML={{ __html: cleanHtml }} />
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
    </Column>
  );
};

export default ChatRoom;