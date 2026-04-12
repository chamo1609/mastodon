import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FormattedMessage } from 'react-intl';
import classNames from 'classnames';
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
    if (token.trim().length === 0) return;

    setIsLoading(true);
    setErrorText(null);

    try {
      const response = await fetch('/api/v1/accounts/verify_credentials', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token.trim()}` }
      });

      if (!response.ok) {
        throw new Error('토큰이 올바르지 않거나 권한이 없습니다.');
      }

      const data = await response.json();
      
      const newAccount: AccountData = {
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
    <div className='modal-root'>      
      <div className='modal-root__overlay' onClick={onClose} />
            <div className='modal-root__container' onClick={onClose}>
        
        <div 
          className={classNames('modal-root__modal', 'safety-action-modal')} 
          onClick={e => e.stopPropagation()}
          style={{ backgroundColor: 'var(--color-bg-primary)', borderRadius: '8px' }}
        >
          
          <div className='safety-action-modal__top'>
            <div className='safety-action-modal__confirmation'>
              
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
                새 계정 연결하기
              </h1>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
                아래 안내에 따라 발급받은 액세스 토큰을 입력하세요.
              </p>

              <div style={{ backgroundColor: 'var(--color-bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
                <strong style={{ display: 'block', marginBottom: '10px', color: 'var(--color-text-primary)' }}>💡 액세스 토큰 발급 방법</strong>
                <ol style={{ paddingLeft: '24px', margin: 0, listStyleType: 'decimal', color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                  <li>브라우저 <b>시크릿 창</b>을 열어 추가할 계정으로 로그인합니다.</li>
                  <li><b>[환경설정] → [개발] → [새로운 애플리케이션]</b>으로 이동합니다.</li>
                  <li>애플리케이션 이름(예: 부계정)을 입력합니다.</li>
                  <li><b>[read], [profile], [write]</b>에 체크합니다.</li>
                  <li><b>[제출]</b> 버튼을 누릅니다.</li>
                  <li>생성된 어플리케이션을 클릭한 뒤, 상단의 <b>'액세스 토큰'</b>을 복사합니다.</li>
                </ol>
              </div>

              <form onSubmit={handleSubmit} style={{ margin: 0 }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
                    액세스 토큰
                  </label>
                  <input
                    type='password'
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder='복사한 토큰을 여기에 붙여넣으세요'
                    disabled={isLoading}
                    autoFocus
                    className='setting-text'
                    style={{ 
                      width: '100%',             
                      boxSizing: 'border-box',   
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      border: 'none', 
                      borderRadius: '8px',
                      padding: '12px 16px',
                      outline: 'none'
                    }}
                  />
                </div>

                {errorText && (
                  <div style={{ color: 'var(--color-text-error)', marginTop: '12px', fontSize: '14px', textAlign: 'left' }}>
                    {errorText}
                  </div>
                )}
              </form>

            </div>
          </div>

          <div className='safety-action-modal__bottom'>
            <div className='safety-action-modal__actions'>
              <Button secondary onClick={onClose} disabled={isLoading}>
                <FormattedMessage id='confirmation_modal.cancel' defaultMessage='Cancel' />
              </Button>
              <Button onClick={handleSubmit} disabled={token.trim().length === 0 || isLoading} loading={isLoading}>
                연결하기
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddAccountModal;