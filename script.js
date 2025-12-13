// Demo data for staking portfolio
const portfolioData = [
  {
    symbol: 'BTC',
    label: '비트코인 (BTC)',
    network: '비트코인 메인넷',
    color: '#f97316',
    bg: '#ffedd5',
    amount: 1.2,
    usd: 14500,
    percent: 52,
  },
  {
    symbol: 'ETH',
    label: '이더리움 (ETH)',
    network: '이더리움 메인넷',
    color: '#4f46e5',
    bg: '#e0e7ff',
    amount: 8.3,
    usd: 9300,
    percent: 33,
  },
  {
    symbol: 'XRP',
    label: '리플 (XRP)',
    network: '리플 네트워크',
    color: '#06b6d4',
    bg: '#cffafe',
    amount: 4200,
    usd: 4100,
    percent: 15,
  },
];

const pools = [
  {
    id: 'btc-stake',
    name: '비트코인 스테이킹 (BTC)',
    symbol: 'BTC',
    apr: 3.2,
    tvl: 120_000_000,
    risk: '중간',
    type: 'stable',
    network: '비트코인 메인넷',
    lockup: '30일',
  },
  {
    id: 'eth-stake',
    name: '이더리움 스테이킹 (ETH)',
    symbol: 'ETH',
    apr: 6.8,
    tvl: 95_000_000,
    risk: '중간',
    type: 'volatile',
    network: '이더리움 메인넷',
    lockup: '14일',
  },
  {
    id: 'xrp-stake',
    name: '리플 스테이킹 (XRP)',
    symbol: 'XRP',
    apr: 5.4,
    tvl: 48_000_000,
    risk: '낮음',
    type: 'stable',
    network: '리플 네트워크',
    lockup: '7일',
  },
];

let activity = [
  {
    type: '스테이킹',
    status: '성공',
    time: '방금 전',
    desc: '비트코인 스테이킹 (BTC)',
    amount: '+0.2 BTC',
    positive: true,
  },
  {
    type: '리워드 수령',
    status: '성공',
    time: '1시간 전',
    desc: '이더리움 스테이킹 (ETH)',
    amount: '+0.08 ETH',
    positive: true,
  },
  {
    type: '언스테이킹',
    status: '완료',
    time: '어제',
    desc: '리플 스테이킹 (XRP)',
    amount: '-320 XRP',
    positive: false,
  },
];

const $ = (selector) => document.querySelector(selector);

function formatUSD(num) {
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Map our symbols to CoinGecko IDs
const priceSource = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
};

async function fetchAndApplyPrices() {
  try {
    const ids = Object.values(priceSource).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch prices');
    const data = await res.json();

    let total = 0;
    portfolioData.forEach((item) => {
      const id = priceSource[item.symbol];
      const price = data[id]?.usd;
      if (!price) return;
      item.usd = item.amount * price;
      total += item.usd;
    });

    if (total > 0) {
      portfolioData.forEach((item) => {
        item.percent = Math.round((item.usd / total) * 100);
      });
    }

    // Re-render UI with live-ish prices
    renderPortfolio();
    if ($('#totalStaked')) {
      $('#totalStaked').textContent = formatUSD(total);
    }
  } catch (e) {
    // 네트워크 에러 시에는 그냥 더미 데이터 그대로 사용
    console.error('가격 데이터를 불러오지 못했습니다:', e);
  }
}

// --- Firebase Auth & Firestore 연동 ---
let auth, db;
let currentUser = null;
let isAdmin = false;
const ADMIN_EMAIL = 'jjiyu244@gmail.com';
let userStakes = {
  BTC: 0,
  ETH: 0,
  XRP: 0,
};

// Firebase 모듈 가져오기 (index.html에서 window.__firebase로 노출)
async function initFirebase() {
  if (!window.__firebase) {
    console.warn('Firebase가 아직 로드되지 않았습니다.');
    return;
  }
  auth = window.__firebase.auth;
  db = window.__firebase.db;
  window.__firebaseInitialized = true; // Firebase 초기화 완료 플래그

  // Auth 상태 변화 감지
  const { onAuthStateChanged } = await import(
    'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js'
  );
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = { email: user.email, uid: user.uid };
      isAdmin = user.email === ADMIN_EMAIL;
      await loadUserStakesFromFirestore(user.uid);
      await loadUserRewardsFromFirestore(user.uid);
      applyUserStakesToPortfolio();
      renderPortfolio();
      updateLoginUI();
      updateAdminUI();
      
      // URL 기반 라우팅 처리 (Firebase 초기화 후)
      // 단, 어드민 페이지인 경우 일반 계정이면 자동으로 대시보드로 이동 (알림 없이)
      const currentPath = window.location.pathname;
      if ((currentPath === '/admin' || currentPath === '/admin/') && !isAdmin) {
        // 일반 계정이 어드민 URL에 있으면 조용히 대시보드로 이동
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        navigateToPage('dashboard');
      } else {
        handleURLRouting();
      }
      
      // 리워드 페이지가 현재 표시 중이면 리워드 렌더링
      const rewardsPage = document.getElementById('rewards-page');
      if (rewardsPage && rewardsPage.style.display !== 'none') {
        await renderRewards();
      }
    } else {
      currentUser = null;
      isAdmin = false;
      userStakes = { BTC: 0, ETH: 0, XRP: 0 };
      userRewards = [];
      updateLoginUI();
      updateAdminUI();
      
      // 로그아웃 시 URL 기반 라우팅 처리 (어드민 페이지에서 로그아웃한 경우 대시보드로)
      const path = window.location.pathname;
      if (path === '/admin' || path === '/admin/') {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
      }
      handleURLRouting();
      
      // 리워드 페이지가 현재 표시 중이면 빈 상태 표시
      const rewardsPage = document.getElementById('rewards-page');
      if (rewardsPage && rewardsPage.style.display !== 'none') {
        await renderRewards();
      }
    }
  });
}

