// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

// Global State
let allProjects = [];
let pinnedProjects = JSON.parse(localStorage.getItem('pinned_projects')) || [];
const GITHUB_USERNAME = 'BingFengHung';

// Core Metadata for Featured Apps
const CORE_APPS_METADATA = {
  'bg-remover-compressor': {
    title: '影壓去背',
    subtitle: 'Image Compressor & BG Remover',
    desc: '離線圖片處理工具。支援基於色彩容差的魔術棒去背、手動橡皮擦微調，以及無損與有損圖片壓縮，100% 本地運行不洩露隱私。',
    icon: '📸',
    color: '#e94057'
  },
  'bubble-level-tool': {
    title: '行動水平儀',
    subtitle: 'Bubble Level & Clinometer',
    desc: '高精度水平與傾斜度測量儀。調用手機陀螺儀與加速規，提供管狀與圓形雙軸氣泡視覺反光，支援基準線校準與數值鎖定。',
    icon: '⚖️',
    color: '#10b981'
  },
  'decision-wheel': {
    title: '聚會決定輪盤',
    subtitle: 'Interactive Decision Wheel',
    desc: '聚會抉擇抽籤神器。支援午餐、真心話等預置範本與自訂選項，具備模擬物理阻尼的逼真旋轉、指針音效與獲勝彈窗。',
    icon: '🎲',
    color: '#ff9f43'
  },
  'white-noise-timer': {
    title: '專注白噪音',
    subtitle: 'Ambient Sound & Focus Timer',
    desc: '番茄鐘與環境白噪音混音器。內建雨聲、海浪、篝火、風聲等自然音軌，支援多音軌自訂混音音量與背景播放。',
    icon: '🎵',
    color: '#00b4d8'
  },
  'pixel-studio': {
    title: '像素繪圖工坊',
    subtitle: 'Pixel Art & GIF Studio',
    desc: '專業像素畫與動態表情包製作器。支援 16-64 像素網格、自訂色盤與填色工具，具備畫格時間軸，可匯出動態 GIF 或雪碧圖 (Sprite Sheet)。',
    icon: '🎨',
    color: '#a855f7'
  },
  'pocket-synth': {
    title: '隨身合成器與鼓機',
    subtitle: 'Synthesizer & Sequencer',
    desc: '行動電子音樂工作站。包含多音階虛擬琴鍵、ADSR 振幅包絡控制器與 16 步進鼓機音序器，支援 Canvas 即時動態波形示波器。',
    icon: '🎹',
    color: '#6366f1'
  },
  'card-wallet': {
    title: '行動條碼卡包',
    subtitle: 'Mobile Card Wallet',
    desc: '個人電子卡夾與發票載具條碼整理器。支援掃碼讀取或輸入卡號生成一維碼 (Code128) 與二維碼 (QR)，可鎖定螢幕常亮與極大化亮度感應。',
    icon: '💳',
    color: '#14b8a6'
  },
  'retro-gameboy': {
    title: '復古掌上遊戲機',
    subtitle: 'Retro Gameboy Simulator',
    desc: '懷舊掌機模擬器。以經典 Gameboy 實體按鈕蒙皮包裝，內建俄羅斯方塊、貪食蛇與打磚塊遊戲，點擊按鈕具備震動觸覺回饋與 8-bit 音效。',
    icon: '🕹️',
    color: '#ec4899'
  },
  'zen-sketch': {
    title: '禪意手寫板',
    subtitle: 'Zen Sketch Canvas',
    desc: '順滑的隨手塗鴉與心智圖繪圖板。支援 PointerEvents 畫筆壓感與雙指縮放拖拉，具備智慧幾何圖形辨識修正，可導出無背景透明 PNG。',
    icon: '📝',
    color: '#f59e0b'
  },
  'micro-ledger': {
    title: '隱私發票記帳本',
    subtitle: 'Micro Ledger & Charts',
    desc: '隱私至上的個人記帳本。100% 離線運行保障最高數據安全，提供便捷的收支輸入與類別統計，內建 Canvas 繪製的圓餅圖與趨勢柱狀圖。',
    icon: '💵',
    color: '#64748b'
  }
};

// Generic Color Palette for other projects
const THEME_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f59e0b'  // Amber
];

