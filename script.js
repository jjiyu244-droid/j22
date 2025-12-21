// Staking portfolio data (템플릿 - 실제 데이터는 userStakes에서 가져옴)
const portfolioData = [
  {
    symbol: 'BTC',
    label: '비트코인 (BTC)',
    network: '비트코인 메인넷',
    color: '#f97316',
    bg: '#ffedd5',
    amount: 0, // 기본값 0 - userStakes에서 실제 값으로 업데이트됨
    amountBase: 0,
    usd: 0,
    percent: 0,
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  },
  {
    symbol: 'ETH',
    label: '이더리움 (ETH)',
    network: '이더리움 메인넷',
    color: '#4f46e5',
    bg: '#e0e7ff',
    amount: 0,
    amountBase: 0,
    usd: 0,
    percent: 0,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    symbol: 'XRP',
    label: '리플 (XRP)',
    network: '리플 네트워크',
    color: '#06b6d4',
    bg: '#cffafe',
    amount: 0,
    amountBase: 0,
    usd: 0,
    percent: 0,
    logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp.png',
  },
  {
    symbol: 'SOL',
    label: '솔라나 (SOL)',
    network: '솔라나 메인넷',
    color: '#9945FF',
    bg: '#f3e8ff',
    amount: 0,
    amountBase: 0,
    usd: 0,
    percent: 0,
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
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
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
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
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
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
    logoUrl: 'https://assets.coingecko.com/coins/images/44/small/xrp.png',
  },
  {
    id: 'sol-stake',
    name: '솔라나 스테이킹 (SOL)',
    symbol: 'SOL',
    apr: 7.2,
    tvl: 75_000_000,
    risk: '중간',
    type: 'volatile',
    network: '솔라나 메인넷',
    lockup: '14일',
    logoUrl: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
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

// 전역으로 노출 (admin.html에서 사용)
window.formatUSD = formatUSD;

// Map our symbols to CoinGecko IDs
const priceSource = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  SOL: 'solana',
};

// 전역으로 노출 (admin.html에서 사용)
window.priceSource = priceSource;

async function fetchAndApplyPrices() {
  // 스테이킹이 있는지 확인
  const hasStaking = Object.values(userStakes).some(amount => amount > 0);
  if (!hasStaking) {
    // 스테이킹이 없으면 0으로 설정하고 렌더링
    portfolioData.forEach((item) => {
      item.usd = 0;
      item.percent = 0;
    });
    renderPortfolio();
    if ($('#totalStaked')) {
      $('#totalStaked').textContent = formatUSD(0);
    }
    if ($('#estApy')) {
      $('#estApy').textContent = '0%';
    }
    if ($('#pendingRewards')) {
      $('#pendingRewards').textContent = '0';
    }
    return;
  }

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
      if (!price) {
        item.usd = 0;
        return;
      }
      // 스테이킹 수량이 있는 경우만 USD 계산
      const stakeAmount = userStakes[item.symbol] || 0;
      item.usd = stakeAmount * price;
      total += item.usd;
    });

    if (total > 0) {
      portfolioData.forEach((item) => {
        item.percent = Math.round((item.usd / total) * 100);
      });
    } else {
      portfolioData.forEach((item) => {
        item.percent = 0;
      });
    }

    // Re-render UI with live-ish prices
    renderPortfolio();
    if ($('#totalStaked')) {
      $('#totalStaked').textContent = formatUSD(total);
    }
  } catch (e) {
    // 네트워크 에러 시에는 0으로 설정
    console.error('가격 데이터를 불러오지 못했습니다:', e);
    portfolioData.forEach((item) => {
      item.usd = 0;
      item.percent = 0;
    });
    renderPortfolio();
    if ($('#totalStaked')) {
      $('#totalStaked').textContent = formatUSD(0);
    }
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
  SOL: 0,
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

  // 🔥 핵심: Firebase Auth Persistence 설정 (새로고침 후에도 로그인 유지)
  try {
    const authModule = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    const { setPersistence, browserLocalPersistence } = authModule;
    
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ Firebase Auth Persistence 설정 완료 (browserLocalPersistence)');
  } catch (persistenceError) {
    console.error('❌ Firebase Auth Persistence 설정 실패:', persistenceError);
    // Persistence 설정 실패해도 계속 진행 (기본값 사용)
  }

  // 페이지 로드 시 localStorage에서 사용자 정보 복구 시도
  try {
    const savedUserData = localStorage.getItem('user');
    if (savedUserData) {
      const userData = JSON.parse(savedUserData);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24시간
      
      // 저장된 데이터가 24시간 이내인지 확인 (선택적)
      if (userData.timestamp && (now - userData.timestamp) < oneDay) {
        console.log('✅ localStorage에서 사용자 정보를 찾았습니다:', userData.email);
        // Firebase Auth가 자동으로 세션을 복구하므로 여기서는 로그만 남김
        // 실제 인증 상태는 onAuthStateChanged에서 확인됨
      } else {
        // 오래된 데이터는 삭제
        localStorage.removeItem('user');
        console.log('⚠️ 저장된 사용자 정보가 만료되어 삭제했습니다.');
      }
    }
  } catch (storageError) {
    console.warn('localStorage 읽기 실패:', storageError);
  }

  // Auth 상태 변화 감지
  const { onAuthStateChanged } = await import(
    'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js'
  );
  
  // 🔥 핵심: onAuthStateChanged를 Promise로 감싸서 첫 번째 인증 상태 확인 완료를 기다림
  const authStatePromise = new Promise((resolve) => {
    let isFirstCall = true;
    
    onAuthStateChanged(auth, async (user) => {
      console.log('🔄 onAuthStateChanged 호출됨:', user ? `로그인됨 (${user.email})` : '로그아웃됨');
      
      if (user) {
        console.log('✅ 로그인 상태 확인:', user.email, user.uid);
        currentUser = { email: user.email, uid: user.uid };
        isAdmin = user.email === ADMIN_EMAIL;
        
        // localStorage에 사용자 정보 저장 (최신 정보로 업데이트)
        const userData = {
          email: user.email,
          uid: user.uid,
          timestamp: Date.now()
        };
        try {
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('✅ 로그인 상태 복구: localStorage 업데이트 완료');
        } catch (storageError) {
          console.warn('localStorage 저장 실패:', storageError);
        }
        
        await loadUserStakesFromFirestore(user.uid);
        await loadUserRewardsFromFirestore(user.uid);
        applyUserStakesToPortfolio();
        await fetchAndApplyPrices(); // 가격 업데이트 후 포트폴리오 렌더링
        updateLoginUI();
        updateAdminUI();
        
        // URL 기반 라우팅 처리 (Firebase 초기화 후)
        handleURLRouting();
        
        // 리워드 페이지가 현재 표시 중이면 리워드 렌더링
        const rewardsPage = document.getElementById('rewards-page');
        if (rewardsPage && rewardsPage.style.display !== 'none') {
          await renderRewards();
        }
      } else {
        console.log('❌ 로그아웃 상태 확인');
        currentUser = null;
        isAdmin = false;
        userStakes = { BTC: 0, ETH: 0, XRP: 0, SOL: 0 };
        userRewards = [];
        
        // localStorage에서 사용자 정보 삭제
        try {
          localStorage.removeItem('user');
          console.log('✅ 로그아웃 상태: localStorage에서 사용자 정보 삭제 완료');
        } catch (storageError) {
          console.warn('localStorage 삭제 실패:', storageError);
        }
        
        updateLoginUI();
        updateAdminUI();
        
        // URL 기반 라우팅 처리
        handleURLRouting();
        
        // 리워드 페이지가 현재 표시 중이면 빈 상태 표시
        const rewardsPage = document.getElementById('rewards-page');
        if (rewardsPage && rewardsPage.style.display !== 'none') {
          await renderRewards();
        }
      }
      
      // 첫 번째 호출 완료 시 Promise resolve
      if (isFirstCall) {
        isFirstCall = false;
        console.log('✅ 첫 번째 인증 상태 확인 완료');
        resolve();
      }
    });
  });
  
  // 첫 번째 인증 상태 확인이 완료될 때까지 대기
  await authStatePromise;
  console.log('✅ initFirebase 완료: 인증 상태 확인됨');
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
      userStakes.SOL = data.SOL || 0;
    } else {
      userStakes = { BTC: 0, ETH: 0, XRP: 0, SOL: 0 };
    }
  } catch (e) {
    console.error('Firestore에서 데이터를 불러오지 못했습니다:', e);
    userStakes = { BTC: 0, ETH: 0, XRP: 0, SOL: 0 };
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
    ['BTC', 'ETH', 'XRP', 'SOL'].forEach((symbol) => {
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
      // 인덱스가 정상 작동하면 여기서 반환
      return;
    } catch (indexError) {
      // 인덱스가 없거나 아직 생성 중이면 orderBy 없이 조회 후 클라이언트에서 정렬
      // 인덱스 오류인지 확인 (인덱스 관련 오류는 무시하고 fallback 사용)
      const isIndexError = indexError.message && (
        indexError.message.includes('index') || 
        indexError.message.includes('The query requires an index')
      );
      
      if (!isIndexError) {
        // 인덱스 오류가 아니면 그대로 throw
        throw indexError;
      }
      
      // 인덱스 오류는 조용히 fallback 사용 (콘솔에 출력하지 않음)
      // 인덱스가 완전히 생성되면 자동으로 서버 정렬 사용됨
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
    // 인덱스 오류가 아닌 경우에만 에러 로그 출력
    const isIndexError = e.message && (
      e.message.includes('index') || 
      e.message.includes('The query requires an index')
    );
    
    if (!isIndexError) {
      console.error('Firestore 리워드 데이터 로드 실패:', e.message || e);
    }
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
  // userStakes 수량을 포트폴리오 amount에 설정
  portfolioData.forEach((item) => {
    const stakeAmount = userStakes[item.symbol] || 0;
    item.amount = stakeAmount;
    item.amountBase = stakeAmount; // 기본값도 실제 스테이킹 수량으로 설정
  });
}

async function setupLogin() {
  const loginBtn = $('#loginBtn');
  const modal = $('#loginModal');
  const closeBtn = $('#loginCloseBtn');
  const confirmBtn = $('#loginConfirmBtn');
  const statusText = $('#loginStatusText');
  const titleEl = $('#loginModalTitle');
  const toSignup = $('#toSignup');
  const toLogin = $('#toLogin');
  let mode = 'login'; // 'login' | 'signup'

  // Firebase Auth 모듈 동적 import
  let signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword;
  try {
    const authModule = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
    signOut = authModule.signOut;
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
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
          isAdmin = false;
          userStakes = { BTC: 0, ETH: 0, XRP: 0, SOL: 0 };
          userRewards = [];
          
          // localStorage에서 사용자 정보 삭제
          try {
            localStorage.removeItem('user');
            console.log('✅ 로그아웃: localStorage에서 사용자 정보 삭제 완료');
          } catch (storageError) {
            console.warn('localStorage 삭제 실패:', storageError);
          }
          
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

    // 어드민 페이지인지 확인
    const isAdminPage = window.location.pathname.includes('admin.html');
    
    // 어드민 페이지에서는 관리자 계정만 로그인 가능
    if (isAdminPage) {
      const adminEmail = typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'jjiyu244@gmail.com';
      if (email.toLowerCase() !== adminEmail.toLowerCase()) {
        if (statusText) {
          statusText.innerHTML = `
            <span style="color: #ef4444;">❌ 관리자 계정만 로그인할 수 있습니다.</span><br/>
            <span style="color: #9ca3af; font-size: 12px;">허용된 계정: ${adminEmail}</span>
          `;
        }
        return;
      }
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
      
      // 어드민 페이지에서 로그인 성공 후 관리자 계정인지 다시 확인
      if (isAdminPage) {
        const adminEmail = typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'jjiyu244@gmail.com';
        if (result.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
          // 관리자가 아니면 로그아웃
          const { signOut } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
          await signOut(currentAuth);
          if (statusText) {
            statusText.innerHTML = `
              <span style="color: #ef4444;">❌ 관리자 계정만 로그인할 수 있습니다.</span><br/>
              <span style="color: #9ca3af; font-size: 12px;">허용된 계정: ${adminEmail}</span>
            `;
          }
          return;
        }
      }
      
      // 로그인 성공 시 localStorage에 사용자 정보 저장
      const userData = {
        email: result.user.email,
        uid: result.user.uid,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ 사용자 정보를 localStorage에 저장했습니다.');
      } catch (storageError) {
        console.warn('localStorage 저장 실패 (사생활 보호 모드일 수 있음):', storageError);
      }
      
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
  }
  
  // 폼 제출 이벤트 (엔터키 등)
  const loginForm = modal?.querySelector('form') || modal?.querySelector('.modal-body');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
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
  if (!list) return; // admin.html에는 포트폴리오 요소가 없음
  list.innerHTML = '';

  // 스테이킹이 있는지 확인 (userStakes의 합이 0보다 큰지)
  const hasStaking = Object.values(userStakes).some(amount => amount > 0);
  const stakingItems = portfolioData.filter(item => (userStakes[item.symbol] || 0) > 0);

  // 스테이킹이 없으면 빈 상태 표시
  if (!hasStaking || stakingItems.length === 0) {
    list.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-soft);">
        <div style="font-size: 16px; margin-bottom: 8px; color: var(--text);">아직 스테이킹 내역이 없습니다</div>
        <div style="font-size: 14px; margin-bottom: 24px;">스테이킹을 시작하여 수익을 창출하세요</div>
        <button class="btn-primary" onclick="document.querySelector('[data-stake-id]')?.click();" style="padding: 12px 24px; font-size: 14px; font-weight: 600;">
          스테이킹 시작하기
        </button>
      </div>
    `;
    
    // 도넛 차트도 빈 상태로
    const donutChart = $('#donutChart');
    if (donutChart) {
      donutChart.style.background = 'conic-gradient(rgba(148, 163, 184, 0.2) 0deg 360deg)';
      const donutValue = donutChart.querySelector('.donut-value');
      const donutLabel = donutChart.querySelector('.donut-label');
      if (donutValue) donutValue.textContent = '0%';
      if (donutLabel) donutLabel.textContent = 'Staked';
    }
    
    // 총 스테이킹 자산도 0으로 업데이트
    if ($('#totalStaked')) {
      $('#totalStaked').textContent = formatUSD(0);
    }
    
    return;
  }

  // 도넛 차트 동적 렌더링 (스테이킹이 있는 경우만)
  const donutChart = $('#donutChart');
  if (donutChart) {
    // 각 자산의 각도 계산
    let currentAngle = 0;
    const segments = stakingItems
      .filter(item => item.percent > 0)
      .map((item) => {
        const angle = (item.percent / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;
        return {
          color: item.color,
          start: startAngle,
          end: endAngle
        };
      });

    // conic-gradient 생성
    if (segments.length > 0) {
      const gradientParts = segments.map(seg => 
        `${seg.color} ${seg.start}deg ${seg.end}deg`
      ).join(', ');
      
      donutChart.style.background = `conic-gradient(${gradientParts})`;
    }
    
    // 도넛 차트 중앙 텍스트 업데이트
    const donutValue = donutChart.querySelector('.donut-value');
    const donutLabel = donutChart.querySelector('.donut-label');
    if (donutValue) {
      const totalPercent = stakingItems.reduce((sum, item) => sum + (item.percent || 0), 0);
      donutValue.textContent = `${Math.min(100, totalPercent)}%`;
    }
    if (donutLabel) {
      donutLabel.textContent = 'Staked';
    }
  }

  // 스테이킹이 있는 항목만 표시
  stakingItems.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'portfolio-item';
    const iconContent = item.logoUrl 
      ? `<img src="${item.logoUrl}" alt="${item.symbol}" class="token-logo ${item.symbol.toLowerCase()}-logo" style="width: 100%; height: 100%; object-fit: contain;" />`
      : (item.label ? item.label[0] : item.symbol[0]);
    el.innerHTML = `
      <div class="token-info">
        <div class="token-icon" style="background:${item.bg};color:${item.color}">
          ${iconContent}
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
  if (!container) return; // admin.html에는 풀 리스트 요소가 없음
  container.innerHTML = '';

  pools
    .filter((p) => (filter === 'all' ? true : p.type === filter))
    .forEach((pool) => {
      const el = document.createElement('div');
      el.className = 'pool-card';
      const iconContent = pool.logoUrl 
        ? `<img src="${pool.logoUrl}" alt="${pool.symbol}" class="pool-logo ${pool.symbol.toLowerCase()}-logo" style="width: 100%; height: 100%; object-fit: contain;" />`
        : pool.symbol[0];
      el.innerHTML = `
        <div class="pool-main">
          <div class="token-icon" style="background:rgba(148,163,184,0.2);color:#e5e7eb">
            ${iconContent}
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
  if (!list) return; // admin.html에는 활동 리스트 요소가 없음
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
  const estApyEl = $('#estApy');
  const apyProgressEl = $('#apyProgress');
  if (!estApyEl || !apyProgressEl) return; // admin.html에는 APY 요소가 없음
  estApyEl.textContent = `${apy}%`;
  apyProgressEl.style.width = `${Math.min(apy * 1.2, 100)}%`;
}

// Reward simulator
function setupSimulator() {
  const simBtn = $('#simBtn');
  if (!simBtn) return; // admin.html에는 시뮬레이터 버튼이 없음
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

// 스테이킹 신청 저장 (유저가 신청만 가능)
async function createStakingRequest(poolId, amount) {
  if (!currentUser || !currentUser.uid) {
    throw new Error('로그인이 필요합니다.');
  }
  
  const pool = pools.find((p) => p.id === poolId);
  if (!pool) {
    throw new Error('스테이킹 풀을 찾을 수 없습니다.');
  }
  
  try {
    const { collection, addDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const requestsRef = collection(db, 'staking_requests');
    
    await addDoc(requestsRef, {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      poolId: poolId,
      symbol: pool.symbol,
      amount: parseFloat(amount),
      network: pool.network,
      requestedApy: pool.apr, // 풀의 기본 APY
      status: 'pending', // pending, approved, rejected
      createdAt: serverTimestamp(),
      approvedAt: null,
      approvedBy: null,
    });
    
    return true;
  } catch (e) {
    console.error('스테이킹 신청 저장 실패:', e);
    throw e;
  }
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
    </div>
  `;
  $('#stakeAmount').value = '';
  $('#stakeHelper').textContent = '';

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
      helper.textContent = '로그인 후에만 스테이킹이 가능합니다.';
      return;
    }

    helper.classList.remove('text-danger');
    
    // 스테이킹 신청 (관리자 승인 대기)
    try {
      $('#stakeConfirmBtn').textContent = '신청 중...';
      $('#stakeConfirmBtn').disabled = true;
      
      await createStakingRequest(currentPool.id, amount);
      
      helper.textContent = `✅ 스테이킹 신청이 완료되었습니다. 관리자 승인 후 반영됩니다.`;
      helper.style.color = '#10b981';
      
      // prepend virtual activity
      activity.unshift({
        type: '스테이킹 신청',
        status: '대기중',
        time: '방금 전',
        desc: currentPool.name,
        amount: `+${amount} ${currentPool.symbol}`,
        positive: true,
      });
      if (activity.length > 12) activity.pop();
      renderActivity();

      // light feedback
      $('#stakeConfirmBtn').textContent = '신청 완료';
      setTimeout(() => {
        closeStakeModal();
        $('#stakeConfirmBtn').textContent = '스테이킹 신청';
        $('#stakeConfirmBtn').disabled = false;
      }, 1500);
    } catch (error) {
      helper.textContent = `❌ 신청 실패: ${error.message}`;
      helper.classList.add('text-danger');
      $('#stakeConfirmBtn').textContent = '스테이킹 신청';
      $('#stakeConfirmBtn').disabled = false;
    }
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

// Wallet button
function setupWalletButton() {
  const walletBtn = $('#walletBtn');
  walletBtn.addEventListener('click', () => {
    walletBtn.textContent = '0xF3...D92A';
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
    // db가 없으면 window.db 또는 전역 db 사용
    const firestoreDb = db || window.db || (window.__firebase && window.__firebase.db);
    if (!firestoreDb) {
      console.error('Firestore 데이터베이스가 초기화되지 않았습니다.');
      throw new Error('Firestore 데이터베이스가 초기화되지 않았습니다.');
    }
    
    console.log('loadAllUserStakes: Firestore DB 확인 완료');
    
    const { collection, getDocs } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    
    // 먼저 userStakes 컬렉션 시도 (기존 구조)
    console.log('loadAllUserStakes: userStakes 컬렉션 읽기 시도...');
    const userStakesSnapshot = await getDocs(collection(firestoreDb, 'userStakes'));
    const userStakesData = [];
    userStakesSnapshot.forEach((doc) => {
      userStakesData.push({
        uid: doc.id,
        ...doc.data(),
      });
    });
    
    console.log(`loadAllUserStakes: userStakes 컬렉션에서 ${userStakesData.length}개 문서 발견`);
    
    // userStakes에 데이터가 있으면 반환
    if (userStakesData.length > 0) {
      console.log('loadAllUserStakes: userStakes 데이터 반환');
      return userStakesData;
    }
    
    // userStakes가 비어있으면 stake 컬렉션에서 데이터 읽기 (새 구조)
    console.log('loadAllUserStakes: userStakes가 비어있음, stake 컬렉션 읽기 시도...');
    const stakeSnapshot = await getDocs(collection(firestoreDb, 'stake'));
    const stakeData = [];
    stakeSnapshot.forEach((doc) => {
      const data = doc.data();
      stakeData.push({
        documentId: doc.id,
        user_uid: data.user_uid || '',
        amount: data.amount || 0,
        stake_date: data.stake_date,
        stake_period: data.stake_period || 90,
        is_admin: data.is_admin || false,
        symbol: data.symbol || null, // symbol 필드도 포함
      });
    });
    
    console.log(`loadAllUserStakes: stake 컬렉션에서 ${stakeData.length}개 문서 발견`);
    
    if (stakeData.length === 0) {
      console.log('loadAllUserStakes: stake 컬렉션도 비어있음');
      return [];
    }
    
    // stake 컬렉션 데이터를 사용자별로 그룹화
    const usersMap = new Map();
    let skippedCount = 0;
    
    stakeData.forEach((stake) => {
      const uid = stake.user_uid;
      if (!uid || uid.trim() === '') {
        skippedCount++;
        console.warn('loadAllUserStakes: user_uid가 없는 stake 문서 건너뜀:', stake.documentId);
        return;
      }
      
      if (!usersMap.has(uid)) {
        usersMap.set(uid, {
          uid: uid,
          BTC: 0,
          ETH: 0,
          XRP: 0,
          stakes: [],
          stakeStartDates: {},
        });
      }
      
      const user = usersMap.get(uid);
      // symbol 필드가 있으면 해당 코인으로 분배, 없으면 "UNKNOWN"으로 처리
      const symbol = stake.symbol || 'UNKNOWN';
      if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'XRP') {
        user[symbol] = (user[symbol] || 0) + (stake.amount || 0);
        // 스테이킹 시작일 저장 (가장 이른 날짜)
        if (stake.stake_date) {
          const stakeDate = stake.stake_date.toDate ? stake.stake_date.toDate() : new Date(stake.stake_date);
          if (!user.stakeStartDates[symbol] || stakeDate < (user.stakeStartDates[symbol].toDate ? user.stakeStartDates[symbol].toDate() : new Date(user.stakeStartDates[symbol]))) {
            user.stakeStartDates[symbol] = stake.stake_date;
          }
        }
      } else if (symbol === 'UNKNOWN') {
        // symbol이 없으면 첫 번째 거래의 amount를 BTC로 간주 (임시 처리)
        // 실제로는 stake 컬렉션에 symbol 필드를 추가하는 것이 좋습니다
        user.BTC = (user.BTC || 0) + (stake.amount || 0);
        // 스테이킹 시작일 저장
        if (stake.stake_date) {
          const stakeDate = stake.stake_date.toDate ? stake.stake_date.toDate() : new Date(stake.stake_date);
          if (!user.stakeStartDates.BTC || stakeDate < (user.stakeStartDates.BTC.toDate ? user.stakeStartDates.BTC.toDate() : new Date(user.stakeStartDates.BTC))) {
            user.stakeStartDates.BTC = stake.stake_date;
          }
        }
      }
      user.stakes.push(stake);
    });
    
    const result = Array.from(usersMap.values());
    console.log(`loadAllUserStakes: ${result.length}명의 사용자로 그룹화 완료 (건너뛴 문서: ${skippedCount}개)`);
    console.log('loadAllUserStakes: 결과 샘플:', result.length > 0 ? result[0] : '없음');
    
    return result;
  } catch (e) {
    console.error('loadAllUserStakes: 전체 유저 스테이킹 데이터를 불러오지 못했습니다:', e);
    console.error('loadAllUserStakes: 에러 상세:', e.message);
    console.error('loadAllUserStakes: 에러 코드:', e.code);
    console.error('loadAllUserStakes: 에러 스택:', e.stack);
    
    // 권한 오류인 경우 명확히 표시
    if (e.code === 'permission-denied' || e.message?.includes('permission') || e.message?.includes('Permission')) {
      console.error('⚠️ Firestore 보안 규칙 문제입니다! stake 컬렉션에 대한 읽기 권한이 없습니다.');
      console.error('해결 방법: Firebase 콘솔 > Firestore > 규칙 탭에서 stake 컬렉션 규칙을 추가하세요.');
    }
    
    return [];
  }
}

// 사용자별 리워드 데이터 가져오기
async function loadUserRewardsForAdmin(userId) {
  try {
    // db가 없으면 window.db 또는 전역 db 사용
    const firestoreDb = db || window.db || (window.__firebase && window.__firebase.db);
    if (!firestoreDb) {
      throw new Error('Firestore 데이터베이스가 초기화되지 않았습니다.');
    }
    
    const { collection, query, where, getDocs, orderBy } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardsRef = collection(firestoreDb, 'rewards');
    
    // orderBy 없이 먼저 시도 (인덱스 불필요)
    let q = query(rewardsRef, where('userId', '==', userId));
    
    try {
      // orderBy를 시도 (인덱스가 있다면)
      q = query(rewardsRef, where('userId', '==', userId), orderBy('approvedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const rewards = [];
      querySnapshot.forEach((doc) => {
        rewards.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      return rewards;
    } catch (indexError) {
      // 인덱스가 없거나 아직 생성 중이면 orderBy 없이 조회 후 클라이언트에서 정렬
      // 인덱스 오류인지 확인
      const isIndexError = indexError.message && (
        indexError.message.includes('index') || 
        indexError.message.includes('The query requires an index')
      );
      
      if (!isIndexError) {
        // 인덱스 오류가 아니면 그대로 throw
        throw indexError;
      }
      
      // 인덱스 오류는 조용히 fallback 사용 (콘솔에 출력하지 않음)
      // 인덱스가 완전히 생성되면 자동으로 서버 정렬 사용됨
      const querySnapshot = await getDocs(q);
      const rewards = [];
      querySnapshot.forEach((doc) => {
        rewards.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      // 클라이언트에서 날짜순 정렬
      rewards.sort((a, b) => {
        const dateA = a.approvedAt?.toDate ? a.approvedAt.toDate() : new Date(0);
        const dateB = b.approvedAt?.toDate ? b.approvedAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime(); // 최신순
      });
      
      return rewards;
    }
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

  // 스테이킹 신청 목록 불러오기
  const stakingRequests = await loadStakingRequests();
  const pendingRequests = stakingRequests.filter(req => req.status === 'pending');

  // 통계 섹션
  let html = `
    <!-- 스테이킹 신청 목록 섹션 -->
    <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(59, 130, 246, 0.3);">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        📝 스테이킹 신청 목록
        ${pendingRequests.length > 0 ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${pendingRequests.length}건 대기</span>` : ''}
      </h3>
      ${pendingRequests.length > 0 ? `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">이메일</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">코인</th>
                <th style="padding: 12px; text-align: right; color: #9ca3af; font-weight: 600;">신청 수량</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">네트워크</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">신청일</th>
                <th style="padding: 12px; text-align: center; color: #9ca3af; font-weight: 600;">작업</th>
              </tr>
            </thead>
            <tbody>
              ${pendingRequests.map((req) => {
                const dateStr = req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('ko-KR') : '날짜 없음';
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px;">${req.userEmail || '이메일 없음'}</td>
                    <td style="padding: 12px; font-weight: 600;">${req.symbol}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600;">${req.amount.toFixed(req.symbol === 'XRP' ? 2 : 4)}</td>
                    <td style="padding: 12px; color: #9ca3af;">${req.network}</td>
                    <td style="padding: 12px; color: #9ca3af;">${dateStr}</td>
                    <td style="padding: 12px; text-align: center;">
                      <button 
                        class="btn-primary" 
                        style="padding: 6px 12px; font-size: 12px; margin-right: 8px;"
                        onclick="handleApproveStakingRequest('${req.id}', '${req.userId}', '${req.symbol}', ${req.amount}, '${req.userEmail || ''}')"
                      >
                        승인
                      </button>
                      <button 
                        class="btn-outline" 
                        style="padding: 6px 12px; font-size: 12px;"
                        onclick="handleRejectStakingRequest('${req.id}')"
                      >
                        거절
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="padding: 20px; text-align: center; color: #9ca3af;">
          대기 중인 스테이킹 신청이 없습니다.
        </div>
      `}
    </div>
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">🔍 사용자 검색</h3>
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

    ['BTC', 'ETH', 'XRP', 'SOL'].forEach((symbol) => {
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

// 어드민 대시보드 새로고침 헬퍼 함수
async function refreshAdminDashboard(userId) {
  const adminPageContent = $('#adminPageContent');
  if (adminPageContent) {
    const users = await loadAllUserStakes();
    await renderAdminDashboardContent(users, adminPageContent);
  }
  
  // 만약 해당 유저가 현재 로그인되어 있다면 리워드 내역도 새로고침
  if (currentUser && currentUser.uid === userId && typeof renderRewards === 'function') {
    await renderRewards();
  }
}

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
        
        // 모달 닫기 및 대시보드 새로고침
        modal.classList.remove('show');
        setTimeout(() => refreshAdminDashboard(userId), 500);
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
        
        // 모달 닫기 및 대시보드 새로고침
        modal.classList.remove('show');
        setTimeout(() => refreshAdminDashboard(userId), 500);
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
  
  container.innerHTML = '<p style="color:#ffffff; text-align:center; padding: 40px; font-size: 18px; background: rgba(255,255,255,0.05); border-radius: 8px;">데이터를 불러오는 중...</p>';
  
  try {
    const users = await loadAllUserStakes();
    await renderAdminDashboardContent(users, container);
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
    container.innerHTML = `
      <div style="padding: 80px 40px; text-align: center; background: rgba(255,255,255,0.05); border-radius: 16px; border: 2px solid rgba(255,255,255,0.1); margin: 40px 0;">
        <div style="font-size: 64px; margin-bottom: 24px; line-height: 1;">📊</div>
        <h3 style="font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 16px; line-height: 1.4;">등록된 회원이 없습니다</h3>
        <p style="font-size: 18px; color: #9ca3af; margin-bottom: 12px; line-height: 1.6;">
          현재 등록된 스테이킹 데이터가 없습니다.
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

  // 스테이킹 신청 목록 불러오기
  const stakingRequests = await loadStakingRequests();
  const pendingRequests = stakingRequests.filter(req => req.status === 'pending');

  // 통계 섹션
  let html = `
    <!-- 스테이킹 신청 목록 섹션 -->
    <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(59, 130, 246, 0.3);">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
        📝 스테이킹 신청 목록
        ${pendingRequests.length > 0 ? `<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${pendingRequests.length}건 대기</span>` : ''}
      </h3>
      ${pendingRequests.length > 0 ? `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">이메일</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">코인</th>
                <th style="padding: 12px; text-align: right; color: #9ca3af; font-weight: 600;">신청 수량</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">네트워크</th>
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">신청일</th>
                <th style="padding: 12px; text-align: center; color: #9ca3af; font-weight: 600;">작업</th>
              </tr>
            </thead>
            <tbody>
              ${pendingRequests.map((req) => {
                const dateStr = req.createdAt?.toDate ? req.createdAt.toDate().toLocaleDateString('ko-KR') : '날짜 없음';
                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px;">${req.userEmail || '이메일 없음'}</td>
                    <td style="padding: 12px; font-weight: 600;">${req.symbol}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600;">${req.amount.toFixed(req.symbol === 'XRP' ? 2 : 4)}</td>
                    <td style="padding: 12px; color: #9ca3af;">${req.network}</td>
                    <td style="padding: 12px; color: #9ca3af;">${dateStr}</td>
                    <td style="padding: 12px; text-align: center;">
                      <button 
                        class="btn-primary" 
                        style="padding: 6px 12px; font-size: 12px; margin-right: 8px;"
                        onclick="handleApproveStakingRequest('${req.id}', '${req.userId}', '${req.symbol}', ${req.amount}, '${req.userEmail || ''}')"
                      >
                        승인
                      </button>
                      <button 
                        class="btn-outline" 
                        style="padding: 6px 12px; font-size: 12px;"
                        onclick="handleRejectStakingRequest('${req.id}')"
                      >
                        거절
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="padding: 20px; text-align: center; color: #9ca3af;">
          대기 중인 스테이킹 신청이 없습니다.
        </div>
      `}
    </div>
    <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">🔍 사용자 검색</h3>
      <div style="display: flex; gap: 12px; margin-bottom: 20px;">
        <input
          type="text"
          id="adminUserSearch"
          class="input"
          placeholder="이메일 주소로 사용자 검색..."
          style="flex: 1; padding: 12px; font-size: 14px;"
        />
        <button
          class="btn-primary"
          id="adminSearchBtn"
          style="padding: 12px 24px; font-size: 14px;"
        >
          검색
        </button>
      </div>
      <div id="adminSearchResult" style="display: none; margin-top: 16px;"></div>
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px; margin-top: 24px;">📊 전체 통계</h3>
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

    ['BTC', 'ETH', 'XRP', 'SOL'].forEach((symbol) => {
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
  
  // 검색 기능 이벤트 리스너 추가
  setupAdminUserSearch(users, prices);
}

// 어드민 사용자 검색 및 스테이킹 수정 기능
async function setupAdminUserSearch(users, prices) {
  const searchInput = $('#adminUserSearch');
  const searchBtn = $('#adminSearchBtn');
  const searchResult = $('#adminSearchResult');
  
  if (!searchInput || !searchBtn || !searchResult) return;
  
  const performSearch = async () => {
    const searchEmail = searchInput.value.trim().toLowerCase();
    if (!searchEmail) {
      searchResult.style.display = 'none';
      return;
    }
    
    // users 배열에서 이메일로 검색
    const foundUser = users.find(u => u.email && u.email.toLowerCase() === searchEmail);
    
    if (!foundUser) {
      // Firestore에서 직접 검색 시도
      try {
        const firestoreDb = db || window.db || (window.__firebase && window.__firebase.db);
        if (!firestoreDb) {
          searchResult.innerHTML = `
            <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; color: #fca5a5;">
              사용자를 찾을 수 없습니다: ${searchEmail}
            </div>
          `;
          searchResult.style.display = 'block';
          return;
        }
        
        const { collection, query, where, getDocs } = await import(
          'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
        );
        const q = query(collection(firestoreDb, 'userStakes'), where('email', '==', searchEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          searchResult.innerHTML = `
            <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; color: #fca5a5;">
              사용자를 찾을 수 없습니다: ${searchEmail}
            </div>
          `;
          searchResult.style.display = 'block';
          return;
        }
        
        const doc = querySnapshot.docs[0];
        const userData = {
          uid: doc.id,
          ...doc.data(),
        };
        
        displayUserEditForm(userData, prices);
      } catch (error) {
        console.error('사용자 검색 오류:', error);
        searchResult.innerHTML = `
          <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; color: #fca5a5;">
            검색 중 오류가 발생했습니다: ${error.message}
          </div>
        `;
        searchResult.style.display = 'block';
      }
    } else {
      displayUserEditForm(foundUser, prices);
    }
  };
  
  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });
  
  function displayUserEditForm(user, prices) {
    const btcAmount = user.BTC || 0;
    const ethAmount = user.ETH || 0;
    const xrpAmount = user.XRP || 0;
    
    searchResult.innerHTML = `
      <div style="background: rgba(59, 130, 246, 0.1); padding: 20px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
        <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #fff;">
          사용자: ${user.email || '이메일 없음'} (UID: ${user.uid.substring(0, 16)}...)
        </h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
          <div>
            <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-weight: 600;">BTC 수량</label>
            <input
              type="number"
              id="editUserBTC"
              class="input"
              value="${btcAmount}"
              step="0.0001"
              min="0"
              style="width: 100%; padding: 10px;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-weight: 600;">ETH 수량</label>
            <input
              type="number"
              id="editUserETH"
              class="input"
              value="${ethAmount}"
              step="0.0001"
              min="0"
              style="width: 100%; padding: 10px;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 8px; font-weight: 600;">XRP 수량</label>
            <input
              type="number"
              id="editUserXRP"
              class="input"
              value="${xrpAmount}"
              step="0.01"
              min="0"
              style="width: 100%; padding: 10px;"
            />
          </div>
        </div>
        <div style="display: flex; gap: 12px;">
          <button
            class="btn-primary"
            id="saveUserStakesBtn"
            data-user-uid="${user.uid}"
            style="flex: 1; padding: 12px; font-size: 14px;"
          >
            저장
          </button>
          <button
            class="btn-outline"
            id="cancelUserEditBtn"
            style="flex: 1; padding: 12px; font-size: 14px;"
          >
            취소
          </button>
        </div>
        <p id="userEditStatusText" style="text-align: center; margin-top: 12px; color: #9ca3af; font-size: 14px;"></p>
      </div>
    `;
    searchResult.style.display = 'block';
    
    // 저장 버튼 이벤트
    const saveBtn = $('#saveUserStakesBtn');
    const cancelBtn = $('#cancelUserEditBtn');
    const statusText = $('#userEditStatusText');
    
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const newBTC = parseFloat($('#editUserBTC').value) || 0;
        const newETH = parseFloat($('#editUserETH').value) || 0;
        const newXRP = parseFloat($('#editUserXRP').value) || 0;
        const userId = saveBtn.getAttribute('data-user-uid');
        
        if (statusText) {
          statusText.textContent = '저장 중...';
          statusText.style.color = '#9ca3af';
        }
        
        const success = await updateUserStakes(userId, {
          BTC: newBTC,
          ETH: newETH,
          XRP: newXRP,
        }, user.email);
        
        if (success) {
          if (statusText) {
            statusText.textContent = '저장되었습니다!';
            statusText.style.color = '#10b981';
          }
          // 페이지 새로고침하여 변경사항 반영
          setTimeout(() => {
            location.reload();
          }, 1000);
        } else {
          if (statusText) {
            statusText.textContent = '저장 실패. 다시 시도해주세요.';
            statusText.style.color = '#ef4444';
          }
        }
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        searchResult.style.display = 'none';
        searchInput.value = '';
      });
    }
  }
}

// 어드민이 사용자 스테이킹 수치 업데이트
async function updateUserStakes(userId, stakes, userEmail) {
  try {
    const firestoreDb = db || window.db || (window.__firebase && window.__firebase.db);
    if (!firestoreDb) {
      throw new Error('Firestore 데이터베이스가 초기화되지 않았습니다.');
    }
    
    const { doc, setDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    
    const docRef = doc(firestoreDb, 'userStakes', userId);
    
    // 기존 데이터 가져오기 (stakeStartDates 유지)
    const { getDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};
    
    // 스테이킹 시작일 업데이트 로직
    const stakeStartDates = existingData.stakeStartDates || {};
    ['BTC', 'ETH', 'XRP', 'SOL'].forEach((symbol) => {
      const currentAmount = stakes[symbol] || 0;
      const previousAmount = existingData[symbol] || 0;
      
      // 처음 스테이킹을 시작하는 경우
      if (currentAmount > 0 && previousAmount === 0 && !stakeStartDates[symbol]) {
        stakeStartDates[symbol] = serverTimestamp();
      }
      // 스테이킹이 0이 되면 시작일 제거
      if (currentAmount === 0 && previousAmount > 0) {
        delete stakeStartDates[symbol];
      }
    });
    
    // 저장할 데이터
    const dataToSave = {
      ...stakes,
      email: userEmail || existingData.email,
      stakeStartDates,
      lastUpdated: serverTimestamp(),
    };
    
    await setDoc(docRef, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.error('사용자 스테이킹 수치 업데이트 실패:', error);
    return false;
  }
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
    adminBtn.addEventListener('click', () => {
      // 별도 어드민 페이지로 이동
      window.location.href = '/admin.html';
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
  // ===== body 클래스 관리 (조건부 스타일 적용) =====
  if (page === 'signup') {
    document.body.classList.add('is-signup-page');
    console.log('✅ body에 is-signup-page 클래스 추가');
  } else {
    document.body.classList.remove('is-signup-page');
    // 회원가입 페이지가 아닐 때는 확실하게 숨기기
    const signupPage = document.getElementById('signup-page');
    if (signupPage) {
      signupPage.style.setProperty('display', 'none', 'important');
      signupPage.style.setProperty('visibility', 'hidden', 'important');
      signupPage.style.setProperty('opacity', '0', 'important');
      console.log('✅ 회원가입 페이지 숨김 처리 완료');
    }
  }
  
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
  // FAQ 페이지는 스크롤만 처리 (레이아웃은 CSS에서 처리)
  if (page === 'faq') {
    // FAQ 섹션으로 스크롤 (레이아웃 조작 없음)
    setTimeout(() => {
      const faqSection = document.getElementById('faq-section');
      if (faqSection) {
        const offsetTop = faqSection.offsetTop - 80;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      }
    }, 100);
    return; // FAQ 페이지는 여기서 종료
  }
  
  if (page === 'dashboard' || page === 'pools') {
    // Show main dashboard content (default visible sections)
    // 모든 content-section 복원
    document.querySelectorAll('section.content-section:not(.page-section)').forEach((section) => {
      section.style.removeProperty('display');
      section.style.removeProperty('visibility');
      section.style.removeProperty('opacity');
      section.style.removeProperty('height');
      section.style.removeProperty('overflow');
      // 기본 display 값으로 설정
      section.style.setProperty('display', 'block', 'important');
      section.style.setProperty('visibility', 'visible', 'important');
      section.style.setProperty('opacity', '1', 'important');
      section.style.removeProperty('height');
      section.style.removeProperty('overflow');
      
      // 섹션 내부의 모든 요소도 복원
      section.querySelectorAll('*').forEach((child) => {
        child.style.removeProperty('display');
        child.style.removeProperty('visibility');
      });
    });
    
    // pre-login-welcome 복원
    document.querySelectorAll('.pre-login-welcome').forEach((section) => {
      section.style.removeProperty('display');
      section.style.removeProperty('visibility');
      section.style.removeProperty('opacity');
      section.style.removeProperty('height');
      section.style.removeProperty('overflow');
      section.style.setProperty('display', 'block', 'important');
      section.style.setProperty('visibility', 'visible', 'important');
      section.style.setProperty('opacity', '1', 'important');
    });
    
    // feature-card들 다시 표시
    document.querySelectorAll('.feature-card').forEach((card) => {
      card.style.removeProperty('display');
      card.style.removeProperty('visibility');
      card.style.removeProperty('opacity');
      card.style.removeProperty('height');
      card.style.removeProperty('overflow');
      card.style.setProperty('display', 'flex', 'important');
      card.style.setProperty('visibility', 'visible', 'important');
      card.style.setProperty('opacity', '1', 'important');
    });
    
    // grid grid-4 복원
    document.querySelectorAll('.grid.grid-4').forEach((grid) => {
      grid.style.removeProperty('display');
      grid.style.removeProperty('visibility');
      grid.style.removeProperty('opacity');
      grid.style.removeProperty('height');
      grid.style.removeProperty('overflow');
      grid.style.setProperty('display', 'grid', 'important');
      grid.style.setProperty('visibility', 'visible', 'important');
      grid.style.setProperty('opacity', '1', 'important');
    });
    
    // overview 섹션 다시 표시
    document.querySelectorAll('.overview').forEach((section) => {
      section.style.removeProperty('display');
      section.style.removeProperty('visibility');
      section.style.removeProperty('opacity');
      section.style.removeProperty('height');
      section.style.setProperty('display', 'grid', 'important');
      section.style.setProperty('visibility', 'visible', 'important');
      section.style.setProperty('opacity', '1', 'important');
    });
    
    // pools-rewards-container 다시 표시
    document.querySelectorAll('.pools-rewards-container').forEach((container) => {
      container.style.removeProperty('display');
      container.style.removeProperty('visibility');
      container.style.removeProperty('opacity');
      container.style.removeProperty('height');
      container.style.setProperty('display', 'grid', 'important');
      container.style.setProperty('visibility', 'visible', 'important');
      container.style.setProperty('opacity', '1', 'important');
    });
    
    // Footer 섹션도 다시 표시
    document.querySelectorAll('.footer-left, .footer-right').forEach((footer) => {
      footer.style.removeProperty('display');
      footer.style.removeProperty('visibility');
      footer.style.removeProperty('opacity');
      footer.style.removeProperty('height');
      footer.style.setProperty('display', 'block', 'important');
      footer.style.setProperty('visibility', 'visible', 'important');
      footer.style.setProperty('opacity', '1', 'important');
      // 부모 섹션도 찾아서 표시
      let parent = footer.parentElement;
      while (parent && parent !== document.body) {
        if (parent.tagName === 'SECTION' && !parent.classList.contains('page-section')) {
          parent.style.removeProperty('display');
          parent.style.removeProperty('visibility');
          parent.style.removeProperty('opacity');
          parent.style.removeProperty('height');
          parent.style.setProperty('display', 'block', 'important');
          parent.style.setProperty('visibility', 'visible', 'important');
          parent.style.setProperty('opacity', '1', 'important');
          break;
        }
        parent = parent.parentElement;
      }
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
  } else {
    // 회원가입 페이지인 경우 모든 메인 콘텐츠를 완전히 숨기기
    if (page === 'signup') {
      // 모든 section 요소를 확인하여 content-section이면서 page-section이 아닌 것 숨기기
      document.querySelectorAll('section').forEach((section) => {
        if (section.classList.contains('content-section') && !section.classList.contains('page-section')) {
          section.style.setProperty('display', 'none', 'important');
          section.style.setProperty('visibility', 'hidden', 'important');
          section.style.setProperty('opacity', '0', 'important');
          section.style.setProperty('height', '0', 'important');
          section.style.setProperty('overflow', 'hidden', 'important');
        }
      });
      
      // pre-login-welcome 숨기기
      document.querySelectorAll('.pre-login-welcome').forEach((section) => {
        section.style.setProperty('display', 'none', 'important');
        section.style.setProperty('visibility', 'hidden', 'important');
        section.style.setProperty('opacity', '0', 'important');
        section.style.setProperty('height', '0', 'important');
        section.style.setProperty('overflow', 'hidden', 'important');
      });
      
      // feature-card들 숨기기 (더 강력하게)
      document.querySelectorAll('.feature-card').forEach((card) => {
        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('visibility', 'hidden', 'important');
        card.style.setProperty('opacity', '0', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
      });
      
      // grid grid-4 클래스를 가진 요소도 숨기기 (Features Section 내부)
      document.querySelectorAll('.grid.grid-4').forEach((grid) => {
        grid.style.setProperty('display', 'none', 'important');
        grid.style.setProperty('visibility', 'hidden', 'important');
        grid.style.setProperty('opacity', '0', 'important');
        grid.style.setProperty('height', '0', 'important');
        grid.style.setProperty('overflow', 'hidden', 'important');
      });
      
      // Features Section의 모든 자식 요소도 숨기기
      document.querySelectorAll('section.content-section:not(.page-section)').forEach((section) => {
        // 섹션 자체 숨기기
        section.style.setProperty('display', 'none', 'important');
        section.style.setProperty('visibility', 'hidden', 'important');
        section.style.setProperty('opacity', '0', 'important');
        section.style.setProperty('height', '0', 'important');
        section.style.setProperty('overflow', 'hidden', 'important');
        
        // 섹션 내부의 모든 요소도 숨기기
        section.querySelectorAll('*').forEach((child) => {
          child.style.setProperty('display', 'none', 'important');
          child.style.setProperty('visibility', 'hidden', 'important');
        });
      });
      
      // Footer 섹션도 숨기기
      document.querySelectorAll('.footer-left, .footer-right').forEach((footer) => {
        footer.style.setProperty('display', 'none', 'important');
        footer.style.setProperty('visibility', 'hidden', 'important');
        footer.style.setProperty('opacity', '0', 'important');
        footer.style.setProperty('height', '0', 'important');
        // 부모 섹션도 찾아서 숨기기
        let parent = footer.parentElement;
        while (parent && parent !== document.body) {
          if (parent.tagName === 'SECTION' && !parent.classList.contains('page-section')) {
            parent.style.setProperty('display', 'none', 'important');
            parent.style.setProperty('visibility', 'hidden', 'important');
            parent.style.setProperty('opacity', '0', 'important');
            parent.style.setProperty('height', '0', 'important');
            break;
          }
          parent = parent.parentElement;
        }
      });
      
      // overview 섹션 숨기기
      document.querySelectorAll('.overview').forEach((section) => {
        section.style.setProperty('display', 'none', 'important');
        section.style.setProperty('visibility', 'hidden', 'important');
        section.style.setProperty('opacity', '0', 'important');
        section.style.setProperty('height', '0', 'important');
      });
      
      // pools-rewards-container 숨기기
      document.querySelectorAll('.pools-rewards-container').forEach((container) => {
        container.style.setProperty('display', 'none', 'important');
        container.style.setProperty('visibility', 'hidden', 'important');
        container.style.setProperty('opacity', '0', 'important');
        container.style.setProperty('height', '0', 'important');
      });
    } else {
      // 다른 페이지들은 기존 로직 사용
      document.querySelectorAll('.content-section:not(.page-section), .pre-login-welcome').forEach((section) => {
        section.style.display = 'none';
      });
      
      // Footer 섹션도 숨기기
      document.querySelectorAll('.footer-left, .footer-right').forEach((footer) => {
        footer.style.display = 'none';
        // 부모 섹션도 찾아서 숨기기
        let parent = footer.parentElement;
        while (parent && parent !== document.body) {
          if (parent.tagName === 'SECTION' && !parent.classList.contains('page-section')) {
            parent.style.display = 'none';
            break;
          }
          parent = parent.parentElement;
        }
      });
    }
    
    // main-content가 숨겨져 있으면 표시
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      const mainDisplay = window.getComputedStyle(mainContent).display;
      if (mainDisplay === 'none') {
        mainContent.style.setProperty('display', 'flex', 'important');
      }
    }
    
    // 모든 page-section 숨기기 (먼저 모두 숨김) - .active 클래스 제거 및 인라인 스타일 제거
    document.querySelectorAll('.page-section').forEach((section) => {
      section.classList.remove('active');
      // 인라인 스타일도 제거 (CSS 초기화)
      const inlineStylesToRemove = [
        'display', 'visibility', 'opacity', 'height', 'min-height', 'max-height',
        'width', 'max-width', 'position', 'z-index', 'padding', 'margin',
        'box-sizing', 'background', 'overflow', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis'
      ];
      inlineStylesToRemove.forEach(prop => {
        section.style.removeProperty(prop);
      });
    });
    
    // Show the specific page (숨긴 후에 표시)
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
      console.log(`페이지 요소 찾음: ${page}-page`, pageElement);
      
      // 회원가입 페이지인 경우 특별 처리 (DOM 이동 + 내부 노출 + 표시)
      if (page === 'signup') {
        console.log('회원가입 페이지 특별 처리 시작');
        
        // ===== 단계 0: 조건부 CSS Injection (Scoped CSS) =====
        console.log('단계 0 시작: 조건부 CSS Injection');
        
        // 기존 스타일 태그가 있으면 제거
        const existingStyle = document.getElementById('signup-page-force-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        // 새로운 <style> 태그 생성 및 주입 (.is-signup-page로 스코프 제한)
        const styleTag = document.createElement('style');
        styleTag.id = 'signup-page-force-styles';
        styleTag.textContent = `
          .is-signup-page #signup-page, .is-signup-page #signup-page * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #333 !important;
          }
          .is-signup-page #signup-page input {
            background: white !important;
            border: 1px solid #ccc !important;
            height: 40px !important;
            color: #333 !important;
            padding: 10px 12px !important;
            border-radius: 4px !important;
          }
          .is-signup-page #signup-page button, .is-signup-page #signup-page [type="submit"] {
            background-color: #007bff !important;
            color: #ffffff !important;
            border: 1px solid #007bff !important;
            padding: 12px 24px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-weight: 600 !important;
          }
          .is-signup-page #signup-page .link-btn, .is-signup-page #signup-page #goToLogin {
            color: #007bff !important;
            background-color: transparent !important;
            border: none !important;
            text-decoration: underline !important;
            cursor: pointer !important;
          }
          .is-signup-page #signup-page {
            background: #f8f9fa !important;
            min-height: 600px !important;
            padding: 40px 20px !important;
            padding-top: 100px !important;
            margin-top: 0 !important;
            margin-bottom: 40px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            position: relative !important;
            z-index: 100 !important;
            height: auto !important;
          }
          .is-signup-page header.top-navbar, .is-signup-page .top-navbar, .is-signup-page header, .is-signup-page .navbar-container, .is-signup-page nav {
            z-index: 1000 !important;
            position: sticky !important;
            top: 0 !important;
          }
          .is-signup-page header.top-navbar * {
            z-index: inherit !important;
          }
          .is-signup-page #signup-page .card {
            background-color: #ffffff !important;
            color: #333333 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .is-signup-page #signup-page label, .is-signup-page #signup-page h2, .is-signup-page #signup-page h3, .is-signup-page #signup-page p, .is-signup-page #signup-page span, .is-signup-page #signup-page small {
            color: #333333 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          .is-signup-page #signup-page .form-group {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        `;
        document.head.appendChild(styleTag);
        console.log('✅ 조건부 CSS Injection 완료: .is-signup-page 스코프로 제한');
        
        // ===== 단계 1: DOM 위치 이동 (Re-parenting) =====
        console.log('단계 1 시작: DOM 위치 이동');
        const mainContent = document.getElementById('main-content') || document.querySelector('.main-content');
        
        if (mainContent) {
          // 현재 부모 확인
          const currentParent = pageElement.parentElement;
          const isDirectChild = (pageElement.parentElement === mainContent);
          
          console.log('현재 부모:', currentParent);
          console.log('main-content가 #signup-page의 직계 부모인가?', isDirectChild);
          console.log('main-content가 #signup-page를 포함하는가?', mainContent.contains(pageElement));
          
          // main-content의 자식이 아니면 강제로 이동
          if (!isDirectChild) {
            console.log('⚠️ #signup-page가 #main-content의 직계 자식이 아닙니다. DOM 위치를 이동합니다.');
            mainContent.appendChild(pageElement);
            console.log('✅ DOM 이동 완료. 새로운 부모:', pageElement.parentElement);
          } else {
            console.log('✅ #signup-page가 이미 #main-content의 직계 자식입니다.');
          }
          
          // main-content를 flex로 설정
          mainContent.style.setProperty('display', 'flex', 'important');
          mainContent.style.setProperty('flex-direction', 'column', 'important');
          mainContent.style.setProperty('visibility', 'visible', 'important');
          mainContent.style.setProperty('opacity', '1', 'important');
          mainContent.style.setProperty('min-height', '100vh', 'important');
          console.log('단계 1 완료: DOM 이동 및 main-content flex 설정');
        } else {
          console.error('❌ main-content 요소를 찾을 수 없습니다!');
        }
        
        // ===== 단계 2: 내부 콘텐츠 강제 노출 =====
        console.log('단계 2 시작: 내부 콘텐츠 강제 노출');
        
        // .card 요소 찾기 및 강제 노출
        const signupCard = pageElement.querySelector('.card');
        if (signupCard) {
          const cardDisplay = window.getComputedStyle(signupCard).display;
          console.log('회원가입 카드 요소 확인됨:', signupCard);
          console.log('카드 현재 display:', cardDisplay);
          
          // 강제로 노출
          signupCard.style.setProperty('display', 'block', 'important');
          signupCard.style.setProperty('visibility', 'visible', 'important');
          signupCard.style.setProperty('opacity', '1', 'important');
          signupCard.style.removeProperty('height');
          signupCard.style.removeProperty('min-height');
          signupCard.style.removeProperty('max-height');
          signupCard.style.removeProperty('overflow');
          
          console.log('✅ 카드 강제 노출 완료. 새로운 display:', window.getComputedStyle(signupCard).display);
        } else {
          console.warn('⚠️ 회원가입 페이지 내부 .card 요소를 찾을 수 없습니다!');
        }
        
        // #signupForm 요소 찾기 및 강제 노출
        const signupForm = pageElement.querySelector('#signupForm');
        if (signupForm) {
          const formDisplay = window.getComputedStyle(signupForm).display;
          console.log('회원가입 폼 확인됨:', signupForm);
          console.log('폼 현재 display:', formDisplay);
          
          // 강제로 노출
          signupForm.style.setProperty('display', 'block', 'important');
          signupForm.style.setProperty('visibility', 'visible', 'important');
          signupForm.style.setProperty('opacity', '1', 'important');
          signupForm.style.removeProperty('height');
          signupForm.style.removeProperty('min-height');
          signupForm.style.removeProperty('max-height');
          signupForm.style.removeProperty('overflow');
          
          console.log('✅ 폼 강제 노출 완료. 새로운 display:', window.getComputedStyle(signupForm).display);
        } else {
          console.warn('⚠️ 회원가입 폼(#signupForm)을 찾을 수 없습니다!');
        }
        
        // 내부의 모든 input, label, button 등도 확인
        const internalElements = pageElement.querySelectorAll('input, label, button, .form-group, .card-header, .card-title, .card-subtitle');
        internalElements.forEach(el => {
          const elDisplay = window.getComputedStyle(el).display;
          if (elDisplay === 'none') {
            el.style.setProperty('display', '', 'important');
            console.log('내부 요소 노출:', el.tagName, el.className || el.id);
          }
        });
        
        console.log('단계 2 완료: 내부 콘텐츠 강제 노출 완료');
        
        // ===== 단계 2-1: 텍스트 색상 및 대비 스타일 강제 적용 =====
        console.log('단계 2-1 시작: 텍스트 색상 및 대비 스타일 강제 적용');
        
        // #signup-page 자체의 텍스트 색상 설정
        pageElement.style.setProperty('color', '#333333', 'important');
        
        // 모든 텍스트 요소(label, h2, p, span, small 등)의 색상 강제 설정
        const textElements = pageElement.querySelectorAll('label, h2, h3, p, span, small, .card-title, .card-subtitle, .form-group label');
        textElements.forEach(el => {
          el.style.setProperty('color', '#333333', 'important');
        });
        console.log(`✅ ${textElements.length}개의 텍스트 요소에 색상 적용 완료`);
        
        // 모든 input 요소에 테두리 및 배경색 강제 설정
        const inputElements = pageElement.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input[type="number"], input:not([type])');
        inputElements.forEach(input => {
          input.style.setProperty('border', '1px solid #ccc', 'important');
          input.style.setProperty('background-color', '#ffffff', 'important');
          input.style.setProperty('color', '#333333', 'important');
          input.style.setProperty('padding', '10px 12px', 'important');
          input.style.setProperty('border-radius', '4px', 'important');
        });
        console.log(`✅ ${inputElements.length}개의 input 요소에 테두리 및 배경색 적용 완료`);
        
        // 모든 button 요소에 배경색 및 텍스트 색상 강제 설정
        const buttonElements = pageElement.querySelectorAll('button, .btn-primary, [type="submit"]');
        buttonElements.forEach(button => {
          button.style.setProperty('background-color', '#007bff', 'important');
          button.style.setProperty('color', '#ffffff', 'important');
          button.style.setProperty('border', '1px solid #007bff', 'important');
          button.style.setProperty('padding', '12px 24px', 'important');
          button.style.setProperty('border-radius', '4px', 'important');
          button.style.setProperty('cursor', 'pointer', 'important');
          button.style.setProperty('font-weight', '600', 'important');
        });
        console.log(`✅ ${buttonElements.length}개의 button 요소에 배경색 및 텍스트 색상 적용 완료`);
        
        // link-btn (로그인 링크 버튼) 스타일
        const linkButtons = pageElement.querySelectorAll('.link-btn, #goToLogin');
        linkButtons.forEach(linkBtn => {
          linkBtn.style.setProperty('color', '#007bff', 'important');
          linkBtn.style.setProperty('background-color', 'transparent', 'important');
          linkBtn.style.setProperty('border', 'none', 'important');
          linkBtn.style.setProperty('text-decoration', 'underline', 'important');
          linkBtn.style.setProperty('cursor', 'pointer', 'important');
        });
        console.log(`✅ ${linkButtons.length}개의 링크 버튼에 스타일 적용 완료`);
        
        // checkbox 스타일
        const checkboxes = pageElement.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.style.setProperty('width', '18px', 'important');
          checkbox.style.setProperty('height', '18px', 'important');
          checkbox.style.setProperty('cursor', 'pointer', 'important');
        });
        console.log(`✅ ${checkboxes.length}개의 checkbox에 스타일 적용 완료`);
        
        // .card 요소의 배경색도 명시적으로 설정 (투명하지 않도록)
        if (signupCard) {
          const cardBg = window.getComputedStyle(signupCard).backgroundColor;
          if (!cardBg || cardBg === 'rgba(0, 0, 0, 0)' || cardBg === 'transparent') {
            signupCard.style.setProperty('background-color', '#ffffff', 'important');
          }
          signupCard.style.setProperty('color', '#333333', 'important');
        }
        
        console.log('단계 2-1 완료: 텍스트 색상 및 대비 스타일 강제 적용 완료');
        
        // ===== 단계 3: CSS 초기화 및 .active 클래스 추가 =====
        console.log('단계 3 시작: CSS 초기화 및 .active 클래스 추가');
        
        // 다른 모든 page-section에서 active 제거
        document.querySelectorAll('.page-section').forEach(section => {
          section.classList.remove('active');
        });
        
        // 인라인 스타일 제거 (일부는 유지해야 하므로 선택적으로)
        const inlineStylesToRemove = [
          'visibility', 'opacity', 'height', 'max-height',
          'width', 'max-width', 'background', 'overflow'
        ];
        inlineStylesToRemove.forEach(prop => {
          pageElement.style.removeProperty(prop);
        });
        
        // 회원가입 페이지에 active 클래스 추가
        pageElement.classList.add('active');
        
        // flex: 1 0 auto 추가 (main-content가 flex일 때 높이 문제 해결)
        pageElement.style.setProperty('flex', '1 0 auto', 'important');
        
        // z-index를 100으로 설정 (네비게이션 바보다 낮게)
        pageElement.style.setProperty('z-index', '100', 'important');
        pageElement.style.setProperty('position', 'relative', 'important');
        
        // display: block 설정
        pageElement.style.setProperty('display', 'block', 'important');
        pageElement.style.setProperty('min-height', '600px', 'important');
        pageElement.style.setProperty('height', 'auto', 'important');
        pageElement.style.setProperty('padding', '40px 20px', 'important');
        pageElement.style.setProperty('padding-top', '100px', 'important');
        pageElement.style.setProperty('margin-top', '0', 'important');
        pageElement.style.setProperty('margin-bottom', '40px', 'important');
        pageElement.style.setProperty('margin-left', 'auto', 'important');
        pageElement.style.setProperty('margin-right', 'auto', 'important');
        pageElement.style.setProperty('background', '#f8f9fa', 'important');
        pageElement.style.setProperty('box-sizing', 'border-box', 'important');
        
        // 네비게이션 바(헤더) 고정 설정 - 여러 선택자 시도
        const headerSelectors = [
          'header.top-navbar',
          '.top-navbar',
          'header',
          '.navbar-container',
          'nav'
        ];
        let header = null;
        for (const selector of headerSelectors) {
          header = document.querySelector(selector);
          if (header) {
            break;
          }
        }
        
        if (header) {
          header.style.setProperty('z-index', '1000', 'important');
          header.style.setProperty('position', 'sticky', 'important');
          header.style.setProperty('top', '0', 'important');
          header.style.setProperty('background-color', window.getComputedStyle(header).backgroundColor || 'rgba(255, 255, 255, 0.95)', 'important');
          header.style.setProperty('backdrop-filter', 'blur(10px)', 'important');
          console.log('✅ 네비게이션 바 고정 설정 완료 (z-index: 1000):', header.tagName, header.className);
        } else {
          console.warn('⚠️ 네비게이션 바를 찾을 수 없습니다!');
        }
        
        console.log('단계 3 완료: .active 클래스 추가 및 기본 스타일 설정');
        
        // ===== 단계 4: 강제 렌더링 (Force Reflow) =====
        console.log('단계 4 시작: 강제 렌더링');
        // void element.offsetWidth를 호출하여 브라우저가 강제로 레이아웃을 다시 계산하게 함
        void pageElement.offsetWidth;
        void pageElement.offsetHeight;
        if (signupCard) void signupCard.offsetWidth;
        if (signupForm) void signupForm.offsetWidth;
        console.log('단계 4 완료: 강제 렌더링 완료');
        
        // ===== 최종 확인 및 로그 =====
        console.log('=== 회원가입 페이지 최종 상태 확인 ===');
        
        // 부모 관계 최종 확인
        const finalParent = pageElement.parentElement;
        const isInMainContent = (finalParent === mainContent);
        console.log('최종 부모:', finalParent);
        console.log('main-content의 직계 자식인가?', isInMainContent);
        
        // 페이지 요소 상태
        const computedDisplay = window.getComputedStyle(pageElement).display;
        const computedVisibility = window.getComputedStyle(pageElement).visibility;
        const computedOpacity = window.getComputedStyle(pageElement).opacity;
        const computedZIndex = window.getComputedStyle(pageElement).zIndex;
        const offsetHeight = pageElement.offsetHeight;
        const offsetWidth = pageElement.offsetWidth;
        
        console.log('페이지 computed display:', computedDisplay);
        console.log('페이지 computed visibility:', computedVisibility);
        console.log('페이지 computed opacity:', computedOpacity);
        console.log('페이지 computed z-index:', computedZIndex);
        console.log('페이지 offsetHeight:', offsetHeight);
        console.log('페이지 offsetWidth:', offsetWidth);
        console.log('페이지 has .active class:', pageElement.classList.contains('active'));
        
        // 내부 요소 상태 확인
        if (signupCard) {
          const cardDisplay = window.getComputedStyle(signupCard).display;
          const cardVisibility = window.getComputedStyle(signupCard).visibility;
          const cardOpacity = window.getComputedStyle(signupCard).opacity;
          const cardHeight = signupCard.offsetHeight;
          console.log('카드 computed display:', cardDisplay);
          console.log('카드 computed visibility:', cardVisibility);
          console.log('카드 computed opacity:', cardOpacity);
          console.log('카드 offsetHeight:', cardHeight);
        }
        
        if (signupForm) {
          const formDisplay = window.getComputedStyle(signupForm).display;
          const formVisibility = window.getComputedStyle(signupForm).visibility;
          const formOpacity = window.getComputedStyle(signupForm).opacity;
          const formHeight = signupForm.offsetHeight;
          console.log('폼 computed display:', formDisplay);
          console.log('폼 computed visibility:', formVisibility);
          console.log('폼 computed opacity:', formOpacity);
          console.log('폼 offsetHeight:', formHeight);
        }
        
        // main-content 상태
        if (mainContent) {
          console.log('main-content display:', window.getComputedStyle(mainContent).display);
          console.log('main-content offsetHeight:', mainContent.offsetHeight);
        }
        
        // offsetHeight가 여전히 0이면 추가 조치
        if (offsetHeight === 0) {
          console.warn('⚠️ offsetHeight가 여전히 0입니다. 추가 조치를 취합니다.');
          
          // 다시 한번 강제 렌더링
          void pageElement.offsetWidth;
          if (signupCard) void signupCard.offsetWidth;
          if (signupForm) void signupForm.offsetWidth;
          
          // 최소 높이 강제 설정
          pageElement.style.setProperty('height', '600px', 'important');
          pageElement.style.setProperty('min-height', '600px', 'important');
          
          // 내부 요소도 높이 설정
          if (signupCard) {
            signupCard.style.setProperty('min-height', '500px', 'important');
          }
          
          // 한번 더 강제 렌더링
          void pageElement.offsetWidth;
          
          console.log('추가 조치 후 offsetHeight:', pageElement.offsetHeight);
          if (signupCard) console.log('추가 조치 후 카드 offsetHeight:', signupCard.offsetHeight);
          if (signupForm) console.log('추가 조치 후 폼 offsetHeight:', signupForm.offsetHeight);
        }
        
        // 스크롤 처리
        setTimeout(() => {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // ===== Timeout 처리: 모든 페이지 전환 로직이 끝난 후 재확인 =====
        setTimeout(() => {
          console.log('Timeout 처리 시작: 회원가입 폼 스타일 재확인 및 강제 설정');
          
          // #signup-page 자체 재확인
          pageElement.style.setProperty('display', 'block', 'important');
          pageElement.style.setProperty('visibility', 'visible', 'important');
          pageElement.style.setProperty('opacity', '1', 'important');
          pageElement.style.setProperty('background', '#f8f9fa', 'important');
          pageElement.style.setProperty('min-height', '600px', 'important');
          pageElement.style.setProperty('height', 'auto', 'important');
          pageElement.style.setProperty('z-index', '100', 'important');
          pageElement.style.setProperty('padding-top', '100px', 'important');
          pageElement.style.setProperty('margin-top', '0', 'important');
          pageElement.style.setProperty('margin-bottom', '40px', 'important');
          pageElement.style.setProperty('margin-left', 'auto', 'important');
          pageElement.style.setProperty('margin-right', 'auto', 'important');
          
          // 네비게이션 바 재확인 - 여러 선택자 시도
          const headerSelectors = [
            'header.top-navbar',
            '.top-navbar',
            'header',
            '.navbar-container',
            'nav'
          ];
          let header = null;
          for (const selector of headerSelectors) {
            header = document.querySelector(selector);
            if (header) {
              break;
            }
          }
          
          if (header) {
            header.style.setProperty('z-index', '1000', 'important');
            header.style.setProperty('position', 'sticky', 'important');
            header.style.setProperty('top', '0', 'important');
            header.style.setProperty('background-color', window.getComputedStyle(header).backgroundColor || 'rgba(255, 255, 255, 0.95)', 'important');
            header.style.setProperty('backdrop-filter', 'blur(10px)', 'important');
            console.log('Timeout: 네비게이션 바 재확인 완료 (z-index: 1000)');
          }
          
          // 내부 .card 요소 재확인
          if (signupCard) {
            signupCard.style.setProperty('display', 'block', 'important');
            signupCard.style.setProperty('visibility', 'visible', 'important');
            signupCard.style.setProperty('opacity', '1', 'important');
            signupCard.style.setProperty('background-color', '#ffffff', 'important');
            signupCard.style.setProperty('color', '#333333', 'important');
          }
          
          // 내부 #signupForm 요소 재확인
          if (signupForm) {
            signupForm.style.setProperty('display', 'block', 'important');
            signupForm.style.setProperty('visibility', 'visible', 'important');
            signupForm.style.setProperty('opacity', '1', 'important');
          }
          
          // 모든 텍스트 요소 재확인
          const allTextElements = pageElement.querySelectorAll('label, h2, h3, p, span, small, .card-title, .card-subtitle');
          allTextElements.forEach(el => {
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('color', '#333333', 'important');
          });
          
          // 모든 input 요소 재확인
          const allInputs = pageElement.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], input:not([type])');
          allInputs.forEach(input => {
            input.style.setProperty('display', 'block', 'important');
            input.style.setProperty('visibility', 'visible', 'important');
            input.style.setProperty('opacity', '1', 'important');
            input.style.setProperty('background', 'white', 'important');
            input.style.setProperty('border', '1px solid #ccc', 'important');
            input.style.setProperty('height', '40px', 'important');
            input.style.setProperty('color', '#333', 'important');
          });
          
          // 모든 button 요소 재확인
          const allButtons = pageElement.querySelectorAll('button, .btn-primary, [type="submit"]');
          allButtons.forEach(button => {
            button.style.setProperty('display', 'block', 'important');
            button.style.setProperty('visibility', 'visible', 'important');
            button.style.setProperty('opacity', '1', 'important');
            button.style.setProperty('background-color', '#007bff', 'important');
            button.style.setProperty('color', '#ffffff', 'important');
          });
          
          // 강제 렌더링
          void pageElement.offsetWidth;
          void pageElement.offsetHeight;
          if (signupCard) void signupCard.offsetWidth;
          if (signupForm) void signupForm.offsetWidth;
          
          // 최종 상태 확인
          const finalDisplay = window.getComputedStyle(pageElement).display;
          const finalVisibility = window.getComputedStyle(pageElement).visibility;
          const finalOpacity = window.getComputedStyle(pageElement).opacity;
          const finalHeight = pageElement.offsetHeight;
          
          console.log('Timeout 처리 완료:');
          console.log('  - display:', finalDisplay);
          console.log('  - visibility:', finalVisibility);
          console.log('  - opacity:', finalOpacity);
          console.log('  - offsetHeight:', finalHeight);
          
          if (signupCard) {
            console.log('  - 카드 display:', window.getComputedStyle(signupCard).display);
            console.log('  - 카드 offsetHeight:', signupCard.offsetHeight);
          }
          
          if (signupForm) {
            console.log('  - 폼 display:', window.getComputedStyle(signupForm).display);
            console.log('  - 폼 offsetHeight:', signupForm.offsetHeight);
          }
        }, 100);
      } else {
        // 다른 페이지의 경우 .active 클래스 사용
        pageElement.classList.add('active');
        
        // 강제 렌더링 (Force Reflow)
        void pageElement.offsetWidth;
        
        // 스크롤을 페이지 상단으로 이동
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      console.error(`페이지 요소를 찾을 수 없습니다: ${page}-page`);
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
  console.log('setupNavigation 호출됨');
  
  // navigateToPage 함수 확인
  if (typeof navigateToPage !== 'function') {
    console.error('navigateToPage 함수가 정의되지 않았습니다!');
  } else {
    console.log('navigateToPage 함수 확인됨');
  }
  
  // 회원가입 버튼 존재 확인
  const signupBtnCheck = $('#signupNavBtn');
  console.log('회원가입 버튼 존재:', !!signupBtnCheck);
  if (signupBtnCheck) {
    console.log('회원가입 버튼 ID:', signupBtnCheck.id);
    console.log('회원가입 버튼 텍스트:', signupBtnCheck.textContent);
  }
  
  // 로고 클릭 이벤트: 대시보드로 이동
  // 직접 요소 찾기
  const logoLink = document.getElementById('logoLink') || document.querySelector('.logo-horizontal');
  if (logoLink) {
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    logoLink.removeEventListener('click', handleLogoClick);
    logoLink.addEventListener('click', handleLogoClick);
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
  
  // 회원가입 버튼 클릭 이벤트 - document 레벨 이벤트 위임 (가장 확실한 방법)
  // 모든 클릭 이벤트를 document에서 감지하여 회원가입 버튼 클릭 처리
  const handleSignupClick = (e) => {
    // 회원가입 버튼 클릭 확인 (여러 방법으로 확인)
    const target = e.target;
    const signupBtn = target.id === 'signupNavBtn' 
      ? target 
      : target.closest('#signupNavBtn');
    
    if (signupBtn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('회원가입 버튼 클릭됨 (document 이벤트 위임)', signupBtn);
      
      // navigateToPage 함수 확인 및 호출
      const navFunc = typeof navigateToPage === 'function' 
        ? navigateToPage 
        : typeof window.navigateToPage === 'function' 
          ? window.navigateToPage 
          : null;
      
      if (navFunc) {
        console.log('navigateToPage 호출:', navFunc);
        navFunc('signup');
        
        // 추가 확인: 페이지가 표시되었는지 확인 및 강제 표시
        setTimeout(() => {
          const signupPage = document.getElementById('signup-page');
          if (signupPage) {
            console.log('회원가입 페이지 요소 찾음:', signupPage);
            const computedStyle = window.getComputedStyle(signupPage);
            console.log('회원가입 페이지 computed display:', computedStyle.display);
            console.log('회원가입 페이지 computed visibility:', computedStyle.visibility);
            console.log('회원가입 페이지 computed opacity:', computedStyle.opacity);
            console.log('회원가입 페이지 offsetHeight:', signupPage.offsetHeight);
            console.log('회원가입 페이지 offsetWidth:', signupPage.offsetWidth);
            
            // 강제로 표시 (다른 스타일이 덮어쓰는 것을 방지)
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
              console.warn('회원가입 페이지가 여전히 숨겨져 있습니다. 강제로 표시합니다.');
              signupPage.style.setProperty('display', 'block', 'important');
              signupPage.style.setProperty('visibility', 'visible', 'important');
              signupPage.style.setProperty('opacity', '1', 'important');
              signupPage.style.setProperty('height', 'auto', 'important');
              signupPage.style.setProperty('min-height', '400px', 'important');
            }
            
            // 페이지로 스크롤
            signupPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            console.error('회원가입 페이지 요소를 찾을 수 없습니다!');
          }
        }, 300);
      } else {
        console.error('navigateToPage 함수를 찾을 수 없습니다!', {
          navigateToPage: typeof navigateToPage,
          windowNavigateToPage: typeof window.navigateToPage
        });
      }
    }
  };
  
  // document 레벨에서 이벤트 위임 (capture phase에서 실행 - 가장 먼저)
  document.addEventListener('click', handleSignupClick, true);
  
  // 직접 이벤트 리스너도 추가 (이중 보험)
  const signupNavBtn = $('#signupNavBtn');
  if (signupNavBtn) {
    console.log('회원가입 버튼 직접 리스너 추가:', signupNavBtn);
    const directHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('회원가입 버튼 클릭됨 (직접 리스너)', signupNavBtn);
      
      // navigateToPage 호출
      const navFunc = typeof navigateToPage === 'function' 
        ? navigateToPage 
        : typeof window.navigateToPage === 'function' 
          ? window.navigateToPage 
          : null;
      
      if (navFunc) {
        navFunc('signup');
      } else {
        console.error('navigateToPage 함수를 찾을 수 없습니다!');
      }
    };
    
    // 기존 리스너 제거 후 새로 추가
    signupNavBtn.removeEventListener('click', directHandler);
    signupNavBtn.addEventListener('click', directHandler, true); // capture phase
    
    // onclick 속성도 추가 (가장 확실한 방법)
    signupNavBtn.setAttribute('onclick', 'event.preventDefault(); event.stopPropagation(); if(typeof navigateToPage === "function") { navigateToPage("signup"); } else if(typeof window.navigateToPage === "function") { window.navigateToPage("signup"); } return false;');
  } else {
    console.warn('회원가입 버튼을 찾을 수 없습니다!');
  }
}

// URL 기반 라우팅 처리 함수
function handleURLRouting() {
  const path = window.location.pathname;
  
  // 어드민 페이지 접근 처리 - admin.html로 리다이렉트
  if (path === '/admin' || path === '/admin/') {
    window.location.href = '/admin.html';
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
  
  // Setup navigation - 버튼이 준비될 때까지 기다림
  // 회원가입 버튼이 나타날 때까지 최대 2초 대기
  let retryCount = 0;
  const maxRetries = 20;
  const checkAndSetupNavigation = () => {
    const signupBtn = $('#signupNavBtn');
    if (signupBtn || retryCount >= maxRetries) {
      console.log('회원가입 버튼 확인됨, setupNavigation 호출:', !!signupBtn, 'retryCount:', retryCount);
      setupNavigation();
    } else {
      retryCount++;
      setTimeout(checkAndSetupNavigation, 100);
    }
  };
  checkAndSetupNavigation();
  
  // 초기 URL 라우팅 처리 (Firebase 초기화 전에 먼저 체크)
  // 어드민 접근 시도는 admin.html로 리다이렉트
  const currentPath = window.location.pathname;
  if (currentPath === '/admin' || currentPath === '/admin/') {
    window.location.href = '/admin.html';
    return;
  }
  
  // Firebase 초기화 (Auth 상태 감지 시작) - 먼저 초기화
  // initFirebase 내부에서 onAuthStateChanged의 첫 번째 호출이 완료될 때까지 대기
  await initFirebase();
  
  // Firebase 초기화 및 인증 상태 확인 완료 후 URL 라우팅 처리
  // onAuthStateChanged에서도 handleURLRouting()이 호출되지만, 
  // 여기서도 한 번 더 호출하여 확실하게 처리
  handleURLRouting();
  
  // 초기 로드 플래그 해제
  setTimeout(() => {
    window.__isInitialLoad = false;
  }, 1000);
  
  // 브라우저 뒤로/앞으로 버튼 처리
  window.addEventListener('popstate', (event) => {
    handleURLRouting();
  });

  // admin.html에서는 이 함수들을 호출하지 않음 (요소가 없음)
  // admin.html인지 확인
  const isAdminPage = window.location.pathname.includes('admin.html');
  
  if (!isAdminPage) {
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

    // 실제 시세 반영 시도
    fetchAndApplyPrices();
  }

  // 리워드 수정 모달 세팅 (admin.html에서도 사용)
  setupRewardEditModal();
});