// Firestore에서 유저 스테이킹 데이터 불러오기
async function loadUserStakesFromFirestore(uid) {
  try {
    const { doc, getDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const docRef = doc(db, 'userStakes', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      userStakes.BTC = data.BTC || 0;
      userStakes.ETH = data.ETH || 0;
      userStakes.XRP = data.XRP || 0;
    } else {
      userStakes = { BTC: 0, ETH: 0, XRP: 0 };
    }
  } catch (e) {
    console.error('Firestore에서 데이터를 불러오지 못했습니다:', e);
  }
}

// Firestore에 유저 스테이킹 데이터 저장
async function saveUserStakesToFirestore() {
  if (!currentUser || !currentUser.uid) return;
  try {
    const { doc, getDoc, setDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const docRef = doc(db, 'userStakes', currentUser.uid);
    
    // 기존 데이터 확인
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};
    
    // 각 코인별로 스테이킹 시작일 설정 (처음 스테이킹할 때만)
    const stakeStartDates = existingData.stakeStartDates || {};
    ['BTC', 'ETH', 'XRP'].forEach((symbol) => {
      const currentAmount = userStakes[symbol] || 0;
      const previousAmount = existingData[symbol] || 0;
      
      // 처음 스테이킹을 시작하는 경우
      if (currentAmount > 0 && previousAmount === 0 && !stakeStartDates[symbol]) {
        stakeStartDates[symbol] = serverTimestamp();
      }
    });
    
    // 저장할 데이터 (이메일 정보도 포함)
    const dataToSave = {
      ...userStakes,
      email: currentUser.email,
      stakeStartDates,
      lastUpdated: serverTimestamp(),
    };
    
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (e) {
    console.error('Firestore에 데이터를 저장하지 못했습니다:', e);
  }
}

// 리워드 데이터 관리
let userRewards = []; // 승인된 리워드 내역

// Firestore에서 유저 리워드 데이터 불러오기 (최적화)
async function loadUserRewardsFromFirestore(uid) {
  if (!db || !uid) {
    userRewards = [];
    return;
  }
  
  try {
    // Firestore 모듈 동적 import (한 번만)
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
    const { collection, query, where, getDocs, orderBy } = firestoreModule;
    
    const rewardsRef = collection(db, 'rewards');
    
    // orderBy 없이 먼저 시도 (인덱스 불필요)
    let q = query(rewardsRef, where('userId', '==', uid));
    
    try {
      // orderBy를 시도 (인덱스가 있다면)
      q = query(rewardsRef, where('userId', '==', uid), orderBy('approvedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      userRewards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (indexError) {
      // 인덱스가 없으면 orderBy 없이 조회 후 클라이언트에서 정렬
      console.warn('Firestore 인덱스 없음, 클라이언트 정렬 사용');
      const querySnapshot = await getDocs(q);
      userRewards = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // 클라이언트에서 날짜순 정렬
      userRewards.sort((a, b) => {
        const dateA = a.approvedAt?.toDate ? a.approvedAt.toDate() : new Date(0);
        const dateB = b.approvedAt?.toDate ? b.approvedAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime(); // 최신순
      });
    }
  } catch (e) {
    console.error('Firestore 리워드 데이터 로드 실패:', e.message || e);
    userRewards = []; // 에러 시 빈 배열로 초기화
  }
}

// 관리자가 리워드 승인
async function approveRewardForUser(userId, approvedAmount, symbol, apy) {
  try {
    const { collection, addDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardsRef = collection(db, 'rewards');
    await addDoc(rewardsRef, {
      userId: userId,
      symbol: symbol,
      amount: approvedAmount,
      apy: apy,
      status: '수령 완료',
      approvedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('리워드 승인 중 오류:', e);
    return false;
  }
}

// 리워드 수정
async function updateReward(rewardId, amount, apy, date) {
  try {
    const { doc, updateDoc, Timestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardRef = doc(db, 'rewards', rewardId);
    
    // 날짜를 Timestamp로 변환
    const dateObj = date ? new Date(date) : new Date();
    const timestamp = Timestamp.fromDate(dateObj);
    
    await updateDoc(rewardRef, {
      amount: parseFloat(amount),
      apy: parseFloat(apy),
      approvedAt: timestamp,
    });
    return true;
  } catch (e) {
    console.error('리워드 수정 중 오류:', e);
    return false;
  }
}

// 리워드 삭제
async function deleteReward(rewardId) {
  try {
    const { doc, deleteDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardRef = doc(db, 'rewards', rewardId);
    await deleteDoc(rewardRef);
    return true;
  } catch (e) {
    console.error('리워드 삭제 중 오류:', e);
    return false;
  }
}

// 1:1 문의 저장
async function saveInquiry(email, subject, content) {
  try {
    const { collection, addDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const inquiriesRef = collection(db, 'inquiries');
    await addDoc(inquiriesRef, {
      email: email,
      subject: subject,
      content: content,
      userId: currentUser ? currentUser.uid : null,
      userEmail: currentUser ? currentUser.email : null,
      status: '대기중',
      createdAt: serverTimestamp(),
      repliedAt: null,
      reply: null,
    });
    return true;
  } catch (e) {
    console.error('문의 저장 중 오류:', e);
    return false;
  }
}

// 어드민용: 모든 문의 내역 불러오기
async function loadAllInquiries() {
  if (!db) return [];
  
  try {
    const { collection, query, getDocs, orderBy } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const inquiriesRef = collection(db, 'inquiries');
    
    let q = query(inquiriesRef, orderBy('createdAt', 'desc'));
    
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (indexError) {
      // 인덱스가 없으면 orderBy 없이 조회 후 클라이언트에서 정렬
      console.warn('Firestore 인덱스 없음, 클라이언트 정렬 사용');
      const querySnapshot = await getDocs(inquiriesRef);
      const inquiries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // 클라이언트에서 날짜순 정렬
      inquiries.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime(); // 최신순
      });
      
      return inquiries;
    }
  } catch (e) {
    console.error('문의 내역 로드 실패:', e);
    return [];
  }
}

function updateLoginUI() {
  const loginBtn = $('#loginBtn');
  if (!loginBtn) return;
  
  // 로그인 버튼 텍스트 업데이트
  if (currentUser) {
    // 이메일에서 @ 앞부분만 표시 (일반 계정은 @temp.com 제거)
    const displayEmail = currentUser.email.replace('@temp.com', '').split('@')[0];
    loginBtn.textContent = `${displayEmail} (로그아웃)`;
    
    // 문의 폼 이메일 자동 입력 (문의 페이지가 표시 중인 경우)
    const inquiryEmailInput = $('#inquiryEmail');
    if (inquiryEmailInput) {
      inquiryEmailInput.value = currentUser.email;
    }
  } else {
    loginBtn.textContent = '로그인';
  }
  
  // 회원가입 버튼 표시/숨김 처리 (navbar-actions에 위치)
  const signupBtn = $('#signupNavBtn');
  if (signupBtn) {
    if (currentUser) {
      signupBtn.style.display = 'none'; // 로그인 시 숨김
    } else {
      signupBtn.style.display = ''; // 로그아웃 시 표시
    }
  }
}

function applyUserStakesToPortfolio() {
  // userStakes 수량을 포트폴리오 amount에 더해줌
  portfolioData.forEach((item) => {
    const extra = userStakes[item.symbol] || 0;
    item.amountBase = item.amountBase ?? item.amount;
    item.amount = item.amountBase + extra;
  });
}

async function setupLogin() {
  console.log('setupLogin 함수 시작');
  const loginBtn = $('#loginBtn');
  const modal = $('#loginModal');
  const closeBtn = $('#loginCloseBtn');
  const confirmBtn = $('#loginConfirmBtn');
  const statusText = $('#loginStatusText');
  const titleEl = $('#loginModalTitle');
  const toSignup = $('#toSignup');
  const toLogin = $('#toLogin');
  let mode = 'login'; // 'login' | 'signup'

  console.log('DOM 요소 확인:', {
    loginBtn: !!loginBtn,
    modal: !!modal,
    confirmBtn: !!confirmBtn,
    statusText: !!statusText
  });

  // Firebase Auth 모듈 동적 import
  let signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword;
  try {
    const authModule = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    signOut = authModule.signOut;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
    console.log('Firebase Auth 모듈 로드 완료');
  } catch (err) {
    console.error('Firebase Auth 모듈 로드 실패:', err);
    return;
  }

  const setMode = (nextMode) => {
    mode = nextMode;
    if (!titleEl || !confirmBtn || !toSignup || !toLogin) return;
    if (nextMode === 'login') {
      titleEl.textContent = '로그인';
      confirmBtn.textContent = '로그인';
      statusText.textContent = '';
      // 회원가입 링크 숨기기 (비활성화)
      if (toSignup) {
        toSignup.classList.add('auth-switch-link--hidden');
      }
      if (toLogin) {
        toLogin.classList.add('auth-switch-link--hidden');
      }
    } else {
      // 회원가입 모드는 더 이상 사용하지 않음
      setMode('login');
    }
  };

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      if (currentUser) {
        // 로그아웃
        try {
          await signOut(auth);
          currentUser = null;
          userStakes = { BTC: 0, ETH: 0, XRP: 0 };
          window.location.reload();
        } catch (e) {
          console.error('로그아웃 실패:', e);
        }
        return;
      }
      statusText.textContent = '';
      setMode('login');
      modal.classList.add('show');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'loginModal') modal.classList.remove('show');
    });
  }

  // 로그인 핸들러 함수 - 최적화된 버전
  const handleLogin = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // 상태 초기화
    if (statusText) {
      statusText.textContent = '';
    }
    
    // auth 객체 가져오기 - 더 안전한 방법
    const getAuthInstance = () => {
      if (auth && auth.app) return auth;
      if (window.__firebase && window.__firebase.auth && window.__firebase.auth.app) {
        return window.__firebase.auth;
      }
      return null;
    };
    
    const currentAuth = getAuthInstance();
    if (!currentAuth) {
      const errorMsg = 'Firebase Auth가 초기화되지 않았습니다. 페이지를 새로고침해주세요.';
      console.error(errorMsg);
      if (statusText) {
        statusText.textContent = errorMsg;
      }
      return;
    }
    
    // 입력 필드 가져오기
    const emailInput = $('#loginEmail');
    const passwordInput = $('#loginPassword');
    
    if (!emailInput || !passwordInput) {
      console.error('로그인 입력 필드를 찾을 수 없습니다.');
      if (statusText) {
        statusText.textContent = '로그인 폼을 찾을 수 없습니다. 페이지를 새로고침해주세요.';
      }
      return;
    }
    
    // 입력 값 가져오기 및 검증
    let email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // 빈 값 체크
    if (!email || !password) {
      if (statusText) {
        statusText.textContent = '아이디(또는 이메일)와 비밀번호를 모두 입력해주세요.';
      }
      return;
    }
    
    // 이메일 형식 검증 및 변환
    email = email.toLowerCase().trim();
    
    // 일반 아이디 형식 체크 (소문자, 숫자, 언더스코어, 하이픈만 허용)
    const isGeneralId = /^[a-z0-9_-]+$/.test(email) && !email.includes('@');
    
    if (isGeneralId) {
      // 일반 아이디 형식인 경우 @temp.com 도메인 추가
      email = `${email}@temp.com`;
      console.log('일반 아이디를 이메일 형식으로 변환:', email);
    } else {
      // 이메일 형식인지 확인
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (statusText) {
          statusText.textContent = '유효한 아이디(소문자, 숫자) 또는 이메일 주소를 입력해주세요.';
        }
        return;
      }
    }
    
    // input 필드에 최종 이메일 반영
    emailInput.value = email;
    
    // 비밀번호 길이 체크 (Firebase 최소 6자)
    if (password.length < 6) {
      if (statusText) {
        statusText.textContent = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      return;
    }

    // 로그인 시도
    try {
      if (statusText) {
        statusText.textContent = '로그인 중...';
      }
      
      // signInWithEmailAndPassword 함수 확인
      if (typeof signInWithEmailAndPassword !== 'function') {
        throw new Error('로그인 함수를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
      }
      
      // Firebase 로그인 API 호출
      const result = await signInWithEmailAndPassword(currentAuth, email, password);
      console.log('로그인 성공:', result.user?.email);
      
      // 성공 메시지 및 모달 닫기
      if (statusText) {
        statusText.textContent = '로그인 되었습니다.';
      }
      setTimeout(() => {
        const modal = $('#loginModal');
        if (modal) {
          modal.classList.remove('show');
        }
      }, 500);
    } catch (error) {
      // 에러 로깅
      console.error('로그인 에러:', {
        code: error.code,
        message: error.message,
        email: email,
        authInitialized: !!currentAuth
      });
      
      // 사용자 친화적 에러 메시지
      if (!statusText) return;
      
      let errorMessage = '';
      const errorCode = error.code || '';
      const errorMsg = error.message || '';
      
      // 400 Bad Request 에러 처리
      if (errorCode.includes('400') || errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        errorMessage = `로그인 요청이 실패했습니다 (400 에러).<br/><br/>
          <strong>필수 확인 사항:</strong><br/>
          1. Firebase 콘솔 → Authentication → Sign-in method<br/>
          &nbsp;&nbsp;→ <strong>Email/Password</strong>가 <strong>활성화</strong>되어 있는지 확인<br/>
          2. 입력한 이메일: <strong>${email}</strong><br/>
          3. Firebase 콘솔(Authentication → Users)에 해당 계정이 존재하는지 확인<br/>
          4. 비밀번호가 정확한지 확인<br/><br/>
          <small>에러 코드: ${errorCode || 'N/A'}</small>`;
      } else if (errorCode === 'auth/user-not-found') {
        errorMessage = `등록된 계정이 없습니다.<br/><br/>Firebase 콘솔 → Authentication → Users에서 <strong>"${email}"</strong> 계정이 생성되었는지 확인해주세요.`;
      } else if (errorCode === 'auth/wrong-password') {
        errorMessage = '비밀번호가 올바르지 않습니다.<br/><br/>Firebase 콘솔에서 설정한 비밀번호를 확인해주세요.';
      } else if (errorCode === 'auth/invalid-email') {
        errorMessage = '유효한 이메일 주소를 입력해주세요. (예: user@example.com)';
      } else if (errorCode === 'auth/invalid-credential') {
        errorMessage = `이메일 또는 비밀번호가 올바르지 않습니다.<br/><br/>
          입력한 이메일: <strong>${email}</strong><br/><br/>
          확인 사항:<br/>
          1. Firebase 콘솔에 정확히 <strong>"${email}"</strong> 계정이 있는지<br/>
          2. 비밀번호가 정확한지<br/>
          3. 계정이 삭제되지 않았는지`;
      } else {
        errorMessage = `로그인 실패: <strong>${errorCode || errorMsg || '알 수 없는 오류'}</strong><br/><br/>
          페이지를 새로고침하거나 Firebase 콘솔에서 계정 상태를 확인해주세요.`;
      }
      
      statusText.innerHTML = errorMessage;
    }
  };
  
  // 버튼 클릭 이벤트
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleLogin);
    console.log('로그인 버튼 이벤트 리스너 등록됨');
  } else {
    console.error('로그인 확인 버튼을 찾을 수 없습니다. id="loginConfirmBtn"');
  }
  
  // 폼 제출 이벤트 (엔터키 등)
  const loginForm = modal?.querySelector('form') || modal?.querySelector('.modal-body');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('로그인 폼 제출 이벤트 리스너 등록됨');
  }
  
  // 이메일/비밀번호 필드에서 엔터키 처리
  const emailInput = $('#loginEmail');
  const passwordInput = $('#loginPassword');
  if (emailInput) {
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(e);
      }
    });
  }
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(e);
      }
    });
  }

  // 회원가입 비활성화 - 이벤트 리스너 제거
  // if (toSignup) {
  //   toSignup.addEventListener('click', () => setMode('signup'));
  // }
  // if (toLogin) {
  //   toLogin.addEventListener('click', () => setMode('login'));
  // }
}