// DOM Elements
const installBtn = document.getElementById('install-btn');
const refreshBtn = document.getElementById('refresh-btn');
const pwaModal = document.getElementById('pwa-modal');
const modalClose = document.getElementById('modal-close');
const toastMsg = document.getElementById('toast-msg');

const btnViewCard = document.getElementById('view-card');
const btnViewIcon = document.getElementById('view-icon');
let currentView = localStorage.getItem('portal_view') || 'card';

// Initialize View Switcher Style
if (currentView === 'card') {
  btnViewCard.classList.add('active');
  btnViewIcon.classList.remove('active');
} else {
  btnViewIcon.classList.add('active');
  btnViewCard.classList.remove('active');
}

btnViewCard.addEventListener('click', () => {
  if (currentView === 'card') return;
  currentView = 'card';
  localStorage.setItem('portal_view', 'card');
  btnViewCard.classList.add('active');
  btnViewIcon.classList.remove('active');
  searchInput.dispatchEvent(new Event('input'));
});

btnViewIcon.addEventListener('click', () => {
  if (currentView === 'icon') return;
  currentView = 'icon';
  localStorage.setItem('portal_view', 'icon');
  btnViewIcon.classList.add('active');
  btnViewCard.classList.remove('active');
  searchInput.dispatchEvent(new Event('input'));
});

const loadingState = document.getElementById('loading-state');
const toolsGrid = document.getElementById('tools-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');

const qrModal = document.getElementById('qr-modal');
const qrClose = document.getElementById('qr-close');
const qrImage = document.getElementById('qr-image');
const qrText = document.getElementById('qr-text');

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'block';
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (isIOS) {
  installBtn.style.display = 'block';
}

installBtn.addEventListener('click', () => {
  if (isIOS) {
    pwaModal.style.display = 'flex';
  } else if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  } else {
    alert('您的瀏覽器已安裝或不支援自動安裝，請從 Safari 選單「加入主畫面」。');
  }
});

modalClose.addEventListener('click', () => pwaModal.style.display = 'none');

// Refresh App Caches
refreshBtn.addEventListener('click', async () => {
  showToast('正在強制清除快取並更新...');
  
  // 1. Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  // 2. Clear Cache Storage
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    } catch (e) {
      console.error(e);
    }
  }
  
  // 3. Clear API cache
  localStorage.removeItem('github_repos_cache');
  localStorage.removeItem('github_repos_cache_time');
  
  // 4. Clear cookies
  try {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
  } catch (e) {
    console.error(e);
  }

  // 5. Force HTTP Cache Refresh by fetching main files with cache: 'reload'
  try {
    await Promise.all([
      fetch('./index.html?cb=' + Date.now(), { cache: 'reload' }),
      fetch('./app.js?cb=' + Date.now(), { cache: 'reload' }),
      fetch('./style.css?cb=' + Date.now(), { cache: 'reload' })
    ]);
  } catch (e) {
    console.warn('HTTP cache reload prefetch failed', e);
  }
  
  // 6. Reload using a unique timestamp search parameter to bypass browser caching
  const url = new URL(window.location.href);
  url.searchParams.set('reload', Date.now().toString());
  window.location.href = url.toString();
});

// Toast Utility
function showToast(msg) {
  toastMsg.textContent = msg;
  toastMsg.classList.add('show');
  setTimeout(() => {
    toastMsg.classList.remove('show');
  }, 2500);
}

// QR Code Modal Handling
function initQRActions() {
  document.querySelectorAll('.qr-btn').forEach(btn => {
    btn.removeEventListener('click', handleQRClick);
    btn.addEventListener('click', handleQRClick);
  });
}

function handleQRClick(e) {
  const url = e.target.dataset.url;
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  qrText.textContent = url;
  qrModal.style.display = 'flex';
}

qrClose.addEventListener('click', () => {
  qrModal.style.display = 'none';
  qrImage.src = '';
});

window.addEventListener('click', (e) => {
  if (e.target === pwaModal) pwaModal.style.display = 'none';
  if (e.target === qrModal) {
    qrModal.style.display = 'none';
    qrImage.src = '';
  }
});

