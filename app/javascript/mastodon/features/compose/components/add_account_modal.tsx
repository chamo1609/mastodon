import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'mastodon/components/button';
import { saveAccount } from '@/mastodon/utils/multi_account';
import type { AccountData } from '@/mastodon/utils/multi_account';

interface AddAccountModalProps {
  onClose: () => void;
  onSuccess: (account: AccountData) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSuccess }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorText(null);

    try {
      const response = await fetch('/api/v1/accounts/verify_credentials', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token.trim()}` }
      });

      if (!response.ok) {
        throw new Error('토큰이 올바르지 않거나 권한이 없습니다. 다시 확인해 주세요.');
      }

      const data = await response.json();
      
      const newAccount = {
        id: data.id,
        username: data.username,
        acct: data.acct,
        avatar: data.avatar,
        token: token.trim(),
      };

      saveAccount(newAccount);
      onSuccess(newAccount);
    } catch (error: any) {
      setErrorText(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div style={overlayStyle}>
      <div style={formContainerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>새 계정 연결하기</h1>
          
          {/* 토큰 발급 안내 박스 추가 */}
          <div style={instructionBoxStyle}>
            <p style={instructionTitleStyle}>💡 액세스 토큰 발급 방법</p>
            <ol style={instructionListStyle}>
              <li>브라우저 <b>시크릿 창</b>을 열어 추가할 계정으로 로그인합니다.</li>
              <li><b>[환경설정] → [개발] → [새로운 애플리케이션]</b>으로 이동합니다.</li>
              <li>애플리케이션 이름(예: 부계정)을 입력합니다.</li>
              <li><b>[read], [profile], [write], [follwe]</b>에 모두 체크합니다.</li>
              <li><b>[제출]</b> 버튼을 누릅니다.</li>
              <li>생성된 어플리케이션을 클릭한 뒤, 상단의 <b>'액세스 토큰'</b>을 복사합니다.</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={inputGroupStyle}>
            <label style={labelStyle}>액세스 토큰</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              style={inputStyle}
              placeholder="복사한 토큰을 여기에 붙여넣으세요"
              disabled={isLoading}
              autoFocus
              required
            />
          </div>

          {errorText && (
            <div style={errorStyle}>
              {errorText}
            </div>
          )}

          <div style={actionsStyle}>
            <Button text="취소" onClick={onClose} disabled={isLoading} secondary />
            <Button text="연결하기" type="submit" disabled={isLoading} loading={isLoading} />
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// --- 이하 CSS 스타일 객체 ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'var(--color-bg-media)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, backdropFilter: 'blur(2px)',
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-primary)', borderRadius: '4px',
  width: '100%', maxWidth: '500px', /* 안내문 공간을 위해 너비를 살짝 늘렸습니다 */
  boxShadow: '0 0 15px rgba(0,0,0,0.2)', overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '30px 30px 20px', textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)', fontSize: '24px',
  fontWeight: 500, margin: '0 0 20px',
};

// --- 신규 안내문 스타일 ---
const instructionBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-secondary)', // 살짝 어두운 배경으로 구별감을 줍니다.
  border: '1px solid var(--color-border-primary)',
  borderRadius: '4px',
  padding: '16px',
  textAlign: 'left', // 읽기 편하게 좌측 정렬합니다.
};

const instructionTitleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
};

const instructionListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '24px',
  fontSize: '13px',
  color: 'var(--color-text-secondary)',
  lineHeight: '1.6',
  listStyleType: 'decimal',
};
// -----------------------

const formStyle: React.CSSProperties = { padding: '0 30px 30px' };
const inputGroupStyle: React.CSSProperties = { marginBottom: '20px' };

const labelStyle: React.CSSProperties = {
  display: 'block', color: 'var(--color-text-tertiary)',
  fontSize: '14px', fontWeight: 500, marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  padding: '10px 16px', fontSize: '16px', color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)',
  borderRadius: '4px', outline: 'none', transition: 'border-color 0.2s ease',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--color-text-error)', backgroundColor: 'var(--color-bg-error-softer)',
  padding: '12px', borderRadius: '4px', fontSize: '14px',
  marginBottom: '20px', textAlign: 'center',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: '20px',
};