// Portfolio rendering
function renderPortfolio() {
  const list = $('#portfolioList');
  list.innerHTML = '';

  portfolioData.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'portfolio-item';
    el.innerHTML = `
      <div class="token-info">
        <div class="token-icon" style="background:${item.bg};color:${item.color}">
          ${item.label ? item.label[0] : item.symbol[0]}
        </div>
        <div class="token-meta">
          <span class="token-symbol">${item.label || item.symbol}</span>
          <span class="token-network">${item.network}</span>
        </div>
      </div>
      <div class="token-stats">
        <div class="token-amount">${formatUSD(item.usd)}</div>
        <div class="token-percent">${item.percent}% · ${item.amount} ${item.symbol}</div>
      </div>
    `;
    list.appendChild(el);
  });
}

// Pools rendering
function renderPools(filter = 'all') {
  const container = $('#poolList');
  container.innerHTML = '';

  pools
    .filter((p) => (filter === 'all' ? true : p.type === filter))
    .forEach((pool) => {
      const el = document.createElement('div');
      el.className = 'pool-card';
      el.innerHTML = `
        <div class="pool-main">
          <div class="token-icon" style="background:rgba(148,163,184,0.2);color:#e5e7eb">
            ${pool.symbol[0]}
          </div>
          <div>
            <div class="pool-apr">${pool.name}</div>
            <div class="pool-sub">${pool.network} · APY ${pool.apr}%</div>
          </div>
        </div>
        <div class="pool-meta">
          <span>
            <span>TVL</span>
            <span>${formatUSD(pool.tvl)}</span>
          </span>
          <span>
            <span>Lock-up</span>
            <span>${pool.lockup}</span>
          </span>
          <span>
            <span>리스크</span>
            <span>${pool.risk}</span>
          </span>
        </div>
        <div class="pool-action">
          <button class="btn-primary" data-stake-id="${pool.id}">스테이킹</button>
          <span class="link-muted">상세 보기</span>
        </div>
      `;
      container.appendChild(el);
    });
}

// Activity rendering
function renderActivity() {
  const list = $('#activityList');
  list.innerHTML = '';

  activity.forEach((a) => {
    const el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = `
      <div class="activity-main">
        <span class="activity-type">${a.type} · ${a.status}</span>
        <span class="activity-meta">${a.time} · ${a.desc}</span>
      </div>
      <div class="activity-amount ${
        a.positive ? 'activity-positive' : 'activity-negative'
      }">${a.amount}</div>
    `;
    list.appendChild(el);
  });
}

// 리워드 내역 렌더링
async function renderRewards() {
  const tableBody = $('#rewardsTableBody');
  const totalRewardsEl = $('#totalRewardsUSD');
  const monthRewardsEl = $('#monthRewardsUSD');
  const avgApyEl = $('#avgAPY');
  const coinFilter = $('#rewardFilterCoin');
  const periodFilter = $('#rewardFilterPeriod');

  // 로그인 체크
  if (!currentUser) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 48px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 16px; margin-bottom: 8px;">스테이킹 내역이 없습니다.</div>
          <div style="font-size: 14px;">로그인 후 관리자 승인을 받으면 리워드 내역이 표시됩니다.</div>
        </td>
      </tr>
    `;
    if (totalRewardsEl) totalRewardsEl.textContent = '$0';
    if (monthRewardsEl) monthRewardsEl.textContent = '$0';
    if (avgApyEl) avgApyEl.textContent = '0%';
    return;
  }

  // 리워드 데이터 로드
  await loadUserRewardsFromFirestore(currentUser.uid);

  // 필터 적용
  const coinFilterValue = coinFilter ? coinFilter.value : 'all';
  const periodFilterValue = periodFilter ? periodFilter.value : 'all';
  
  let filteredRewards = [...userRewards];
  
  // 코인 필터
  if (coinFilterValue !== 'all') {
    filteredRewards = filteredRewards.filter(r => r.symbol === coinFilterValue);
  }
  
  // 기간 필터
  if (periodFilterValue !== 'all') {
    const now = new Date();
    const cutoffDate = new Date();
    
    if (periodFilterValue === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (periodFilterValue === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    } else if (periodFilterValue === 'year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }
    
    filteredRewards = filteredRewards.filter(r => {
      const rewardDate = r.approvedAt?.toDate ? r.approvedAt.toDate() : new Date();
      return rewardDate >= cutoffDate;
    });
  }

  if (filteredRewards.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 48px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 16px; margin-bottom: 8px;">스테이킹 내역이 없습니다.</div>
          <div style="font-size: 14px;">${userRewards.length === 0 ? '관리자가 승인한 리워드 내역이 없습니다.' : '선택한 필터 조건에 맞는 리워드가 없습니다.'}</div>
        </td>
      </tr>
    `;
    if (totalRewardsEl) totalRewardsEl.textContent = '$0';
    if (monthRewardsEl) monthRewardsEl.textContent = '$0';
    if (avgApyEl) avgApyEl.textContent = '0%';
    return;
  }

  // 리워드 통계 계산 (필터링된 데이터 기준)
  let totalUSD = 0;
  let monthUSD = 0;
  let totalApy = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 가격 정보 가져오기
  const prices = {};
  try {
    const ids = Object.values(priceSource).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      prices.BTC = data.bitcoin?.usd || 0;
      prices.ETH = data.ethereum?.usd || 0;
      prices.XRP = data.ripple?.usd || 0;
    }
  } catch (e) {
    // 기본 가격 사용
    prices.BTC = 90000;
    prices.ETH = 3000;
    prices.XRP = 1;
  }

  tableBody.innerHTML = '';
  filteredRewards.forEach((reward) => {
    const rewardDate = reward.approvedAt?.toDate ? reward.approvedAt.toDate() : new Date();
    const usdValue = reward.amount * (prices[reward.symbol] || 0);
    totalUSD += usdValue;

    // 이번 달 리워드 계산
    if (rewardDate.getMonth() === currentMonth && rewardDate.getFullYear() === currentYear) {
      monthUSD += usdValue;
    }

    totalApy += reward.apy || 0;

    const dateStr = rewardDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="padding: 16px;">${dateStr}</td>
      <td style="padding: 16px;">${reward.symbol === 'BTC' ? '비트코인 (BTC)' : reward.symbol === 'ETH' ? '이더리움 (ETH)' : '리플 (XRP)'}</td>
      <td style="padding: 16px;">+${reward.amount.toFixed(reward.symbol === 'XRP' ? 2 : 4)} ${reward.symbol}</td>
      <td style="padding: 16px;">$${usdValue.toFixed(2)}</td>
      <td style="padding: 16px;">${reward.apy.toFixed(1)}%</td>
      <td style="padding: 16px;">
        <span class="reward-status success">${reward.status || '수령 완료'}</span>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // 통계 업데이트 (모든 리워드 기준)
  let allTotalUSD = 0;
  let allMonthUSD = 0;
  let allTotalApy = 0;
  
  userRewards.forEach((reward) => {
    const rewardDate = reward.approvedAt?.toDate ? reward.approvedAt.toDate() : new Date();
    const usdValue = reward.amount * (prices[reward.symbol] || 0);
    allTotalUSD += usdValue;
    if (rewardDate.getMonth() === currentMonth && rewardDate.getFullYear() === currentYear) {
      allMonthUSD += usdValue;
    }
    allTotalApy += reward.apy || 0;
  });

  if (totalRewardsEl) totalRewardsEl.textContent = formatUSD(allTotalUSD);
  if (monthRewardsEl) monthRewardsEl.textContent = formatUSD(allMonthUSD);
  if (avgApyEl) {
    const avg = userRewards.length > 0 ? allTotalApy / userRewards.length : 0;
    avgApyEl.textContent = `${avg.toFixed(1)}%`;
  }
}

// 리워드 필터 설정
function setupRewardFilters() {
  const coinFilter = $('#rewardFilterCoin');
  const periodFilter = $('#rewardFilterPeriod');
  
  if (coinFilter) {
    coinFilter.addEventListener('change', () => {
      renderRewards();
    });
  }
  
  if (periodFilter) {
    periodFilter.addEventListener('change', () => {
      renderRewards();
    });
  }
}

// 회원가입 폼 설정
function setupSignupForm() {
  const signupForm = $('#signupForm');
  const goToLoginBtn = $('#goToLogin');
  
  if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // 회원가입 페이지 숨기고 대시보드로 이동
      navigateToPage('dashboard');
      // 로그인 모달 열기
      setTimeout(() => {
        const loginModal = $('#loginModal');
        if (loginModal) {
          loginModal.classList.add('show');
        }
      }, 100);
    });
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = $('#signupUsername').value.trim();
      const password = $('#signupPassword').value.trim();
      const passwordConfirm = $('#signupPasswordConfirm').value.trim();
      const name = $('#signupName').value.trim();
      const agree = $('#signupAgree').checked;
      
      // 유효성 검사
      if (!username || !password || !passwordConfirm) {
        alert('사용자명, 비밀번호, 비밀번호 확인을 모두 입력해주세요.');
        return;
      }
      
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      
      if (password.length < 15) {
        alert('비밀번호는 15자 이상이어야 합니다.');
        return;
      }
      
      // 비밀번호 복잡도 검사 (숫자와 대소문자 중 2가지 이상)
      const hasNumber = /\d/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const complexityCount = [hasNumber, hasUpper, hasLower].filter(Boolean).length;
      
      if (complexityCount < 2) {
        alert('비밀번호는 숫자와 대소문자 중 2가지 이상을 포함해야 합니다.');
        return;
      }
      
      if (!agree) {
        alert('이용약관 및 개인정보처리방침에 동의해주세요.');
        return;
      }
      
      // Firebase Auth를 사용하여 회원가입
      try {
        // Firebase Auth 모듈 동적 import
        const {
          createUserWithEmailAndPassword,
        } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
        
        // auth 객체 가져오기 - window.__firebase.auth 사용 (setupLogin과 동일한 방식)
        let currentAuth = auth;
        if (!currentAuth && window.__firebase && window.__firebase.auth) {
          currentAuth = window.__firebase.auth;
        }
        
        if (!currentAuth) {
          alert('Firebase가 초기화되지 않았습니다. 페이지를 새로고침해주세요.');
          console.error('Firebase auth를 찾을 수 없습니다. auth:', auth, 'window.__firebase:', window.__firebase);
          return;
        }
        
        // 사용자명을 이메일 형식으로 변환 (Firebase는 이메일 형식 필요)
        // 실제로는 이메일 형식이 필요하지만, 임시로 사용자명+@temp.com 형식 사용
        const email = `${username}@temp.com`;
        
        await createUserWithEmailAndPassword(currentAuth, email, password);
        
        // 성공 메시지 (Firebase Auth는 회원가입 후 자동 로그인됨)
        alert('회원가입이 완료되었습니다!');
        
        // 회원가입 페이지 닫고 대시보드로 이동
        navigateToPage('dashboard');
        
        // 폼 초기화
        signupForm.reset();
        
      } catch (error) {
        console.error('회원가입 오류 상세:', error);
        console.error('에러 스택:', error.stack);
        console.error('현재 auth 상태:', { auth, windowFirebase: window.__firebase });
        
        let errorMessage = '회원가입 중 오류가 발생했습니다.';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = '이미 사용 중인 사용자명입니다.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = '올바른 사용자명 형식이 아닙니다.';
        } else {
          errorMessage = `회원가입 중 오류가 발생했습니다: ${error.message || error}`;
        }
        
        alert(errorMessage);
        console.error('회원가입 오류:', error);
      }
    });
  }
}