// Fetch and Render Repositories
async function loadProjects() {
  const cacheKey = 'github_repos_cache';
  const cacheTimeKey = 'github_repos_cache_time';
  const cacheDuration = 10 * 60 * 1000; // 10 minutes cache
  
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  
  if (cachedData && cachedTime && (Date.now() - cachedTime < cacheDuration)) {
    console.log('Loading projects from localStorage cache');
    processAndRender(JSON.parse(cachedData));
    return;
  }
  
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`);
    if (!res.ok) throw new Error('GitHub API Error');
    const repos = await res.json();
    
    // Cache raw response
    localStorage.setItem(cacheKey, JSON.stringify(repos));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    
    processAndRender(repos);
  } catch (err) {
    console.warn('Failed to fetch from GitHub API, using fallback data.', err);
    if (cachedData) {
      processAndRender(JSON.parse(cachedData));
      showToast('載入 API 失敗，使用先前快取資料。');
    } else {
      // Offline fallback: At least show the 4 core apps since we have local metadata!
      console.log('No cache found. Showing core apps as fallback.');
      const fallbackRepos = Object.keys(CORE_APPS_METADATA).map(name => ({
        name: name,
        has_pages: true,
        homepage: `https://${GITHUB_USERNAME}.github.io/${name}/`
      }));
      processAndRender(fallbackRepos);
      showToast('無法連接伺服器，已載入預置核心工具。');
    }
  }
}

function processAndRender(repos) {
  loadingState.style.display = 'none';
  
  // Filter repos: Pages must be enabled, and not portal itself
  const filteredRepos = repos.filter(repo => {
    const name = repo.name.toLowerCase();
    const isPortal = name === 'my-tools-portal' || name === 'github-pages-portal';
    return (repo.has_pages || repo.homepage) && !isPortal;
  });
  
  // Build standard project object with title, desc, icon, url, color
  allProjects = filteredRepos.map((repo, idx) => {
    const name = repo.name.toLowerCase();
    const pagesUrl = repo.homepage || `https://${GITHUB_USERNAME}.github.io/${repo.name}/`;
    
    // If it's one of our core apps, use the beautiful custom metadata
    if (CORE_APPS_METADATA[name]) {
      return {
        name: repo.name,
        url: pagesUrl,
        ...CORE_APPS_METADATA[name],
        isCore: true
      };
    }
    
    // Otherwise, generate metadata dynamically
    const lang = repo.language || 'Web';
    let icon = '📁';
    if (lang === 'JavaScript' || lang === 'HTML' || lang === 'CSS') icon = '💻';
    else if (lang === 'Python') icon = '🐍';
    else if (lang === 'TypeScript') icon = '⚡';
    else if (lang === 'Vue' || lang === 'React') icon = '⚛️';
    
    // Choose theme color based on index
    const color = THEME_COLORS[idx % THEME_COLORS.length];
    
    return {
      name: repo.name,
      title: repo.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      subtitle: `${lang} Project`,
      desc: repo.description || '由 GitHub Pages 託管的個人網頁專案，提供高質感的使用體驗。',
      icon: icon,
      color: color,
      url: pagesUrl,
      isCore: false
    };
  });
  
  // Sort projects: Pinned projects first, then core projects, then others
  allProjects.sort((a, b) => {
    const aPinned = pinnedProjects.includes(a.name);
    const bPinned = pinnedProjects.includes(b.name);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return 0;
  });
  
  renderGrid(allProjects);
}

