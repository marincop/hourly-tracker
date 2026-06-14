import { DashboardView } from './views/dashboard.js';
import { ClockInView } from './views/clockin.js';
import { HistoryView } from './views/history.js';
import { CalendarView } from './views/calendar.js';
import { EmployeesView } from './views/employees.js';
import { Store } from './store.js';

const ROUTES = {
  dashboard: DashboardView,
  clockin: ClockInView,
  history: HistoryView,
  calendar: CalendarView,
  jobs: EmployeesView
};

export const AppRouter = {
  currentView: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('DOMContentLoaded', () => {
      // 確保至少有預設工作資料
      Store.getJobs();
      this.handleRoute();
    });

    // 綁定導覽列連結點擊
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        this.navigate(route);
      });
    });
  },

  navigate(path) {
    window.location.hash = `#/${path}`;
  },

  async handleRoute() {
    const hash = window.location.hash;
    // 解析路徑，預設跳轉到打卡頁面
    let routeName = hash.replace(/^#\/?/, '').split('/')[0] || 'clockin';

    // 如果是不存在的路由，預設回打卡頁
    if (!ROUTES[routeName]) {
      routeName = 'clockin';
    }

    // 1. 同步雲端資料庫最新資料
    await Store.syncFromCloud();

    // 2. 更新頂部同步 Banner
    this.updateSyncBanner();

    const view = ROUTES[routeName];
    this.currentView = routeName;

    // 渲染 HTML
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = view.render();
      // 執行視圖初始化邏輯
      view.init();
    }

    // 更新導覽列選取狀態
    this.updateActiveNavLink(routeName);
  },

  updateSyncBanner() {
    const banner = document.getElementById('sync-warning-banner');
    if (!banner) return;

    const mode = Store.getMode();

    if (mode === 'supabase') {
      banner.style.display = 'block';
      banner.style.backgroundColor = 'var(--macaron-green)';
      banner.style.color = '#2e6930';
      banner.style.borderColor = 'rgba(140, 216, 167, 0.4)';
      banner.innerHTML = `<i data-lucide="cloud" style="width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i> 雲端即時同步模式已啟用 (Supabase) • 全體員工可各自以手機打卡，資料即時更新`;
    } else if (mode === 'local_server') {
      banner.style.display = 'block';
      banner.style.backgroundColor = '#dbeafe'; // 淡藍色馬卡龍
      banner.style.color = '#1e40af';
      banner.style.borderColor = 'rgba(191, 219, 254, 0.5)';
      banner.innerHTML = `<i data-lucide="wifi" style="width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i> 店面 Wi-Fi 共享同步中 • 資料正即時儲存於您的 Mac 主機上 (資料庫免設定)`;
    } else {
      banner.style.display = 'block';
      banner.style.backgroundColor = 'var(--macaron-yellow)';
      banner.style.color = '#796112';
      banner.style.borderColor = 'rgba(255, 210, 117, 0.4)';
      banner.innerHTML = `<i data-lucide="alert-circle" style="width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i> 目前處於本地測試模式（單機儲存）。如需多人手機打卡，請參閱 <a href="file:///Users/albert/.gemini/antigravity/brain/ad7cd05a-9112-466e-867b-1e0c9100b4c6/deploy_guide.md" style="text-decoration: underline; font-weight: 700;">部署指南</a> 設定 Supabase 雲端資料庫。`;
    }
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  updateActiveNavLink(activeRoute) {
    // 側邊欄與行動版導覽列連結
    const links = document.querySelectorAll('[data-route]');
    links.forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === activeRoute) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
};

// 全域註冊以便跨組件導航
window.AppRouter = AppRouter;

AppRouter.init();
