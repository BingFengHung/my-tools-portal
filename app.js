// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}

// Global State
let allRepos = [];
const GITHUB_USERNAME = 'BingFengHung';
const CORE_APPS = [
  'bg-remover-compressor',
  'bubble-level-tool',
  'decision-wheel',
  'white-noise-timer'
];

// DOM Elements
const installBtn = document.getElementById('install-btn');
const refreshBtn = document.getElementById('refresh-btn');
const pwaModal = document.getElementById('pwa-modal');
const modalClose = document.getElementById('modal-close');
const toastMsg = document.getElementById('toast-msg');

const loadingState = document.getElementById('loading-state');
const repoList = document.getElementById('repo-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');

const qrModal = document.getElementById('qr-modal');
const qrClose = document.getElementById('qr-close');
const qrImage = document.getElementById('qr-image');
const qrText = document.getElementById('qr-text');

// 1. PWA Installation Handling
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

// 2. Clear Cache & Refresh
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

// 3. QR Code Modal Handling
document.querySelectorAll('.qr-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const url = e.target.dataset.url;
    openQRModal(url);
  });
});

function openQRModal(url) {
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  qrText.textContent = url;
  qrModal.style.display = 'flex';
}

qrClose.addEventListener('click', () => {
  qrModal.style.display = 'none';
  qrImage.src = '';
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === pwaModal) pwaModal.style.display = 'none';
  if (e.target === qrModal) {
    qrModal.style.display = 'none';
    qrImage.src = '';
  }
});

// 4. Fetch GitHub Repositories
async function loadRepositories() {
  const cacheKey = 'github_repos_cache';
  const cacheTimeKey = 'github_repos_cache_time';
  const cacheDuration = 10 * 60 * 1000; // 10 minutes cache
  
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  
  if (cachedData && cachedTime && (Date.now() - cachedTime < cacheDuration)) {
    console.log('Loading repositories from localStorage cache');
    allRepos = JSON.parse(cachedData);
    renderRepos(allRepos);
    return;
  }
  
  try {
    const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`);
    if (!res.ok) throw new Error('GitHub API rate limit or error');
    const data = await res.json();
    
    // Filter repositories:
    // 1. Must have Pages enabled (or check if we can estimate)
    // 2. Cannot be the portal project itself ('my-tools-portal')
    // 3. Cannot be one of the core featured apps
    allRepos = data.filter(repo => {
      const name = repo.name.toLowerCase();
      const isPortal = name === 'my-tools-portal' || name === 'github-pages-portal';
      const isCore = CORE_APPS.includes(name);
      return (repo.has_pages || repo.homepage) && !isPortal && !isCore;
    });
    
    // Store in cache
    localStorage.setItem(cacheKey, JSON.stringify(allRepos));
    localStorage.setItem(cacheTimeKey, Date.now().toString());
    
    renderRepos(allRepos);
  } catch (err) {
    console.warn('Failed to fetch from GitHub API, falling back to cached local storage data if available.', err);
    if (cachedData) {
      allRepos = JSON.parse(cachedData);
      renderRepos(allRepos);
      showToast('載入 API 失敗，使用先前快取資料。');
    } else {
      // Show empty or error state
      loadingState.style.display = 'none';
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent = '載入專案清單失敗。請確認您的網路連線，或稍後再試！';
    }
  }
}

// 5. Render Repos to Grid
function renderRepos(repos) {
  loadingState.style.display = 'none';
  
  if (repos.length === 0) {
    repoList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  repoList.style.display = 'grid';
  repoList.innerHTML = '';
  
  repos.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'repo-card';
    
    const pagesUrl = repo.homepage || `https://${GITHUB_USERNAME}.github.io/${repo.name}/`;
    const language = repo.language || 'Web';
    const stars = repo.stargazers_count;
    
    card.innerHTML = `
      <div class="repo-header">
        <h4>${repo.name}</h4>
      </div>
      <div class="repo-lang-row">
        <span class="repo-badge">
          <span class="repo-lang-dot"></span>
          ${language}
        </span>
        <span class="repo-stars">⭐ ${stars}</span>
      </div>
      <div class="repo-actions">
        <a href="${pagesUrl}" target="_blank" class="repo-btn repo-btn-pages">開啟網頁</a>
        <a href="${repo.html_url}" target="_blank" class="repo-btn repo-btn-github">GitHub</a>
      </div>
    `;
    
    repoList.appendChild(card);
  });
}

// 6. Search Filter
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  const filtered = allRepos.filter(repo => {
    return repo.name.toLowerCase().includes(query) || 
           (repo.description && repo.description.toLowerCase().includes(query)) ||
           (repo.language && repo.language.toLowerCase().includes(query));
  });
  renderRepos(filtered);
});

// Initialize load
window.addEventListener('load', () => {
  loadRepositories();
});
