// Staking portfolio data
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

// 리워드 내역 데이터
const rewardsHistory = [
  {
    date: '2024-12-09',
    coin: 'BTC',
    coinName: '비트코인',
    amount: 0.0015,
    usd: 142.5,
    apy: 3.2,
    status: 'success',
  },
  {
    date: '2024-12-08',
    coin: 'ETH',
    coinName: '이더리움',
    amount: 0.025,
    usd: 85.3,
    apy: 6.8,
    status: 'success',
  },
  {
    date: '2024-12-08',
    coin: 'XRP',
    coinName: '리플',
    amount: 15.5,
    usd: 25.8,
    apy: 5.4,
    status: 'success',
  },
  {
    date: '2024-12-07',
    coin: 'BTC',
    coinName: '비트코인',
    amount: 0.0012,
    usd: 114.0,
    apy: 3.2,
    status: 'success',
  },
  {
    date: '2024-12-07',
    coin: 'ETH',
    coinName: '이더리움',
    amount: 0.022,
    usd: 75.1,
    apy: 6.8,
    status: 'success',
  },
  {
    date: '2024-12-06',
    coin: 'XRP',
    coinName: '리플',
    amount: 14.2,
    usd: 23.6,
    apy: 5.4,
    status: 'success',
  },
  {
    date: '2024-12-06',
    coin: 'BTC',
    coinName: '비트코인',
    amount: 0.0013,
    usd: 123.5,
    apy: 3.2,
    status: 'success',
  },
  {
    date: '2024-12-05',
    coin: 'ETH',
    coinName: '이더리움',
    amount: 0.028,
    usd: 95.6,
    apy: 6.8,
    status: 'pending',
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
      applyUserStakesToPortfolio();
      renderPortfolio();
      updateLoginUI();
      updateAdminUI();
    } else {
      currentUser = null;
      isAdmin = false;
      userStakes = { BTC: 0, ETH: 0, XRP: 0 };
      updateLoginUI();
      updateAdminUI();
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

function updateLoginUI() {
  const loginBtn = $('#loginBtn');
  const welcomeSection = $('.pre-login-welcome');
  if (!loginBtn) return;
  if (currentUser) {
    loginBtn.textContent = `${currentUser.email} (로그아웃)`;
    // 로그인 시 대시보드 섹션 표시, 환영 메시지 숨김
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = '';
    });
    if (welcomeSection) welcomeSection.style.display = 'none';
  } else {
    loginBtn.textContent = '로그인';
    // 로그아웃 시 대시보드 섹션 숨김, 환영 메시지 표시
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = 'none';
    });
    if (welcomeSection) welcomeSection.style.display = '';
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
    const iconUrl = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@latest/svg/color/${item.symbol.toLowerCase()}.svg`;
    el.innerHTML = `
      <div class="token-info">
        <div class="token-icon" style="background:${item.bg};padding:4px;display:flex;align-items:center;justify-content:center;">
          <img src="${iconUrl}" alt="${item.symbol}" style="width:66%;height:66%;object-fit:contain;" />
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
      const iconUrl = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@latest/svg/color/${pool.symbol.toLowerCase()}.svg`;
      el.innerHTML = `
        <div class="pool-main">
          <div class="token-icon" style="background:rgba(148,163,184,0.2);padding:2px;display:flex;align-items:center;justify-content:center;">
            <img src="${iconUrl}" alt="${pool.symbol}" style="width:95%;height:95%;object-fit:contain;" />
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

    resultEl.textContent = `${days}일 후 예상 리워드: ${earned.toFixed(2)} USD | 총 예상 금액: ${total.toFixed(2)} USD`;
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
    </div>
  `;
  $('#stakeAmount').value = '';
  $('#stakeHelper').textContent = '로그인 후 스테이킹 내역이 자동으로 기록됩니다.';

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
      helper.textContent = '로그인이 필요합니다.';
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
      status: '완료',
      time: '방금 전',
      desc: currentPool.name,
      amount: `+${amount} ${currentPool.symbol}`,
      positive: true,
    });
    if (activity.length > 12) activity.pop();
    renderActivity();

    // light feedback
    $('#stakeConfirmBtn').textContent = '완료';
    setTimeout(() => {
      $('#stakeConfirmBtn').textContent = '스테이킹 실행';
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
    <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">유저별 스테이킹 현황 (${users.length}명)</h3>
  `;

  users.forEach((u, idx) => {
    html += `
      <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
        <div style="font-size: 12px; font-weight: 500; margin-bottom: 6px;">
          User ${idx + 1} · <span style="color: #9ca3af; font-size: 11px;">${u.uid.substring(0, 12)}...</span>
        </div>
        <div style="display: flex; gap: 16px; font-size: 11px;">
          <span>BTC: <strong>${(u.BTC || 0).toFixed(4)}</strong></span>
          <span>ETH: <strong>${(u.ETH || 0).toFixed(4)}</strong></span>
          <span>XRP: <strong>${(u.XRP || 0).toFixed(2)}</strong></span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

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

// Initialization
// 페이지 전환 함수
function setupPageNavigation() {
  const navItems = document.querySelectorAll('.nav-item-horizontal[data-page]');
  const rewardsPage = document.getElementById('rewards-page');
  const signupPage = document.getElementById('signup-page');
  const footerSection = document.querySelector('.footer-section');
  const contentSection = document.querySelector('.content-section');
  const overview = document.querySelector('.overview');
  const preLoginWelcome = document.querySelector('.pre-login-welcome');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      
      // 네비게이션 활성화 상태 변경
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // 모든 페이지 숨기기
      if (rewardsPage) rewardsPage.style.display = 'none';
      if (signupPage) signupPage.style.display = 'none';
      if (footerSection) footerSection.style.display = 'none';
      if (contentSection) contentSection.style.display = 'none';
      if (overview) overview.style.display = 'none';
      if (preLoginWelcome) preLoginWelcome.style.display = 'none';

      // 선택한 페이지 표시
      if (page === 'dashboard') {
        // 로그인 여부에 따라 표시
        if (currentUser) {
          if (overview) overview.style.display = 'grid';
          if (contentSection) contentSection.style.display = 'grid';
        } else {
          if (preLoginWelcome) preLoginWelcome.style.display = 'block';
        }
        if (footerSection) footerSection.style.display = 'grid';
      } else if (page === 'pools') {
        // 스테이킹 풀만 표시
        if (contentSection) {
          contentSection.style.display = 'grid';
          const poolCards = contentSection.querySelectorAll('.card');
          poolCards.forEach((card, idx) => {
            card.style.display = idx === 1 ? 'block' : 'none'; // 두 번째 카드만 표시 (스테이킹 풀)
          });
        }
      } else if (page === 'rewards') {
        if (rewardsPage) {
          rewardsPage.style.display = 'block';
          renderRewardsPage();
        }
      } else if (page === 'signup') {
        if (signupPage) signupPage.style.display = 'block';
      }
    });
  });
}

// 리워드 페이지 렌더링
function renderRewardsPage() {
  // 총 리워드 계산
  const totalRewards = rewardsHistory.reduce((sum, r) => sum + r.usd, 0);
  const thisMonth = new Date().getMonth();
  const monthRewards = rewardsHistory
    .filter(r => new Date(r.date).getMonth() === thisMonth)
    .reduce((sum, r) => sum + r.usd, 0);
  
  const avgAPY = (rewardsHistory.reduce((sum, r) => sum + r.apy, 0) / rewardsHistory.length).toFixed(1);

  // 통계 업데이트
  document.getElementById('totalRewardsUSD').textContent = formatUSD(totalRewards);
  document.getElementById('monthRewardsUSD').textContent = formatUSD(monthRewards);
  document.getElementById('avgAPY').textContent = avgAPY + '%';

  // 테이블 렌더링
  renderRewardsTable(rewardsHistory);

  // 필터 이벤트 설정
  const coinFilter = document.getElementById('rewardFilterCoin');
  const periodFilter = document.getElementById('rewardFilterPeriod');

  if (coinFilter && periodFilter) {
    const applyFilters = () => {
      let filtered = [...rewardsHistory];

      // 코인 필터
      const selectedCoin = coinFilter.value;
      if (selectedCoin !== 'all') {
        filtered = filtered.filter(r => r.coin === selectedCoin);
      }

      // 기간 필터
      const selectedPeriod = periodFilter.value;
      const now = new Date();
      if (selectedPeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(r => new Date(r.date) >= weekAgo);
      } else if (selectedPeriod === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(r => new Date(r.date) >= monthAgo);
      } else if (selectedPeriod === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(r => new Date(r.date) >= yearAgo);
      }

      renderRewardsTable(filtered);
    };

    coinFilter.addEventListener('change', applyFilters);
    periodFilter.addEventListener('change', applyFilters);
  }
}

// 리워드 테이블 렌더링
function renderRewardsTable(rewards) {
  const tbody = document.getElementById('rewardsTableBody');
  if (!tbody) return;

  const coinIcons = {
    BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
  };

  tbody.innerHTML = rewards.map(reward => `
    <tr>
      <td style="color:var(--text);">${reward.date}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <img src="${coinIcons[reward.coin]}" alt="${reward.coin}" style="width:24px;height:24px;object-fit:contain;" />
          <span style="font-weight:600;color:var(--text);">${reward.coinName} (${reward.coin})</span>
        </div>
      </td>
      <td style="font-weight:600;color:var(--accent-2);">+${reward.amount} ${reward.coin}</td>
      <td style="color:var(--text);">${formatUSD(reward.usd)}</td>
      <td style="color:var(--text);">${reward.apy}%</td>
      <td>
        <span class="reward-status ${reward.status}">
          ${reward.status === 'success' ? '수령 완료' : '처리 중'}
        </span>
      </td>
    </tr>
  `).join('');
}

// 회원가입 폼 처리
function setupSignupForm() {
  const signupForm = document.getElementById('signupForm');
  const goToLoginBtn = document.getElementById('goToLogin');

  if (goToLoginBtn) {
    goToLoginBtn.addEventListener('click', () => {
      document.getElementById('loginBtn').click();
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
      const name = document.getElementById('signupName').value;
      const agree = document.getElementById('signupAgree').checked;

      // 유효성 검사
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }

      if (password.length < 6) {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }

      if (!agree) {
        alert('이용약관 및 개인정보처리방침에 동의해주세요.');
        return;
      }

      try {
        // Firebase Auth 사용
        if (firebaseAuth) {
          const { createUserWithEmailAndPassword, updateProfile } = await import(
            'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js'
          );

          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          
          // 이름 업데이트
          if (name) {
            await updateProfile(userCredential.user, { displayName: name });
          }

          alert('회원가입이 완료되었습니다! 로그인해주세요.');
          
          // 대시보드로 이동
          document.querySelector('.nav-item-horizontal[data-page="dashboard"]').click();
        }
      } catch (error) {
        console.error('회원가입 오류:', error);
        if (error.code === 'auth/email-already-in-use') {
          alert('이미 사용 중인 이메일입니다.');
        } else if (error.code === 'auth/invalid-email') {
          alert('올바른 이메일 형식이 아닙니다.');
        } else if (error.code === 'auth/weak-password') {
          alert('비밀번호가 너무 약합니다.');
        } else {
          alert('회원가입 중 오류가 발생했습니다: ' + error.message);
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Firebase 초기화 (Auth 상태 감지 시작)
  await initFirebase();

  renderPortfolio();
  renderPools();
  renderActivity();
  animateApy();
  setupSimulator();
  setupStakeModal();
  setupTabs();
  setupThemeToggle();
  setupWalletButton();
  setupPageNavigation();
  setupSignupForm();

  // 로그인 UI 세팅 (Firebase Auth 모듈 동적 로드)
  await setupLogin();

  // 어드민 모달 세팅
  setupAdminModal();

  // 실제 시세 반영 시도
  fetchAndApplyPrices();
});
