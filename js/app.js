import { DashboardView } from './views/dashboard.js?v=1.0.3';
import { ClockInView } from './views/clockin.js?v=1.0.3';
import { HistoryView } from './views/history.js?v=1.0.3';
import { CalendarView } from './views/calendar.js?v=1.0.3';
import { EmployeesView } from './views/employees.js?v=1.0.3';
import { LoginView } from './views/login.js?v=1.0.3';
import { Store } from './store.js?v=1.0.3';

const ROUTES = {
  dashboard: DashboardView,
  clockin: ClockInView,
  history: HistoryView,
  calendar: CalendarView,
  jobs: EmployeesView,
  login: LoginView
};

export const AppRouter = {
  currentView: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // 檢查 document.readyState 以避免 type="module" 腳本載入時已錯過 DOMContentLoaded 事件
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => {
        Store.getEmployees();
        this.handleRoute();
      });
    } else {
      Store.getEmployees();
      this.handleRoute();
    }

    // 動態綁定現有與未來的導覽列按鈕點擊事件
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (link) {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        this.navigate(route);
      }
    });
  },

  navigate(path) {
    window.location.hash = `#/${path}`;
  },

  async handleRoute() {
    const hash = window.location.hash;
    let routeName = hash.replace(/^#\/?/, '').split('/')[0] || 'clockin';

    if (!ROUTES[routeName]) {
      routeName = 'clockin';
    }

    // 1. 背景非同步同步雲端資料庫最新資料 (不阻塞換頁，提升 UI 流暢度)
    Store.syncFromCloud().then((syncSuccess) => {
      this.updateSyncBanner();
      
      // 若資料同步完成後，當前頁面的內容需要重渲染以顯示最新員工/紀錄
      if (this.currentView === routeName && 
          ['login', 'clockin', 'jobs', 'history', 'dashboard'].includes(this.currentView)) {
        const view = ROUTES[this.currentView];
        const mainContent = document.getElementById('main-content');
        if (mainContent && view) {
          mainContent.innerHTML = view.render();
          view.init();
        }
      }
    }).catch(err => {
      console.error('背景資料同步失敗:', err);
    });

    // 2. 路由守衛 (Route Guard)
    const session = Store.getSession();

    if (!session.role) {
      // 未登入，一律強制導向登入頁面
      if (routeName !== 'login') {
        routeName = 'login';
        window.location.hash = '#/login';
        return; // 終止本次路由，等待 hashchange 重新觸發
      }
    } else if (session.role === 'employee') {
      // 員工身分：僅允許使用打卡頁，其他路由一律踢回打卡頁
      if (routeName !== 'clockin') {
        routeName = 'clockin';
        window.location.hash = '#/clockin';
        return;
      }
    }

    // 3. 更新介面權限遮罩樣式 (員工身分或登入頁皆隱藏導覽列)
    const appEl = document.getElementById('app');
    const topLogoEl = document.getElementById('mobile-top-logo');
    if (appEl) {
      if (session.role === 'employee' || routeName === 'login') {
        appEl.classList.add('role-employee');
        if (topLogoEl) {
          if (routeName === 'login') {
            topLogoEl.style.display = 'none';
            appEl.classList.remove('has-top-logo');
          } else {
            topLogoEl.style.display = 'flex';
            appEl.classList.add('has-top-logo');
          }
        }
      } else {
        appEl.classList.remove('role-employee');
        appEl.classList.remove('has-top-logo');
        if (topLogoEl) topLogoEl.style.display = 'none';
      }
    }

    // 4. 更新頂部同步 Banner
    this.updateSyncBanner();

    const view = ROUTES[routeName];
    this.currentView = routeName;

    // 渲染 HTML
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = view.render();
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
      banner.style.backgroundColor = '#dbeafe'; // 淡藍色
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

window.AppRouter = AppRouter;

AppRouter.init();