// 1:1 문의 폼 설정
function setupInquiryForm() {
  const inquiryForm = $('#inquiryForm');
  const statusText = $('#inquiryStatusText');
  
  if (!inquiryForm) return;
  
  // 로그인된 사용자의 이메일 자동 입력
  if (currentUser && currentUser.email) {
    const emailInput = $('#inquiryEmail');
    if (emailInput) {
      emailInput.value = currentUser.email;
    }
  }
  
  inquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = $('#inquiryEmail').value.trim();
    const subject = $('#inquirySubject').value.trim();
    const content = $('#inquiryContent').value.trim();
    
    // 유효성 검사
    if (!email || !subject || !content) {
      if (statusText) {
        statusText.textContent = '모든 필드를 입력해주세요.';
        statusText.style.color = 'var(--error)';
      }
      return;
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (statusText) {
        statusText.textContent = '올바른 이메일 주소를 입력해주세요.';
        statusText.style.color = 'var(--error)';
      }
      return;
    }
    
    // 문의 저장
    if (statusText) {
      statusText.textContent = '문의를 전송하는 중...';
      statusText.style.color = 'var(--text)';
    }
    
    const success = await saveInquiry(email, subject, content);
    
    if (success) {
      if (statusText) {
        statusText.textContent = '문의가 성공적으로 전송되었습니다. 빠른 시일 내에 답변드리겠습니다.';
        statusText.style.color = 'var(--success)';
      }
      inquiryForm.reset();
      // 로그인된 사용자의 이메일 다시 채우기
      if (currentUser && currentUser.email) {
        $('#inquiryEmail').value = currentUser.email;
      }
      
      // 3초 후 메시지 제거
      setTimeout(() => {
        if (statusText) {
          statusText.textContent = '';
        }
      }, 3000);
    } else {
      if (statusText) {
        statusText.textContent = '문의 전송 중 오류가 발생했습니다. 다시 시도해주세요.';
        statusText.style.color = 'var(--error)';
      }
    }
  });
}

// Simple APY animation
function animateApy() {
  const apy = 8.9;
  $('#estApy').textContent = `${apy}%`;
  $('#apyProgress').style.width = `${Math.min(apy * 1.2, 100)}%`;
}

// Reward simulator
function setupSimulator() {
  const simBtn = $('#simBtn');
  simBtn.addEventListener('click', () => {
    const amount = parseFloat($('#simAmount').value || '0');
    const days = parseFloat($('#simDays').value || '0');
    const apy = parseFloat($('#simApy').value || '0');
    const resultEl = $('#simResult');

    if (!amount || !days || !apy) {
      resultEl.textContent = '금액, 기간, APY를 모두 입력해주세요.';
      return;
    }

    const yearFraction = days / 365;
    const earned = (amount * (apy / 100)) * yearFraction;
    const total = amount + earned;

    resultEl.textContent = `단순 이자 기준, ${days}일 후 예상 리워드는 약 ${earned.toFixed(
      2
    )} USD이며, 총 잔액은 약 ${total.toFixed(2)} USD 입니다. (복리 효과 미포함)`;
  });
}

// Staking modal logic
let currentPool = null;

