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
    const { doc, setDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const docRef = doc(db, 'userStakes', currentUser.uid);
    await setDoc(docRef, userStakes);
  } catch (e) {
    console.error('Firestore에 데이터를 저장하지 못했습니다:', e);
  }
}

// 리워드 데이터 관리
let userRewards = []; // 승인된 리워드 내역

// Firestore에서 유저 리워드 데이터 불러오기
async function loadUserRewardsFromFirestore(uid) {
  try {
    const { collection, query, where, getDocs, orderBy } = await import(
      'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js'
    );
    const rewardsRef = collection(db, 'rewards');
    const q = query(rewardsRef, where('userId', '==', uid), orderBy('approvedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    userRewards = [];
    querySnapshot.forEach((doc) => {
      userRewards.push({
        id: doc.id,
        ...doc.data(),
      });
    });
  } catch (e) {
    console.error('Firestore에서 리워드 데이터를 불러오지 못했습니다:', e);
    userRewards = [];
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

function updateLoginUI() {
  const loginBtn = $('#loginBtn');
  if (!loginBtn) return;
  if (currentUser) {
    loginBtn.textContent = `${currentUser.email} (로그아웃)`;
  } else {
    loginBtn.textContent = '로그인';
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
  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
  } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');

  const setMode = (nextMode) => {
    mode = nextMode;
    if (!titleEl || !confirmBtn || !toSignup || !toLogin) return;
    if (nextMode === 'login') {
      titleEl.textContent = '로그인';
      confirmBtn.textContent = '로그인';
      statusText.textContent = '';
      toSignup.classList.remove('auth-switch-link--hidden');
      toLogin.classList.add('auth-switch-link--hidden');
    } else {
      titleEl.textContent = '회원가입';
      confirmBtn.textContent = '회원가입 완료';
      statusText.textContent = '';
      toSignup.classList.add('auth-switch-link--hidden');
      toLogin.classList.remove('auth-switch-link--hidden');
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

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const email = $('#loginEmail').value.trim();
      const password = $('#loginPassword').value.trim();
      if (!email || !password) {
        statusText.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
        return;
      }

      if (mode === 'signup') {
        if (password.length < 6) {
          statusText.textContent = 'Firebase는 비밀번호 6자 이상을 요구합니다.';
          return;
        }
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          statusText.textContent = '회원가입 및 로그인 완료. 창이 자동으로 닫힙니다.';
          setTimeout(() => {
            $('#loginModal').classList.remove('show');
          }, 700);
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            statusText.textContent = '이미 가입된 이메일입니다. 로그인 모드로 전환합니다.';
            setMode('login');
          } else {
            statusText.textContent = `회원가입 실패: ${error.message}`;
          }
        }
      } else {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          statusText.textContent = '로그인 되었습니다. 창이 자동으로 닫힙니다.';
          setTimeout(() => {
            $('#loginModal').classList.remove('show');
          }, 700);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            statusText.textContent = '등록된 계정이 없습니다. 먼저 회원가입을 진행해주세요.';
          } else if (error.code === 'auth/wrong-password') {
            statusText.textContent = '비밀번호가 올바르지 않습니다.';
          } else {
            statusText.textContent = `로그인 실패: ${error.message}`;
          }
        }
      }
    });
  }

  if (toSignup) {
    toSignup.addEventListener('click', () => setMode('signup'));
  }
  if (toLogin) {
    toLogin.addEventListener('click', () => setMode('login'));
  }
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

