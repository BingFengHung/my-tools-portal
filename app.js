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
    desc: '本機圖片壓縮與去背工具，支援色彩選取與橡皮擦，100% 隱私安全，完全離線運作。',
    icon: '📸',
    color: '#e94057'
  },
  'bubble-level-tool': {
    title: '行動水平儀',
    subtitle: 'Bubble Level & Clinometer',
    desc: '利用手機內建的陀螺儀與加速規，支援雙軸水平偵測與數值校準，提供直覺的水平泡泡顯示。',
    icon: '⚖️',
    color: '#10b981'
  },
  'decision-wheel': {
    title: '聚會決定輪盤',
    subtitle: 'Interactive Decision Wheel',
    desc: '聚會抽籤與點餐抉擇神器，支援自訂項目與多種內建主題範本，內建物理阻尼旋轉與音效。',
    icon: '🎲',
    color: '#ff9f43'
  },
  'white-noise-timer': {
    title: '專注白噪音',
    subtitle: 'Ambient Sound & Focus Timer',
    desc: '結合番茄鐘與白噪音混音器，提供雨聲、海浪、篝火等多款環境音，助您進入專注或好眠狀態。',
    icon: '🎵',
    color: '#00b4d8'
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
  showToast('正在清除快取並重新載入...');
  
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
  
  // Clear API cache
  localStorage.removeItem('github_repos_cache');
  localStorage.removeItem('github_repos_cache_time');
  
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

// Initial Load
window.addEventListener('load', () => {
  loadProjects();
});