function renderGrid(projects) {
  if (projects.length === 0) {
    toolsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  toolsGrid.style.display = 'grid';
  toolsGrid.innerHTML = '';
  
  if (currentView === 'card') {
    toolsGrid.className = 'core-grid';
    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'core-card';
      card.style.setProperty('--card-glow', project.color);
      
      const isPinned = pinnedProjects.includes(project.name);
      
      card.innerHTML = `
        <button class="pin-btn ${isPinned ? 'active' : ''}" data-name="${project.name}" title="${isPinned ? '取消釘選' : '釘選至最上方'}">📌</button>
        <div class="card-header">
          <div class="card-icon" style="background: ${hexToRgba(project.color, 0.05)}; border-color: ${hexToRgba(project.color, 0.2)}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <img src="${project.url}icon.svg" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.onerror=null; this.outerHTML='<span style=&quot;font-size: 1.8rem; color: ${project.color};&quot;>${project.icon}</span>';">
          </div>
          <div class="card-title-group">
            <h3>${project.title}</h3>
            <p>${project.subtitle}</p>
          </div>
        </div>
        <p class="card-desc">${project.desc}</p>
        <div class="card-actions">
          <a href="${project.url}" target="_blank" class="action-btn play-btn">開啟工具</a>
          <button class="action-btn qr-btn" data-url="${project.url}">QR Code</button>
        </div>
      `;
      
      toolsGrid.appendChild(card);
    });
    
    initQRActions();
  } else {
    toolsGrid.className = 'icon-grid';
    projects.forEach(project => {
      const card = document.createElement('div');
      card.className = 'icon-app-card';
      card.style.setProperty('--card-glow', project.color);
      
      const isPinned = pinnedProjects.includes(project.name);
      
      card.innerHTML = `
        <div class="icon-app-box-wrapper">
          <a href="${project.url}" target="_blank" style="text-decoration: none; display: block;">
            <div class="icon-app-box" style="background: linear-gradient(135deg, ${hexToRgba(project.color, 0.25)}, ${hexToRgba(project.color, 0.05)}); border-color: ${hexToRgba(project.color, 0.35)}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="${project.url}icon.svg" style="width: 100%; height: 100%; object-fit: contain; border-radius: 16px;" onerror="this.onerror=null; this.outerHTML='<span style=&quot;font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));&quot;>${project.icon}</span>';">
            </div>
          </a>
          <button class="icon-pin-btn ${isPinned ? 'active' : ''}" data-name="${project.name}" title="${isPinned ? '取消釘選' : '釘選至最上方'}">📌</button>
        </div>
        <span class="icon-app-title">${project.title}</span>
      `;
      
      toolsGrid.appendChild(card);
    });
  }
}

// Click Delegation for Pinned State
toolsGrid.addEventListener('click', (e) => {
  const pinBtn = e.target.closest('.pin-btn') || e.target.closest('.icon-pin-btn');
  if (pinBtn) {
    e.preventDefault();
    e.stopPropagation();
    const name = pinBtn.dataset.name;
    togglePin(name);
  }
});

function togglePin(name) {
  const idx = pinnedProjects.indexOf(name);
  if (idx > -1) {
    pinnedProjects.splice(idx, 1);
    showToast('已取消釘選專案');
  } else {
    pinnedProjects.push(name);
    showToast('已將專案釘選至最上方');
  }
  localStorage.setItem('pinned_projects', JSON.stringify(pinnedProjects));
  
  // Re-sort allProjects
  allProjects.sort((a, b) => {
    const aPinned = pinnedProjects.includes(a.name);
    const bPinned = pinnedProjects.includes(b.name);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    if (a.isCore && !b.isCore) return -1;
    if (!a.isCore && b.isCore) return 1;
    return 0;
  });
  
  // Trigger search filter refresh
  searchInput.dispatchEvent(new Event('input'));
}

// Search Filtering
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const filtered = allProjects.filter(p => {
    return p.title.toLowerCase().includes(query) ||
           p.subtitle.toLowerCase().includes(query) ||
           p.desc.toLowerCase().includes(query) ||
           p.name.toLowerCase().includes(query);
  });
  renderGrid(filtered);
});

// Helper: Hex to RGBA conversion
function hexToRgba(hex, alpha) {
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return `rgba(${(c >> 16) & 255}, ${(c >> 8) & 255}, ${c & 255}, ${alpha})`;
  }
  return `rgba(255, 255, 255, ${alpha})`;
}

// --- Tab Navigation ---
const navItems = document.querySelectorAll('.nav-item');
const pageViews = document.querySelectorAll('.page-view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.target;
    
    // Update nav active state
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    // Update page active state
    pageViews.forEach(page => {
      if (page.id === target) {
        page.classList.add('active-page');
      } else {
        page.classList.remove('active-page');
      }
    });
    
    // Execute page-specific entry logic
    if (target === 'page-dashboard') {
      initDashboard();
    } else if (target === 'page-diagnostics') {
      runDiagnostics();
    }
  });
});

// --- Weather & Geolocation Widget ---
async function initDashboard() {
  initWeather();
  initLedgerSummary();
  initFocusHeatmap();
}