function renderAdminDashboard(users) {
  const container = $('#adminContent');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<p style="color:#9ca3af;">스테이킹 데이터가 없습니다.</p>';
    return;
  }

  let totalBTC = 0;
  let totalETH = 0;
  let totalXRP = 0;

  users.forEach((u) => {
    totalBTC += u.BTC || 0;
    totalETH += u.ETH || 0;
    totalXRP += u.XRP || 0;
  });

  // APY 정보
  const poolApy = {
    BTC: 3.2,
    ETH: 6.8,
    XRP: 5.4,
  };

  let html = `
    <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">전체 스테이킹 합계</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div>
          <div style="font-size: 11px; color: #9ca3af;">BTC</div>
          <div style="font-size: 16px; font-weight: 600; color: #f97316;">${totalBTC.toFixed(4)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">ETH</div>
          <div style="font-size: 16px; font-weight: 600; color: #4f46e5;">${totalETH.toFixed(4)}</div>
        </div>
        <div>
          <div style="font-size: 11px; color: #9ca3af;">XRP</div>
          <div style="font-size: 16px; font-weight: 600; color: #06b6d4;">${totalXRP.toFixed(2)}</div>
        </div>
      </div>
    </div>
    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">유저별 스테이킹 현황 및 승인 (${users.length}명)</h3>
  `;

  users.forEach((u, idx) => {
    html += `
      <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 6px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 500; margin-bottom: 12px;">
          User ${idx + 1} · <span style="color: #9ca3af; font-size: 11px;">${u.uid.substring(0, 12)}...</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
    `;

    ['BTC', 'ETH', 'XRP'].forEach((symbol) => {
      const amount = u[symbol] || 0;
      if (amount > 0) {
        // 월별 리워드 계산 (연간 APY / 12)
        const monthlyApy = poolApy[symbol] / 12;
        const monthlyReward = (amount * monthlyApy) / 100;
        
        html += `
          <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px;">${symbol}</div>
            <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">
              스테이킹: <strong>${amount.toFixed(symbol === 'XRP' ? 2 : 4)}</strong>
            </div>
            <div style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">
              APY: ${poolApy[symbol]}%<br/>
              예상 월 리워드: ${monthlyReward.toFixed(symbol === 'XRP' ? 2 : 6)}
            </div>
            <button 
              class="btn-primary" 
              style="width: 100%; padding: 8px; font-size: 11px;"
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
    `;
  });

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
    // 어드민 대시보드 새로고침
    const users = await loadAllUserStakes();
    renderAdminDashboard(users);
    // 만약 해당 유저가 현재 로그인되어 있다면 리워드 내역도 새로고침
    if (currentUser && currentUser.uid === userId) {
      await renderRewards();
    }
  } else {
    alert('리워드 승인 중 오류가 발생했습니다.');
  }
};

function setupAdminModal() {
  const adminBtn = $('#adminBtn');
  const modal = $('#adminModal');
  const closeBtn = $('#adminCloseBtn');

  if (adminBtn) {
    adminBtn.addEventListener('click', async () => {
      modal.classList.add('show');
      $('#adminContent').innerHTML = '<p style="color:#9ca3af;">데이터를 불러오는 중...</p>';
      const users = await loadAllUserStakes();
      renderAdminDashboard(users);
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
function navigateToPage(page) {
  // Hide all page sections
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
  if (page === 'dashboard' || page === 'pools') {
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
  } else {
    // Hide main content sections for other pages
    document.querySelectorAll('.content-section:not(.page-section), .pre-login-welcome').forEach((section) => {
      section.style.display = 'none';
    });
    
    // Show the specific page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
      pageElement.style.display = 'block';
    }
    
    // 리워드 페이지인 경우 리워드 렌더링
    if (page === 'rewards') {
      renderRewards();
    }
  }

  // Scroll to top for dashboard and other pages (not pools)
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Expose navigateToPage globally for inline handlers
window.navigateToPage = navigateToPage;

function setupNavigation() {
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
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Firebase 초기화 (Auth 상태 감지 시작)
  await initFirebase();

  // Setup navigation first
  setupNavigation();

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

  // 로그인 UI 세팅 (Firebase Auth 모듈 동적 로드)
  await setupLogin();

  // 어드민 모달 세팅
  setupAdminModal();

  // 실제 시세 반영 시도
  fetchAndApplyPrices();
});
