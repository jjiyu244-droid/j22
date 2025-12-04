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

// --- 로그인 / 회원 / 유저 상태 (Firebase 기반) ---
const firebase = window.__firebase || {};
const auth = firebase.auth;
const db = firebase.db;

let currentUser = null;
let userStakes = {
  BTC: 0,
  ETH: 0,
  XRP: 0,
};

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

function setupLogin() {
  const loginBtn = $('#loginBtn');
  const modal = $('#loginModal');
  const closeBtn = $('#loginCloseBtn');
  const confirmBtn = $('#loginConfirmBtn');
  const statusText = $('#loginStatusText');
  const titleEl = $('#loginModalTitle');
  const toSignup = $('#toSignup');
  const toLogin = $('#toLogin');
  let mode = 'login'; // 'login' | 'signup'

  loadUsersFromStorage();
  loadUserFromStorage();
  applyUserStakesToPortfolio();
  updateLoginUI();

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
    loginBtn.addEventListener('click', () => {
      if (currentUser) {
        // 로그아웃
        currentUser = null;
        userStakes = { BTC: 0, ETH: 0, XRP: 0 };
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
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
    confirmBtn.addEventListener('click', () => {
      const email = $('#loginEmail').value.trim();
      const password = $('#loginPassword').value.trim();
      if (!email || !password) {
        statusText.textContent = '이메일과 비밀번호를 모두 입력해주세요.';
        return;
      }

      if (mode === 'signup') {
        if (password.length < 4) {
          statusText.textContent = '비밀번호는 4자 이상으로 설정해주세요.';
          return;
        }
        const exists = users.find((u) => u.email === email);
        if (exists) {
          statusText.textContent = '이미 가입된 이메일입니다. 로그인 모드로 전환합니다.';
          setMode('login');
          return;
        }
        users.push({ email, password });
        saveUsersToStorage();
        currentUser = { email };
        saveUserToStorage();
        updateLoginUI();
        statusText.textContent = '회원가입 및 로그인 완료. 창이 자동으로 닫힙니다.';
        setTimeout(() => {
          $('#loginModal').classList.remove('show');
        }, 700);
      } else {
        if (!users.length) {
          statusText.textContent =
            '등록된 계정이 없습니다. 먼저 회원가입을 진행해주세요.';
          return;
        }
        const found = users.find((u) => u.email === email && u.password === password);
        if (!found) {
          statusText.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
          return;
        }
        currentUser = { email };
        saveUserToStorage();
        updateLoginUI();
        statusText.textContent = '로그인 되었습니다. 창이 자동으로 닫힙니다.';
        setTimeout(() => {
          $('#loginModal').classList.remove('show');
        }, 700);
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
  $('#stakeHelper').textContent = '이 값은 실제 체인에 반영되지 않습니다.';

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

  $('#stakeConfirmBtn').addEventListener('click', () => {
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
      helper.textContent = '로그인 후에만 스테이킹 수량이 대시보드에 반영됩니다.';
      return;
    }

    helper.classList.remove('text-danger');
    helper.textContent = `가상으로 ${currentPool.name} 풀에 ${amount} ${currentPool.symbol}를 스테이킹했다고 가정합니다.`;

    // 유저별 스테이킹 수량 업데이트
    userStakes[currentPool.symbol] = (userStakes[currentPool.symbol] || 0) + amount;
    saveUserToStorage();

    // 포트폴리오/요약 수치 갱신
    applyUserStakesToPortfolio();
    renderPortfolio();

    // prepend virtual activity
    activity.unshift({
      type: '스테이킹',
      status: '시뮬레이션',
      time: '방금 전',
      desc: currentPool.name,
      amount: `+${amount} ${currentPool.symbol}`,
      positive: true,
    });
    if (activity.length > 12) activity.pop();
    renderActivity();

    // light feedback
    $('#stakeConfirmBtn').textContent = '완료 (데모)';
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
    document.body.style.background =
      dark
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

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  renderPortfolio();
  renderPools();
  renderActivity();
  animateApy();
  setupSimulator();
  setupStakeModal();
  setupTabs();
  setupThemeToggle();
  setupWalletButton();
  // 실제 시세 반영 시도
  fetchAndApplyPrices();
});