async function initWeather() {
  const loadingEl = document.getElementById('weather-loading');
  const infoBox = document.getElementById('weather-info');
  const tempEl = document.getElementById('dash-weather-temp');
  const iconEl = document.getElementById('dash-weather-icon');
  const descEl = document.getElementById('dash-weather-desc');
  const locEl = document.getElementById('dash-weather-loc');
  const windEl = document.getElementById('dash-weather-wind');

  loadingEl.style.display = 'block';
  infoBox.style.display = 'none';

  // Default location (Taipei)
  let lat = 25.033;
  let lon = 121.565;
  let locName = '台北市 (預設)';

  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = position.coords.latitude;
      lon = position.coords.longitude;
      locName = `當前定位 (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    } catch (err) {
      console.warn('Geolocation failed or timed out. Using default (Taipei).', err);
    }
  }

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    if (data && data.current_weather) {
      const weather = data.current_weather;
      tempEl.textContent = `${weather.temperature.toFixed(1)}°C`;
      windEl.textContent = `${weather.windspeed.toFixed(1)} km/h`;
      locEl.textContent = locName;

      // Map weather codes
      const codeMap = {
        0: { icon: '☀️', desc: '晴朗無雲' },
        1: { icon: '🌤️', desc: '晴時多雲' },
        2: { icon: '⛅', desc: '多雲時陰' },
        3: { icon: '☁️', desc: '陰天' },
        45: { icon: '🌫️', desc: '有霧' },
        48: { icon: '🌫️', desc: '濃霧' },
        51: { icon: '🌧️', desc: '毛毛細雨' },
        53: { icon: '🌧️', desc: '小雨' },
        55: { icon: '🌧️', desc: '中雨' },
        61: { icon: '🌧️', desc: '陣雨' },
        63: { icon: '🌧️', desc: '大雨' },
        71: { icon: '❄️', desc: '陣雪' },
        73: { icon: '❄️', desc: '中雪' },
        75: { icon: '❄️', desc: '大雪' },
        95: { icon: '⛈️', desc: '雷陣雨' }
      };

      const weatherInfo = codeMap[weather.weathercode] || { icon: '⛅', desc: '多雲' };
      iconEl.textContent = weatherInfo.icon;
      descEl.textContent = weatherInfo.desc;

      loadingEl.style.display = 'none';
      infoBox.style.display = 'flex';
    }
  } catch (err) {
    console.error('Weather fetch failed', err);
    loadingEl.textContent = '獲取氣象資訊失敗，請確認網路連線。';
  }
}

// --- Micro Ledger Stats ---
function initLedgerSummary() {
  const incomeEl = document.getElementById('dash-ledger-income');
  const expenseEl = document.getElementById('dash-ledger-expense');
  const percentEl = document.getElementById('dash-ledger-percent');
  const fillBar = document.getElementById('dash-ledger-fill');

  let totalIncome = 0;
  let totalExpense = 0;

  try {
    const dataStr = localStorage.getItem('micro_ledger_transactions');
    if (dataStr) {
      const transactions = JSON.parse(dataStr);
      transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          totalIncome += amt;
        } else if (t.type === 'expense') {
          totalExpense += amt;
        }
      });
    } else {
      // Fallback preview values if no ledger data yet
      totalIncome = 3650.00;
      totalExpense = 1490.90;
    }
  } catch (e) {
    console.error('Failed to load ledger stats', e);
  }

  incomeEl.textContent = `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  expenseEl.textContent = `$${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const budgetMax = 30000;
  const percent = Math.min(Math.round((totalExpense / budgetMax) * 100), 100);
  percentEl.textContent = `${percent}%`;
  fillBar.style.width = `${percent}%`;
  
  if (percent > 85) {
    fillBar.style.background = 'linear-gradient(90deg, #ef4444, #f43f5e)';
  } else if (percent > 60) {
    fillBar.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
  } else {
    fillBar.style.background = 'linear-gradient(90deg, var(--primary), var(--secondary))';
  }
}

// --- Focus Heatmap ---
function initFocusHeatmap() {
  const container = document.getElementById('dash-heatmap');
  container.innerHTML = '';

  let sessions = [];
  try {
    const sessionStr = localStorage.getItem('focus_sessions');
    if (sessionStr) {
      sessions = JSON.parse(sessionStr);
    }
  } catch (e) {
    console.error('Failed to parse focus sessions', e);
  }

  const sessionCountByDate = {};
  sessions.forEach(s => {
    const date = new Date(s.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    sessionCountByDate[dateStr] = (sessionCountByDate[dateStr] || 0) + 1;
  });

  // Mock visual values if no sessions recorded yet
  if (sessions.length === 0) {
    const now = Date.now();
    for (let i = 0; i < 28; i += 3) {
      const mockDate = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      sessionCountByDate[mockDate] = (i % 3) + 1;
    }
  }

  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = sessionCountByDate[dateStr] || 0;

    let level = 0;
    if (count > 0 && count <= 1) level = 1;
    else if (count === 2) level = 2;
    else if (count >= 3) level = 3;

    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${level}`;
    
    const displayDate = d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    cell.title = `${displayDate}: 完成了 ${count} 次專注番茄鐘`;
    
    container.appendChild(cell);
  }
}