function openStakeModal(poolId) {
  currentPool = pools.find((p) => p.id === poolId);
  if (!currentPool) return;

  $('#modalTitle').textContent = `${currentPool.name} · 스테이킹`;
  $('#modalPoolInfo').innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;">
      <div>
        <div style="font-weight:500;font-size:12px;">${currentPool.symbol} / ${
    currentPool.network
  }</div>
        <div style="font-size:11px;color:#9ca3af;">APY ${currentPool.apr}% · Lock-up ${
    currentPool.lockup
  }</div>
      </div>
      <div class="badge badge-success">
        <span>데모 모드</span>
      </div>
    </div>
  `;
  $('#stakeAmount').value = '';
  $('#stakeHelper').textContent = 'Firebase Auth 로그인 시 Firestore에 저장됩니다.';

  $('#stakeModal').classList.add('show');
}

function closeStakeModal() {
  $('#stakeModal').classList.remove('show');
  currentPool = null;
}

function setupStakeModal() {
  document.addEventListener('click', (e) => {
    const stakeBtn = e.target.closest('[data-stake-id]');
    if (stakeBtn) {
      const poolId = stakeBtn.getAttribute('data-stake-id');
      openStakeModal(poolId);
    }
  });

  $('#modalCloseBtn').addEventListener('click', closeStakeModal);
  $('#stakeModal').addEventListener('click', (e) => {
    if (e.target.id === 'stakeModal') {
      closeStakeModal();
    }
  });

  $('#stakeConfirmBtn').addEventListener('click', async () => {
    const amount = parseFloat($('#stakeAmount').value || '0');
    const helper = $('#stakeHelper');
    if (!currentPool) return;

    if (!amount || amount <= 0) {
      helper.textContent = '0보다 큰 수량을 입력해주세요.';
      helper.classList.add('text-danger');
      return;
    }

    if (!currentUser) {
      helper.classList.remove('text-danger');
      helper.textContent = '로그인 후에만 스테이킹 수량이 Firestore에 저장됩니다.';
      return;
    }

    helper.classList.remove('text-danger');
    helper.textContent = `${currentPool.name} 풀에 ${amount} ${currentPool.symbol}를 스테이킹합니다.`;

    // 유저별 스테이킹 수량 업데이트
    userStakes[currentPool.symbol] = (userStakes[currentPool.symbol] || 0) + amount;
    await saveUserStakesToFirestore();

    // 포트폴리오/요약 수치 갱신
    applyUserStakesToPortfolio();
    renderPortfolio();

    // prepend virtual activity
    activity.unshift({
      type: '스테이킹',
      status: 'Firestore 저장',
      time: '방금 전',
      desc: currentPool.name,
      amount: `+${amount} ${currentPool.symbol}`,
      positive: true,
    });
    if (activity.length > 12) activity.pop();
    renderActivity();

    // light feedback
    $('#stakeConfirmBtn').textContent = '완료 (Firebase)';
    setTimeout(() => {
      $('#stakeConfirmBtn').textContent = '가상 스테이킹 실행';
      closeStakeModal();
    }, 900);
  });
}

// Tabs setup
function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      renderPools(tab.dataset.filter);
    });
  });
}

// Theme toggle (simple effect only)
function setupThemeToggle() {
  const toggle = $('#themeToggle');
  const icon = $('#themeIcon');
  let dark = true;

  toggle.addEventListener('click', () => {
    dark = !dark;
    document.body.style.background = dark
      ? 'radial-gradient(circle at top, #1e293b 0, #020617 55%, #000 100%)'
      : 'radial-gradient(circle at top, #e5e7eb 0, #e2e8f0 40%, #cbd5f5 100%)';
    icon.textContent = dark ? '☾' : '☀';
  });
}

// Wallet button (demo)
function setupWalletButton() {
  const walletBtn = $('#walletBtn');
  walletBtn.addEventListener('click', () => {
    walletBtn.textContent = '0xF3...D92A (Demo)';
  });
}

// --- Admin Dashboard ---
function updateAdminUI() {
  const adminBtn = $('#adminBtn');
  if (!adminBtn) return;
  if (isAdmin) {
    adminBtn.style.display = 'inline-block';
  } else {
    adminBtn.style.display = 'none';
  }
}

async function loadAllUserStakes() {
  try {
    const { collection, getDocs } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const querySnapshot = await getDocs(collection(db, 'userStakes'));
    const allUsers = [];
    querySnapshot.forEach((doc) => {
      allUsers.push({
        uid: doc.id,
        ...doc.data(),
      });
    });
    return allUsers;
  } catch (e) {
    console.error('전체 유저 스테이킹 데이터를 불러오지 못했습니다:', e);
    return [];
  }
}

// 사용자별 리워드 데이터 가져오기
async function loadUserRewardsForAdmin(userId) {
  try {
    const { collection, query, where, getDocs, orderBy } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardsRef = collection(db, 'rewards');
    const q = query(rewardsRef, where('userId', '==', userId), orderBy('approvedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const rewards = [];
    querySnapshot.forEach((doc) => {
      rewards.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return rewards;
  } catch (e) {
    console.error('리워드 데이터를 불러오지 못했습니다:', e);
    return [];
  }
}

async function renderAdminDashboard(users) {
  const container = $('#adminContent');
  if (!container) return;

  container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding: 20px;">데이터를 불러오는 중...</p>';

  if (users.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;">스테이킹 데이터가 없습니다.</p>';
    return;
  }

  // 가격 정보 가져오기
  const prices = {};
  try {
    const ids = Object.values(priceSource).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      prices.BTC = data.bitcoin?.usd || 90000;
      prices.ETH = data.ethereum?.usd || 3000;
      prices.XRP = data.ripple?.usd || 1;
    }
  } catch (e) {
    prices.BTC = 90000;
    prices.ETH = 3000;
    prices.XRP = 1;
  }

  let totalBTC = 0;
  let totalETH = 0;
  let totalXRP = 0;
  let totalUSD = 0;

  users.forEach((u) => {
    totalBTC += u.BTC || 0;
    totalETH += u.ETH || 0;
    totalXRP += u.XRP || 0;
    totalUSD += ((u.BTC || 0) * prices.BTC) + ((u.ETH || 0) * prices.ETH) + ((u.XRP || 0) * prices.XRP);
  });

  // APY 정보
  const poolApy = {
    BTC: 3.2,
    ETH: 6.8,
    XRP: 5.4,
  };

  // 문의 내역 불러오기
  const inquiries = await loadAllInquiries();
  const pendingInquiries = inquiries.filter(inq => inq.status === '대기중');

  // 통계 섹션
  let html = `
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">📊 전체 통계</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;">
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 회원수</div>
          <div style="font-size: 20px; font-weight: 700; color: #fff;">${users.length}명</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 스테이킹 금액</div>
          <div style="font-size: 20px; font-weight: 700; color: #10b981;">${formatUSD(totalUSD)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">BTC 총합</div>
          <div style="font-size: 18px; font-weight: 600; color: #f97316;">${totalBTC.toFixed(4)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">ETH 총합</div>
          <div style="font-size: 18px; font-weight: 600; color: #4f46e5;">${totalETH.toFixed(4)}</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div>
          <div style="font-size: 11px; color: #9ca3af;">XRP 총합</div>
          <div style="font-size: 16px; font-weight: 600; color: #06b6d4;">${totalXRP.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">BTC USD</div>
          <div style="font-size: 16px; font-weight: 600;">${formatUSD(totalBTC * prices.BTC)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">ETH USD</div>
          <div style="font-size: 16px; font-weight: 600;">${formatUSD(totalETH * prices.ETH)}</div>
        </div>
      </div>
    </div>
    
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 600; margin: 0;">📬 1:1 문의 내역 (${inquiries.length}건)</h3>
        ${pendingInquiries.length > 0 ? `<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">대기중 ${pendingInquiries.length}건</span>` : ''}
      </div>
      ${inquiries.length > 0 ? `
        <div style="background: rgba(255,255,255,0.02); border-radius: 6px; overflow: hidden;">
          <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(255,255,255,0.05);">
                <th style="padding: 10px; text-align: left; color: #9ca3af; font-weight: 600;">날짜</th>
                <th style="padding: 10px; text-align: left; color: #9ca3af; font-weight: 600;">이메일</th>
                <th style="padding: 10px; text-align: left; color: #9ca3af; font-weight: 600;">제목</th>
                <th style="padding: 10px; text-align: center; color: #9ca3af; font-weight: 600;">상태</th>
                <th style="padding: 10px; text-align: left; color: #9ca3af; font-weight: 600;">내용</th>
              </tr>
            </thead>
            <tbody>
      ` : '<p style="color: #6b7280; text-align: center; padding: 20px;">문의 내역이 없습니다.</p>'}
      ${inquiries.length > 0 ? inquiries.slice(0, 10).map(inq => {
        const createdDate = inq.createdAt?.toDate ? inq.createdAt.toDate() : new Date();
        const dateStr = createdDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const statusColor = inq.status === '대기중' ? '#ef4444' : inq.status === '답변완료' ? '#10b981' : '#9ca3af';
        const contentPreview = (inq.content || '').substring(0, 50) + ((inq.content || '').length > 50 ? '...' : '');
        const escapedContent = (inq.content || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        return `
              <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 10px;">${dateStr}</td>
                <td style="padding: 10px;">${inq.email || inq.userEmail || '-'}</td>
                <td style="padding: 10px; font-weight: 500;">${inq.subject || '-'}</td>
                <td style="padding: 10px; text-align: center;">
                  <span style="background: ${statusColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">
                    ${inq.status || '대기중'}
                  </span>
                </td>
                <td style="padding: 10px;">
                  <div style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapedContent}">
                    ${contentPreview}
                  </div>
                  ${inq.reply ? `<div style="margin-top: 4px; padding: 6px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; font-size: 10px; color: #10b981;">
                    <strong>답변:</strong> ${inq.reply.substring(0, 100)}${inq.reply.length > 100 ? '...' : ''}
                  </div>` : ''}
                </td>
              </tr>
        `;
      }).join('') : ''}
      ${inquiries.length > 0 ? `
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
    
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">👥 회원별 상세 정보 (${users.length}명)</h3>
  `;

  // 각 사용자별로 리워드 데이터도 가져와서 표시
  for (let idx = 0; idx < users.length; idx++) {
    const u = users[idx];
    const userRewards = await loadUserRewardsForAdmin(u.uid);
    
    // 총 리워드 계산
    let userTotalRewardUSD = 0;
    userRewards.forEach((reward) => {
      const rewardUSD = (reward.amount || 0) * (prices[reward.symbol] || 0);
      userTotalRewardUSD += rewardUSD;
    });

    // 스테이킹 시작일 계산
    const calculateStakingPeriod = (startDate) => {
      if (!startDate) return '정보 없음';
      const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
      const now = new Date();
      const diffTime = Math.abs(now - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 30) return `${diffDays}일`;
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return `${months}개월 ${days}일`;
    };

    html += `
      <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">
              회원 #${idx + 1} · ${u.email || '이메일 없음'}
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              UID: ${u.uid.substring(0, 16)}...
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 리워드</div>
            <div style="font-size: 16px; font-weight: 600; color: #10b981;">${formatUSD(userTotalRewardUSD)}</div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 600; color: #9ca3af; margin-bottom: 8px;">💰 투자 내역</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
    `;

    ['BTC', 'ETH', 'XRP'].forEach((symbol) => {
      const amount = u[symbol] || 0;
      const startDate = u.stakeStartDates?.[symbol];
      const period = startDate ? calculateStakingPeriod(startDate) : '-';
      const startDateStr = startDate 
        ? (startDate.toDate ? startDate.toDate() : new Date(startDate)).toLocaleDateString('ko-KR')
        : '-';
      const usdValue = amount * (prices[symbol] || 0);
      
      if (amount > 0) {
        const monthlyApy = poolApy[symbol] / 12;
        const monthlyReward = (amount * monthlyApy) / 100;
        
        html += `
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 600;">${symbol}</div>
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              수량: <strong>${amount.toFixed(symbol === 'XRP' ? 2 : 4)}</strong>
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
              USD: ${formatUSD(usdValue)}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
              시작일: ${startDateStr}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 8px;">
              기간: ${period}
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
              APY: ${poolApy[symbol]}%<br/>
              예상 월: ${monthlyReward.toFixed(symbol === 'XRP' ? 2 : 6)}
            </div>
            <button 
              class="btn-primary" 
              style="width: 100%; padding: 6px; font-size: 10px;"
              onclick="handleApproveReward('${u.uid}', '${symbol}', ${amount}, ${monthlyReward}, ${poolApy[symbol]})"
            >
              리워드 승인
            </button>
          </div>
        `;
      }
    });

    html += `
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 600; color: #9ca3af; margin-bottom: 8px;">🎁 이자 내역 (${userRewards.length}건)</div>
    `;

    if (userRewards.length > 0) {
      html += `
          <div style="background: rgba(255,255,255,0.02); border-radius: 6px; overflow: hidden;">
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(255,255,255,0.05);">
                  <th style="padding: 8px; text-align: left; color: #9ca3af; font-weight: 600;">날짜</th>
                  <th style="padding: 8px; text-align: left; color: #9ca3af; font-weight: 600;">코인</th>
                  <th style="padding: 8px; text-align: right; color: #9ca3af; font-weight: 600;">수량</th>
                  <th style="padding: 8px; text-align: right; color: #9ca3af; font-weight: 600;">USD</th>
                  <th style="padding: 8px; text-align: center; color: #9ca3af; font-weight: 600;">APY</th>
                </tr>
              </thead>
              <tbody>
      `;

      userRewards.slice(0, 5).forEach((reward) => {
        const rewardDate = reward.approvedAt?.toDate ? reward.approvedAt.toDate() : new Date();
        const dateStr = rewardDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const rewardUSD = (reward.amount || 0) * (prices[reward.symbol] || 0);
        
        html += `
                <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 8px;">${dateStr}</td>
                  <td style="padding: 8px;">${reward.symbol}</td>
                  <td style="padding: 8px; text-align: right;">+${reward.amount.toFixed(reward.symbol === 'XRP' ? 2 : 4)}</td>
                  <td style="padding: 8px; text-align: right; color: #10b981;">${formatUSD(rewardUSD)}</td>
                  <td style="padding: 8px; text-align: center;">${reward.apy?.toFixed(1) || 0}%</td>
                </tr>
        `;
      });

      if (userRewards.length > 5) {
        html += `
                <tr>
                  <td colspan="5" style="padding: 8px; text-align: center; color: #9ca3af; font-size: 10px;">
                    외 ${userRewards.length - 5}건 더 있음
                  </td>
                </tr>
        `;
      }

      html += `
              </tbody>
            </table>
          </div>
      `;
    } else {
      html += `
          <div style="padding: 12px; text-align: center; color: #6b7280; font-size: 11px; background: rgba(255,255,255,0.02); border-radius: 6px;">
            리워드 내역이 없습니다.
          </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// 리워드 승인 처리 (전역 함수로 노출)
window.handleApproveReward = async function(userId, symbol, stakedAmount, rewardAmount, apy) {
  if (!confirm(`${symbol} 스테이킹 ${stakedAmount.toFixed(symbol === 'XRP' ? 2 : 4)}에 대한 리워드 ${rewardAmount.toFixed(symbol === 'XRP' ? 2 : 6)} ${symbol}를 승인하시겠습니까?`)) {
    return;
  }

  const success = await approveRewardForUser(userId, rewardAmount, symbol, apy);
  if (success) {
    alert('리워드가 승인되었습니다.');
    // 어드민 대시보드 새로고침 (페이지 또는 모달)
    const users = await loadAllUserStakes();
    const adminPageContent = $('#adminPageContent');
    if (adminPageContent) {
      // 어드민 페이지가 열려있는 경우
      await renderAdminDashboardContent(users, adminPageContent);
    } else {
      // 모달이 열려있는 경우 (백업)
      await renderAdminDashboard(users);
    }
    // 만약 해당 유저가 현재 로그인되어 있다면 리워드 내역도 새로고침
    if (currentUser && currentUser.uid === userId) {
      await renderRewards();
    }
  } else {
    alert('리워드 승인 중 오류가 발생했습니다.');
  }
};

// 리워드 수정 모달 열기 (전역 함수로 노출)
window.handleEditReward = function(rewardId, userId, amount, apy, date, symbol) {
  const modal = $('#rewardEditModal');
  const amountInput = $('#editRewardAmount');
  const apyInput = $('#editRewardApy');
  const dateInput = $('#editRewardDate');
  const statusText = $('#rewardEditStatusText');
  
  if (!modal || !amountInput || !apyInput || !dateInput) return;
  
  // 현재 값으로 입력 필드 채우기
  amountInput.value = amount;
  apyInput.value = apy;
  dateInput.value = date;
  
  // 상태 텍스트 초기화
  if (statusText) {
    statusText.textContent = '';
  }
  
  // 모달에 데이터 저장 (나중에 사용)
  modal.dataset.rewardId = rewardId;
  modal.dataset.userId = userId;
  modal.dataset.symbol = symbol;
  
  // 모달 열기
  modal.classList.add('show');
};

// 리워드 수정 모달 설정
function setupRewardEditModal() {
  const modal = $('#rewardEditModal');
  const closeBtn = $('#rewardEditCloseBtn');
  const updateBtn = $('#rewardUpdateBtn');
  const deleteBtn = $('#rewardDeleteBtn');
  const statusText = $('#rewardEditStatusText');
  
  if (!modal) return;
  
  // 모달 닫기
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }
  
  // 모달 배경 클릭 시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'rewardEditModal') {
      modal.classList.remove('show');
    }
  });
  
  // 수정 버튼
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      const rewardId = modal.dataset.rewardId;
      const userId = modal.dataset.userId;
      const amountInput = $('#editRewardAmount');
      const apyInput = $('#editRewardApy');
      const dateInput = $('#editRewardDate');
      
      if (!rewardId || !amountInput || !apyInput || !dateInput) return;
      
      const amount = parseFloat(amountInput.value);
      const apy = parseFloat(apyInput.value);
      const date = dateInput.value;
      
      // 유효성 검사
      if (!amount || amount <= 0) {
        if (statusText) {
          statusText.textContent = '리워드 수량을 올바르게 입력해주세요.';
          statusText.style.color = '#ef4444';
        }
        return;
      }
      
      if (!apy || apy < 0) {
        if (statusText) {
          statusText.textContent = 'APY를 올바르게 입력해주세요.';
          statusText.style.color = '#ef4444';
        }
        return;
      }
      
      if (!date) {
        if (statusText) {
          statusText.textContent = '날짜를 선택해주세요.';
          statusText.style.color = '#ef4444';
        }
        return;
      }
      
      // 상태 텍스트 업데이트
      if (statusText) {
        statusText.textContent = '수정 중...';
        statusText.style.color = 'var(--text)';
      }
      
      // 리워드 수정
      const success = await updateReward(rewardId, amount, apy, date);
      
      if (success) {
        if (statusText) {
          statusText.textContent = '리워드가 수정되었습니다.';
          statusText.style.color = '#10b981';
        }
        
        // 모달 닫기
        setTimeout(async () => {
          modal.classList.remove('show');
          
          // 어드민 대시보드 새로고침
          const users = await loadAllUserStakes();
          const adminPageContent = $('#adminPageContent');
          if (adminPageContent) {
            await renderAdminDashboardContent(users, adminPageContent);
          }
          
          // 만약 해당 유저가 현재 로그인되어 있다면 리워드 내역도 새로고침
          if (currentUser && currentUser.uid === userId) {
            await renderRewards();
          }
        }, 1000);
      } else {
        if (statusText) {
          statusText.textContent = '리워드 수정 중 오류가 발생했습니다.';
          statusText.style.color = '#ef4444';
        }
      }
    });
  }
  
  // 삭제 버튼
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const rewardId = modal.dataset.rewardId;
      const userId = modal.dataset.userId;
      
      if (!rewardId) return;
      
      if (!confirm('정말로 이 리워드 내역을 삭제하시겠습니까?')) {
        return;
      }
      
      // 상태 텍스트 업데이트
      if (statusText) {
        statusText.textContent = '삭제 중...';
        statusText.style.color = 'var(--text)';
      }
      
      // 리워드 삭제
      const success = await deleteReward(rewardId);
      
      if (success) {
        if (statusText) {
          statusText.textContent = '리워드가 삭제되었습니다.';
          statusText.style.color = '#10b981';
        }
        
        // 모달 닫기
        setTimeout(async () => {
          modal.classList.remove('show');
          
          // 어드민 대시보드 새로고침
          const users = await loadAllUserStakes();
          const adminPageContent = $('#adminPageContent');
          if (adminPageContent) {
            await renderAdminDashboardContent(users, adminPageContent);
          }
          
          // 만약 해당 유저가 현재 로그인되어 있다면 리워드 내역도 새로고침
          if (currentUser && currentUser.uid === userId) {
            await renderRewards();
          }
        }, 1000);
      } else {
        if (statusText) {
          statusText.textContent = '리워드 삭제 중 오류가 발생했습니다.';
          statusText.style.color = '#ef4444';
        }
      }
    });
  }
}

// 어드민 페이지 렌더링
async function renderAdminPage() {
  const container = $('#adminPageContent');
  if (!container) {
    console.error('어드민 페이지 컨테이너를 찾을 수 없습니다.');
    return;
  }
  
  console.log('어드민 페이지 렌더링 시작...');
  console.log('컨테이너 요소:', container);
  console.log('컨테이너 부모 요소:', container.parentElement);
  
  container.innerHTML = '<p style="color:#ffffff; text-align:center; padding: 40px; font-size: 18px; background: rgba(255,255,255,0.05); border-radius: 8px;">데이터를 불러오는 중...</p>';
  
  try {
    const users = await loadAllUserStakes();
    console.log('로드된 사용자 수:', users.length);
    console.log('사용자 데이터:', users);
    await renderAdminDashboardContent(users, container);
    console.log('어드민 페이지 렌더링 완료');
    console.log('컨테이너 최종 내용 길이:', container.innerHTML.length);
  } catch (error) {
    console.error('어드민 페이지 렌더링 중 오류:', error);
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 2px solid rgba(239, 68, 68, 0.3);">
        <h3 style="color: #ef4444; font-size: 20px; margin-bottom: 12px;">오류가 발생했습니다</h3>
        <p style="color: #fca5a5; font-size: 16px;">${error.message}</p>
      </div>
    `;
  }
}

// 어드민 대시보드 콘텐츠 렌더링 (모달과 페이지 공통 사용)
async function renderAdminDashboardContent(users, container) {
  if (!container) return;

  if (users.length === 0) {
    console.log('사용자 데이터가 없어서 빈 상태 메시지를 표시합니다.');
    container.innerHTML = `
      <div style="padding: 80px 40px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 16px; border: 2px solid rgba(255,255,255,0.1); margin: 40px 0;">
        <div style="font-size: 64px; margin-bottom: 24px; line-height: 1;">📊</div>
        <h3 style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 16px; line-height: 1.4;">등록된 회원이 없습니다</h3>
        <p style="font-size: 18px; color: #9ca3af; margin-bottom: 12px; line-height: 1.6;">
          현재 Firestore에 저장된 스테이킹 데이터가 없습니다.
        </p>
        <p style="font-size: 16px; color: #6b7280; margin-top: 24px; line-height: 1.6;">
          회원들이 스테이킹을 시작하면 여기에 데이터가 표시됩니다.
        </p>
        <div style="margin-top: 32px; padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
          <p style="font-size: 14px; color: #93c5fd; margin: 0;">
            💡 <strong>팁:</strong> 사용자가 스테이킹을 시작하면 <code>userStakes</code> 컬렉션에 데이터가 저장됩니다.
          </p>
        </div>
      </div>
    `;
    console.log('빈 상태 메시지가 표시되었습니다.');
    return;
  }

  // 가격 정보 가져오기
  const prices = {};
  try {
    const ids = Object.values(priceSource).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      prices.BTC = data.bitcoin?.usd || 90000;
      prices.ETH = data.ethereum?.usd || 3000;
      prices.XRP = data.ripple?.usd || 1;
    }
  } catch (e) {
    prices.BTC = 90000;
    prices.ETH = 3000;
    prices.XRP = 1;
  }

  let totalBTC = 0;
  let totalETH = 0;
  let totalXRP = 0;
  let totalUSD = 0;

  users.forEach((u) => {
    totalBTC += u.BTC || 0;
    totalETH += u.ETH || 0;
    totalXRP += u.XRP || 0;
    totalUSD += ((u.BTC || 0) * prices.BTC) + ((u.ETH || 0) * prices.ETH) + ((u.XRP || 0) * prices.XRP);
  });

  // APY 정보
  const poolApy = {
    BTC: 3.2,
    ETH: 6.8,
    XRP: 5.4,
  };

  // 문의 내역 불러오기
  const inquiries = await loadAllInquiries();
  const pendingInquiries = inquiries.filter(inq => inq.status === '대기중');

  // 통계 섹션
  let html = `
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">📊 전체 통계</h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;">
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 회원수</div>
          <div style="font-size: 20px; font-weight: 700; color: #fff;">${users.length}명</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 스테이킹 금액</div>
          <div style="font-size: 20px; font-weight: 700; color: #10b981;">${formatUSD(totalUSD)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">BTC 총합</div>
          <div style="font-size: 18px; font-weight: 600; color: #f97316;">${totalBTC.toFixed(4)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">ETH 총합</div>
          <div style="font-size: 18px; font-weight: 600; color: #4f46e5;">${totalETH.toFixed(4)}</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div>
          <div style="font-size: 11px; color: #9ca3af;">XRP 총합</div>
          <div style="font-size: 16px; font-weight: 600; color: #06b6d4;">${totalXRP.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">BTC USD</div>
          <div style="font-size: 16px; font-weight: 600;">${formatUSD(totalBTC * prices.BTC)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">ETH USD</div>
          <div style="font-size: 16px; font-weight: 600;">${formatUSD(totalETH * prices.ETH)}</div>
        </div>
      </div>
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">👥 회원별 상세 정보 (${users.length}명)</h3>
  `;

  // 각 사용자별로 리워드 데이터도 가져와서 표시
  for (let idx = 0; idx < users.length; idx++) {
    const u = users[idx];
    const userRewards = await loadUserRewardsForAdmin(u.uid);
    
    // 총 리워드 계산
    let userTotalRewardUSD = 0;
    userRewards.forEach((reward) => {
      const rewardUSD = (reward.amount || 0) * (prices[reward.symbol] || 0);
      userTotalRewardUSD += rewardUSD;
    });

    // 스테이킹 시작일 계산
    const calculateStakingPeriod = (startDate) => {
      if (!startDate) return '정보 없음';
      const start = startDate.toDate ? startDate.toDate() : new Date(startDate);
      const now = new Date();
      const diffTime = Math.abs(now - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 30) return `${diffDays}일`;
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return `${months}개월 ${days}일`;
    };

    html += `
      <div style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">
              회원 #${idx + 1} · ${u.email || '이메일 없음'}
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              UID: ${u.uid.substring(0, 16)}...
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">총 리워드</div>
            <div style="font-size: 16px; font-weight: 600; color: #10b981;">${formatUSD(userTotalRewardUSD)}</div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 600; color: #9ca3af; margin-bottom: 8px;">💰 투자 내역</div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
    `;

    ['BTC', 'ETH', 'XRP'].forEach((symbol) => {
      const amount = u[symbol] || 0;
      const startDate = u.stakeStartDates?.[symbol];
      const period = startDate ? calculateStakingPeriod(startDate) : '-';
      const startDateStr = startDate 
        ? (startDate.toDate ? startDate.toDate() : new Date(startDate)).toLocaleDateString('ko-KR')
        : '-';
      const usdValue = amount * (prices[symbol] || 0);
      
      if (amount > 0) {
        const monthlyApy = poolApy[symbol] / 12;
        const monthlyReward = (amount * monthlyApy) / 100;
        
        html += `
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; font-weight: 600;">${symbol}</div>
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px;">
              수량: <strong>${amount.toFixed(symbol === 'XRP' ? 2 : 4)}</strong>
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">
              USD: ${formatUSD(usdValue)}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
              시작일: ${startDateStr}
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 8px;">
              기간: ${period}
            </div>
            <div style="font-size: 10px; color: #9ca3af; margin-bottom: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
              APY: ${poolApy[symbol]}%<br/>
              예상 월: ${monthlyReward.toFixed(symbol === 'XRP' ? 2 : 6)}
            </div>
            <button 
              class="btn-primary" 
              style="width: 100%; padding: 6px; font-size: 10px;"
              onclick="handleApproveReward('${u.uid}', '${symbol}', ${amount}, ${monthlyReward}, ${poolApy[symbol]})"
            >
              리워드 승인
            </button>
          </div>
        `;
      }
    });

    html += `
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 600; color: #9ca3af; margin-bottom: 8px;">🎁 이자 내역 (${userRewards.length}건)</div>
    `;

    if (userRewards.length > 0) {
      html += `
          <div style="background: rgba(255,255,255,0.02); border-radius: 6px; overflow: hidden;">
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(255,255,255,0.05);">
                  <th style="padding: 8px; text-align: left; color: #9ca3af; font-weight: 600;">날짜</th>
                  <th style="padding: 8px; text-align: left; color: #9ca3af; font-weight: 600;">코인</th>
                  <th style="padding: 8px; text-align: right; color: #9ca3af; font-weight: 600;">수량</th>
                  <th style="padding: 8px; text-align: right; color: #9ca3af; font-weight: 600;">USD</th>
                  <th style="padding: 8px; text-align: center; color: #9ca3af; font-weight: 600;">APY</th>
                  <th style="padding: 8px; text-align: center; color: #9ca3af; font-weight: 600;">관리</th>
                </tr>
              </thead>
              <tbody>
      `;

      userRewards.slice(0, 5).forEach((reward) => {
        const rewardDate = reward.approvedAt?.toDate ? reward.approvedAt.toDate() : new Date();
        const dateStr = rewardDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const rewardUSD = (reward.amount || 0) * (prices[reward.symbol] || 0);
        const dateInputValue = rewardDate.toISOString().split('T')[0];
        
        html += `
                <tr style="border-top: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 8px;">${dateStr}</td>
                  <td style="padding: 8px;">${reward.symbol}</td>
                  <td style="padding: 8px; text-align: right;">+${reward.amount.toFixed(reward.symbol === 'XRP' ? 2 : 4)}</td>
                  <td style="padding: 8px; text-align: right; color: #10b981;">${formatUSD(rewardUSD)}</td>
                  <td style="padding: 8px; text-align: center;">${reward.apy?.toFixed(1) || 0}%</td>
                  <td style="padding: 8px; text-align: center;">
                    <button 
                      class="btn-outline" 
                      style="padding: 4px 8px; font-size: 10px;"
                      onclick="handleEditReward('${reward.id}', '${u.uid}', ${reward.amount}, ${reward.apy || 0}, '${dateInputValue}', '${reward.symbol}')"
                    >
                      수정
                    </button>
                  </td>
                </tr>
        `;
      });

      if (userRewards.length > 5) {
        html += `
                <tr>
                  <td colspan="6" style="padding: 8px; text-align: center; color: #9ca3af; font-size: 10px;">
                    외 ${userRewards.length - 5}건 더 있음
                  </td>
                </tr>
        `;
      }

      html += `
              </tbody>
            </table>
          </div>
      `;
    } else {
      html += `
          <div style="padding: 12px; text-align: center; color: #6b7280; font-size: 11px; background: rgba(255,255,255,0.02); border-radius: 6px;">
            리워드 내역이 없습니다.
          </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function renderAdminDashboard(users) {
  const container = $('#adminContent');
  await renderAdminDashboardContent(users, container);
}

function setupAdminModal() {
  const adminBtn = $('#adminBtn');
  const modal = $('#adminModal');
  const closeBtn = $('#adminCloseBtn');

  if (adminBtn) {
    adminBtn.addEventListener('click', async () => {
      // 모달 대신 페이지로 이동
      navigateToPage('admin');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('show');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'adminModal') modal.classList.remove('show');
    });
  }
}

// Page navigation
async function navigateToPage(page) {
  // Hide all page sections (will be shown later if needed)
  document.querySelectorAll('.page-section').forEach((section) => {
    section.style.display = 'none';
  });

  // Update nav button active states
  document.querySelectorAll('.nav-item-horizontal').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-page') === page) {
      btn.classList.add('active');
    }
  });

  // Show the requested page
  if (page === 'dashboard' || page === 'pools' || page === 'faq') {
    // Show main dashboard content (default visible sections)
    document.querySelectorAll('.content-section:not(.page-section), .pre-login-welcome').forEach((section) => {
      section.style.display = '';
    });
    
    // If pools page, scroll to pools section
    if (page === 'pools') {
      setTimeout(() => {
        const poolsSection = document.querySelector('.pools-rewards-container');
        if (poolsSection) {
          poolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return; // Don't scroll to top for pools
    }
    
    // If FAQ page, scroll to FAQ section
    if (page === 'faq') {
      setTimeout(() => {
        const faqSection = document.getElementById('faq-section');
        if (faqSection) {
          // 약간의 오프셋을 추가하여 네비게이션 바에 가려지지 않도록
          const offsetTop = faqSection.offsetTop - 80;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }, 100);
      return; // Don't scroll to top for FAQ
    }
  } else {
    // Hide main content sections for other pages
    document.querySelectorAll('.content-section:not(.page-section), .pre-login-welcome').forEach((section) => {
      section.style.display = 'none';
    });
    
    // 모든 page-section 숨기기 (어드민 페이지 제외)
    document.querySelectorAll('.page-section').forEach((section) => {
      if (section.id !== `${page}-page`) {
        section.style.display = 'none';
      }
    });
    
    // 어드민 페이지인 경우 (권한 확인 먼저)
    if (page === 'admin') {
      // 로그인하지 않은 경우
      if (!currentUser) {
        alert('어드민 페이지 접근을 위해 로그인이 필요합니다.');
        await navigateToPage('dashboard');
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        // 로그인 모달 열기
        setTimeout(() => {
          const loginModal = $('#loginModal');
          const loginBtn = $('#loginBtn');
          if (loginModal) {
            loginModal.classList.add('show');
          } else if (loginBtn) {
            loginBtn.click();
          }
        }, 100);
        return;
      }
      
      // 어드민 권한 확인 (이중 체크)
      if (!isAdmin || !currentUser || currentUser.email !== ADMIN_EMAIL) {
        const userEmail = currentUser ? currentUser.email : '로그인 필요';
        alert(`어드민 권한이 필요합니다.\n\n현재 로그인 계정: ${userEmail}\n필요한 계정: ${ADMIN_EMAIL}\n\n관리자 계정으로 로그인해주세요.`);
        await navigateToPage('dashboard');
        // URL도 되돌리기
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        return;
      }
      
      // 어드민 페이지 표시
      const pageElement = document.getElementById(`${page}-page`);
      if (!pageElement) {
        console.error('어드민 페이지 요소를 찾을 수 없습니다.');
        alert('어드민 페이지를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        return;
      }
      
      console.log('어드민 페이지 표시 중...');
      console.log('페이지 요소:', pageElement);
      console.log('페이지 요소 현재 display:', window.getComputedStyle(pageElement).display);
      
      // 페이지 요소를 확실히 표시
      pageElement.style.display = 'block';
      pageElement.style.visibility = 'visible';
      pageElement.style.opacity = '1';
      
      console.log('페이지 요소 display 설정 후:', window.getComputedStyle(pageElement).display);
      console.log('페이지 요소 offsetHeight:', pageElement.offsetHeight);
      console.log('페이지 요소 offsetWidth:', pageElement.offsetWidth);
      
      // 강제로 레이아웃 재계산
      void pageElement.offsetHeight;
      
      // 스크롤을 맨 위로 이동
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // 어드민 대시보드 렌더링 (비동기 처리)
      await renderAdminPage();
      
      // 렌더링 후 다시 스크롤 확인 및 요소 확인
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        console.log('렌더링 후 페이지 요소 offsetHeight:', pageElement.offsetHeight);
        console.log('렌더링 후 컨테이너 내용:', $('#adminPageContent')?.innerHTML?.substring(0, 100));
      }, 100);
      
      return;
    }
    
    // Show the specific page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
      pageElement.style.display = 'block';
    }
    
    // 리워드 페이지인 경우 리워드 렌더링
    if (page === 'rewards') {
      renderRewards();
    }
    
    // 문의 페이지인 경우 이메일 자동 입력
    if (page === 'inquiry') {
      if (currentUser && currentUser.email) {
        const emailInput = $('#inquiryEmail');
        if (emailInput) {
          emailInput.value = currentUser.email;
        }
      }
    }
    
    // 회원가입 페이지 표시 (활성화됨)
  }

  // Scroll to top for dashboard and other pages (not pools)
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // URL 업데이트 (히스토리 API 사용) - 실제 네비게이션 시에만 업데이트
  // 초기 로드 시에는 업데이트하지 않음 (무한 루프 방지)
  if (window.history && window.history.pushState && !window.__isInitialLoad) {
    const url = page === 'dashboard' ? '/' : `/${page}`;
    window.history.pushState({ page }, '', url);
  }
}

// Expose navigateToPage globally for inline handlers and logo click
window.navigateToPage = navigateToPage;

// 로고 클릭 핸들러 함수 (전역으로 사용)
function handleLogoClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // navigateToPage 함수 사용
  const navFunction = typeof navigateToPage === 'function' ? navigateToPage : window.navigateToPage;
  
  if (navFunction) {
    navFunction('dashboard');
  } else {
    // 대시보드 버튼 클릭
    const dashboardBtn = document.querySelector('.nav-item-horizontal[data-page="dashboard"]');
    if (dashboardBtn) {
      dashboardBtn.click();
    } else {
      // 최후의 수단: URL 변경
      window.location.href = '/';
    }
  }
  
  return false; // inline handler에서 사용
}

// 전역으로 노출 (HTML inline onclick에서 사용)
window.handleLogoClick = handleLogoClick;

function setupNavigation() {
  // 로고 클릭 이벤트: 대시보드로 이동
  // 직접 요소 찾기
  const logoLink = document.getElementById('logoLink') || document.querySelector('.logo-horizontal');
  if (logoLink) {
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    logoLink.removeEventListener('click', handleLogoClick);
    logoLink.addEventListener('click', handleLogoClick);
    console.log('로고 클릭 이벤트 리스너 등록됨');
  }
  
  // 로고 내부 모든 요소에도 클릭 이벤트 추가
  const logoMark = document.querySelector('.logo-mark');
  const logoText = document.querySelector('.logo-text');
  const brandText = document.querySelector('.brand');
  
  [logoMark, logoText, brandText].forEach((element) => {
    if (element) {
      element.style.cursor = 'pointer';
      element.addEventListener('click', handleLogoClick);
    }
  });
  
  // 이벤트 위임 추가 (capture phase에서 작동 - 가장 먼저 실행)
  // 리워드 페이지 등 모든 상황에서 작동하도록
  document.addEventListener('click', (e) => {
    // 로고 관련 요소 클릭 감지
    const target = e.target;
    const logoElement = target.closest('#logoLink, .logo-horizontal');
    
    if (logoElement) {
      handleLogoClick(e);
      return;
    }
    
    // 로고 내부 요소들도 체크
    if (target.closest('.logo-mark, .logo-text, .brand')) {
      handleLogoClick(e);
    }
  }, true); // capture phase - 이벤트 전파 전에 실행
  
  // Add click handlers to all nav items
  document.querySelectorAll('.nav-item-horizontal').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const page = btn.getAttribute('data-page');
      if (page) {
        navigateToPage(page);
      }
    });
  });
  
  // 회원가입 버튼 클릭 이벤트 (navbar-actions에 위치)
  const signupNavBtn = $('#signupNavBtn');
  if (signupNavBtn) {
    signupNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage('signup');
    });
  }
}

// URL 기반 라우팅 처리 함수
function handleURLRouting() {
  const path = window.location.pathname;
  
  // 어드민 페이지 접근 처리
  if (path === '/admin' || path === '/admin/') {
    // Firebase 인증이 완료되지 않았으면 잠시 대기 (최대 3초)
    if (!window.__firebaseInitialized && auth === undefined) {
      console.log('Firebase 초기화 대기 중...');
      setTimeout(() => handleURLRouting(), 100);
      return;
    }
    
    // 로그인하지 않은 경우
    if (!currentUser) {
      // URL 먼저 변경
      if (window.history && window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
      navigateToPage('dashboard');
      // 로그인 모달 열기
      setTimeout(() => {
        const loginModal = $('#loginModal');
        const loginBtn = $('#loginBtn');
        if (loginModal) {
          loginModal.classList.add('show');
        } else if (loginBtn) {
          loginBtn.click();
        }
        alert('어드민 페이지 접근을 위해 관리자 계정으로 로그인해주세요.');
      }, 300);
      return;
    }
    
      // 어드민 권한 이중 확인
      if (isAdmin && currentUser && currentUser.email === ADMIN_EMAIL) {
        navigateToPage('admin');
      } else {
        // URL 먼저 변경
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        navigateToPage('dashboard');
        // 일반 계정이 직접 /admin URL로 접근한 경우에만 알림 표시
        // (로그인 후 자동 리다이렉트가 아닌 경우)
        const userEmail = currentUser ? currentUser.email : '로그인 필요';
        // 알림은 사용자가 직접 어드민 버튼을 클릭하거나 /admin으로 접근한 경우에만 표시
        // onAuthStateChanged에서 자동으로 처리된 경우는 알림 없이 처리
        console.log('일반 계정이 어드민 페이지에 접근 시도 - 대시보드로 이동');
      }
      return;
  }
  
  // 회원가입 페이지 (활성화됨)
  if (path === '/signup' || path === '/signup/') {
    navigateToPage('signup');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', '/signup');
    }
    return;
  }
  
  // 리워드 페이지
  if (path === '/rewards' || path === '/rewards/') {
    navigateToPage('rewards');
    return;
  }
  
  // FAQ 페이지
  if (path === '/faq' || path === '/faq/' || path === '/qna' || path === '/qna/') {
    navigateToPage('faq');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', '/faq');
    }
    return;
  }
  
  // 문의 페이지
  if (path === '/inquiry' || path === '/inquiry/') {
    navigateToPage('inquiry');
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', '/inquiry');
    }
    return;
  }
  
  // 기본 대시보드
  if (path === '/' || path === '') {
    navigateToPage('dashboard');
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // 초기 로드 플래그 설정
  window.__isInitialLoad = true;
  
  // Setup navigation first
  setupNavigation();
  
  // 초기 URL 라우팅 처리 (Firebase 초기화 전에 먼저 체크)
  // 어드민 접근 시도는 로그인 후에 처리되도록 함
  const currentPath = window.location.pathname;
  if (currentPath === '/admin' || currentPath === '/admin/') {
    // 어드민 접근 시도 시 대시보드로 먼저 이동 (Firebase 초기화 후 권한 체크)
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', '/');
    }
    navigateToPage('dashboard');
  }
  
  // Firebase 초기화 (Auth 상태 감지 시작) - 먼저 초기화
  await initFirebase();
  
  // Firebase 초기화 후 URL 라우팅 처리 (onAuthStateChanged에서도 호출됨)
  // 로그인 상태가 확인된 후 어드민 접근을 처리
  handleURLRouting();
  
  // 초기 로드 플래그 해제
  setTimeout(() => {
    window.__isInitialLoad = false;
  }, 1000);
  
  // 브라우저 뒤로/앞으로 버튼 처리
  window.addEventListener('popstate', (event) => {
    handleURLRouting();
  });

  renderPortfolio();
  renderPools();
  renderActivity();
  animateApy();
  setupSimulator();
  setupStakeModal();
  setupTabs();
  setupThemeToggle();
  setupWalletButton();
  setupRewardFilters();
  setupSignupForm();
  setupInquiryForm();

  // 로그인 UI 세팅 (Firebase Auth 모듈 동적 로드)
  setupLogin().catch(err => {
    console.error('setupLogin 초기화 에러:', err);
  });

  // 어드민 모달 세팅
  setupAdminModal();

  // 리워드 수정 모달 세팅
  setupRewardEditModal();

  // 실제 시세 반영 시도
  fetchAndApplyPrices();
});
