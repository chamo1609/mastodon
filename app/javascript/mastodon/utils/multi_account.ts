// app/javascript/mastodon/utils/multi_account.ts

const STORAGE_KEY = 'mastodon_multi_accounts';

// 1. 저장할 계정 정보의 '타입(형태)'을 정의합니다.
export interface AccountData {
  id: string;
  username: string;
  acct: string;
  avatar: string;
  token: string;
}

// 2. 저장된 모든 계정 목록을 불러오는 함수 (반환값이 AccountData 배열임을 명시)
export const getSavedAccounts = (): AccountData[] => {
  const accountsJson = localStorage.getItem(STORAGE_KEY);
  if (!accountsJson) return [];
  try {
    return JSON.parse(accountsJson) as AccountData[];
  } catch (e) {
    console.error('계정 정보를 불러오는 중 에러가 발생했습니다.', e);
    return [];
  }
};

// 3. 현재 로그인된 계정 정보를 저장하거나 업데이트하는 함수
// 매개변수 accountData가 우리가 위에서 정의한 AccountData 형태임을 알려줍니다.
export const saveAccount = (accountData: AccountData): void => {
  const accounts = getSavedAccounts();
  
  // 이미 저장된 계정인지 확인 (ID로 구분)
  const existingIndex = accounts.findIndex(acc => acc.id === accountData.id);
  
  if (existingIndex >= 0) {
    // 이미 있다면 최신 정보로 덮어쓰기
    accounts[existingIndex] = { ...accounts[existingIndex], ...accountData };
  } else {
    // 새로운 계정이라면 목록에 추가
    accounts.push(accountData);
  }

  // 다시 localStorage에 문자열로 저장
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
};

// 4. 특정 계정을 목록에서 삭제하는 함수
// 매개변수 accountId가 문자열(string) 형태임을 알려줍니다.
export const removeAccount = (accountId: string): void => {
  const accounts = getSavedAccounts();
  const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredAccounts));
};