// --- Hardware Diagnostics ---
let orientationBound = false;

function runDiagnostics() {
  // 1. Gyroscope & Accelerometer
  const statusGyro = document.getElementById('status-gyro');
  if ('DeviceOrientationEvent' in window) {
    statusGyro.textContent = '已支援 (感測中)';
    statusGyro.className = 'diag-status supported';
    
    if (!orientationBound) {
      window.addEventListener('deviceorientation', (e) => {
        const xVal = e.beta ? e.beta.toFixed(1) + '°' : '0°';
        const yVal = e.gamma ? e.gamma.toFixed(1) + '°' : '0°';
        const zVal = e.alpha ? e.alpha.toFixed(1) + '°' : '0°';
        document.getElementById('gyro-x').textContent = xVal;
        document.getElementById('gyro-y').textContent = yVal;
        document.getElementById('gyro-z').textContent = zVal;
      });
      orientationBound = true;
    }
  } else {
    statusGyro.textContent = '不支援';
    statusGyro.className = 'diag-status unsupported';
  }

  // 2. Vibration
  const statusVibe = document.getElementById('status-vibe');
  if ('vibrate' in navigator) {
    statusVibe.textContent = '已支援';
    statusVibe.className = 'diag-status supported';
  } else {
    statusVibe.textContent = '不支援 (iOS 禁用)';
    statusVibe.className = 'diag-status unsupported';
  }

  // 3. Battery
  const statusBattery = document.getElementById('status-battery');
  const batteryLevel = document.getElementById('battery-level');
  const batteryCharging = document.getElementById('battery-charging');

  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      statusBattery.textContent = '已支援';
      statusBattery.className = 'diag-status supported';
      
      const updateBatteryUI = () => {
        batteryLevel.textContent = `${Math.round(battery.level * 100)}%`;
        batteryCharging.textContent = battery.charging ? '⚡ 充電中' : '🔌 未充電';
      };
      updateBatteryUI();
      
      battery.addEventListener('levelchange', updateBatteryUI);
      battery.addEventListener('chargingchange', updateBatteryUI);
    });
  } else {
    statusBattery.textContent = '不支援';
    statusBattery.className = 'diag-status unsupported';
  }

  // 4. Network Info
  const statusNetwork = document.getElementById('status-network');
  const netType = document.getElementById('network-type');
  const netSpeed = document.getElementById('network-speed');

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    statusNetwork.textContent = '已支援';
    statusNetwork.className = 'diag-status supported';
    
    const updateNetUI = () => {
      netType.textContent = (conn.effectiveType || conn.type || '未知').toUpperCase();
      netSpeed.textContent = conn.downlink ? conn.downlink + ' Mbps' : '未知';
    };
    updateNetUI();
    conn.addEventListener('change', updateNetUI);
  } else {
    statusNetwork.textContent = '部分支援';
    statusNetwork.className = 'diag-status supported';
    netType.textContent = navigator.onLine ? 'ONLINE (WEB)' : 'OFFLINE';
    netSpeed.textContent = '未知';
  }

  // 5. Wake Lock
  const statusWake = document.getElementById('status-wakelock');
  if ('wakeLock' in navigator) {
    statusWake.textContent = '已支援';
    statusWake.className = 'diag-status supported';
  } else {
    statusWake.textContent = '不支援';
    statusWake.className = 'diag-status unsupported';
  }

  // 6. Standalone Mode
  const statusStandalone = document.getElementById('status-standalone');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isStandalone) {
    statusStandalone.textContent = 'PWA 獨立運行中';
    statusStandalone.className = 'diag-status supported';
  } else {
    statusStandalone.textContent = '瀏覽器分頁運行';
    statusStandalone.className = 'diag-status unsupported';
  }

  // 7. Cache Storage
  const statusCache = document.getElementById('status-cache');
  if ('caches' in window) {
    statusCache.textContent = '已支援 (快取運作中)';
    statusCache.className = 'diag-status supported';
  } else {
    statusCache.textContent = '不支援';
    statusCache.className = 'diag-status unsupported';
  }
}

// Bind Vibration test
document.getElementById('vibrate-test-btn').addEventListener('click', () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(200);
    showToast('觸覺震動觸發成功！');
  } else {
    alert('您的裝置或瀏覽器不支援 Vibration API (例如 iOS 系統 Safari)。');
  }
});

// Bind manual run diagnostics
document.getElementById('run-diagnostics-btn').addEventListener('click', () => {
  runDiagnostics();
  showToast('硬體狀態已更新！');
});

// --- Native Comparison Report Modal ---
const reportModal = document.getElementById('report-modal');
const openReportBtn = document.getElementById('open-report-btn');
const reportClose = document.getElementById('report-close');
const reportContent = document.getElementById('report-content');

const reportHTML = `
  <h3>📲 為什麼我們需要對比 Native 平台？</h3>
  <p>純網頁 Progressive Web App (PWA) 在跨平台一鍵下載與即時更新上有著絕佳優勢，但在調用手機底層硬體權限與背景執行上，與原生平台（iOS Xcode/Swift、Android Studio/Kotlin）有著實質的系統沙盒限制。</p>
  
  <table>
    <thead>
      <tr>
        <th>功能項目</th>
        <th>iOS PWA (Safari)</th>
        <th>iOS Native (Xcode)</th>
        <th>Android PWA (Chrome)</th>
        <th>Android Native</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>加速度與陀螺儀</strong></td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>觸覺震動 (Vibration)</strong></td>
        <td>🔴 禁用</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>藍牙存取 (Bluetooth)</strong></td>
        <td>🔴 禁用</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>NFC 讀寫 (Web NFC)</strong></td>
        <td>🔴 禁用</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>背景常駐執行與定時任務</strong></td>
        <td>🔴 受限</td>
        <td>🟢 支援</td>
        <td>🔴 受限</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>防螢幕自動休眠鎖定</strong></td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
        <td>🟢 支援</td>
      </tr>
      <tr>
        <td><strong>桌面小組件 (Widget)</strong></td>
        <td>🔴 不支援</td>
        <td>🟢 支援</td>
        <td>🔴 不支援</td>
        <td>🟢 支援</td>
      </tr>
    </tbody>
  </table>

  <h3>⛔ 網頁 PWA 無法做到的 3 大原生特徵</h3>
  <ul>
    <li><strong>持久背景運行與守護行程 (Persistent Background Services)</strong>：在 iOS 或 Android 上，原生應用程式可以請求常駐背景服務（如背景定位、VPN 連線、本地 Web 伺服器），而 PWA 當被使用者劃掉或螢幕鎖屏後，執行序會在數分鐘內被系統強制休眠。</li>
    <li><strong>全局系統事件監聽</strong>：原生 App 能監聽手機音量鍵點擊、攔截簡訊驗證碼、偵測手機開機完成 ('BOOT_COMPLETED') 並在背景自動啟動，PWA 則受限於安全沙盒，無法跨出頁面焦點進行監聽。</li>
    <li><strong>全局懸浮視窗 (Overlays)</strong>：Android 原生 App 可以在其他應用畫面上方繪製懸浮窗（如對話大頭貼），網頁 PWA 被嚴格封裝在瀏覽器之內，無法跨出視窗邊界。</li>
  </ul>
`;

openReportBtn.addEventListener('click', () => {
  reportContent.innerHTML = reportHTML;
  reportModal.style.display = 'flex';
});

reportClose.addEventListener('click', () => {
  reportModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === reportModal) {
    reportModal.style.display = 'none';
  }
});

// Initial Load
window.addEventListener('load', () => {
  loadProjects();
});
