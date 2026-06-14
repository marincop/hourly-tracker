import { Store } from '../store.js';
import { Utils } from '../utils.js';

export const ClockInView = {
  timerInterval: null,

  render() {
    const employees = Store.getEmployees();
    const activeShifts = Store.getActiveShifts();
    const session = Store.getSession();

    // 1. 如果沒有登入，將無法渲染 (正常路由守衛會攔截，此處做雙重保障)
    if (!session.role) {
      return `<div class="empty-state">請先登入系統</div>`;
    }

    const isAdmin = session.role === 'admin';

    // 2. 如果沒有建立任何員工，引導管理者先去新增員工
    if (employees.length === 0) {
      return `
        <div class="view-header">
          <div>
            <h2 class="view-title">即時員工打卡</h2>
            <p class="view-subtitle">管理並監控所有員工的打卡與薪資狀況</p>
          </div>
        </div>
        <div class="glass-card" style="text-align: center; padding: 4rem 2rem; max-width: 600px; margin: 2rem auto;">
          <div class="logo-icon" style="margin: 0 auto 1.5rem; width: 64px; height: 64px; border-radius: var(--radius-md);">
            <i data-lucide="users" style="width: 32px; height: 32px; color: var(--text-main);"></i>
          </div>
          <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">需要先設定員工檔案！</h3>
          <p style="color: var(--text-muted); margin-bottom: 2rem; line-height: 1.6;">
            您需要先新增至少一名員工，接著才能在打卡面板為他們打卡上班、管理休息狀態以及進行工資結算。
          </p>
          <button class="btn btn-primary" onclick="window.AppRouter.navigate('jobs')">
            <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
            新增第一名員工
          </button>
        </div>
      `;
    }

    // 3. 分流渲染邏輯
    let employeeCardsHtml = '';
    let headerActionHtml = '';

    if (isAdmin) {
      // --- 管理者視角：顯示所有員工卡片 + 登出按鈕 ---
      headerActionHtml = `
        <button id="logout-btn" class="btn btn-secondary btn-sm" style="color: var(--color-danger); border-color: rgba(255,159,159,0.3);">
          <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
          登出控制台
        </button>
      `;

      employeeCardsHtml = employees.map(emp => {
        const activeShift = activeShifts[emp.id];
        const isOnDuty = !!activeShift;
        const statusLabel = isOnDuty ? (activeShift.status === 'working' ? '工作中' : '休息中 (暫停計薪)') : '未上班';
        const statusClass = isOnDuty ? (activeShift.status === 'working' ? 'working' : 'break') : '';
        const cardColor = emp.color || '#E8DFF5';

        return `
          <div class="glass-card emp-clock-card" data-employee-id="${emp.id}" style="--job-color: ${cardColor}; border-left: 6px solid ${cardColor}; padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 300px; opacity: ${isOnDuty ? '1' : '0.85'};">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                <div>
                  <h4 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.1rem;">${emp.name}</h4>
                  <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${emp.role}</span>
                </div>
                <span class="status-badge ${statusClass}" style="margin-bottom: 0; padding: 0.3rem 0.7rem; font-size: 0.75rem; background: ${isOnDuty ? '' : 'rgba(0,0,0,0.05)'}; color: ${isOnDuty ? '' : 'var(--text-muted)'};">
                  ${statusLabel}
                </span>
              </div>
              <div class="clock-timer" id="timer-${emp.id}" style="font-size: 2.2rem; margin-bottom: 0.3rem; text-align: left; color: ${isOnDuty ? 'var(--text-main)' : 'var(--text-muted)'};">00:00:00</div>
              <div class="live-earnings" style="justify-content: flex-start; margin-bottom: 1rem; font-size: 1.15rem;">
                <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">結算薪資：</span>
                <span class="live-earnings-num" id="earnings-${emp.id}" style="color: ${isOnDuty ? '#5aa16b' : 'var(--text-muted)'}; font-weight: 700;">$0</span>
              </div>
            </div>
            <div style="margin-bottom: 1.5rem; opacity: ${isOnDuty ? '1' : '0.4'};">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem;">
                <span>薪資遞增進度條 (+ $50)</span>
                <span id="progress-text-${emp.id}">已累積 0 分 0 秒 / 15 分</span>
              </div>
              <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.05); border-radius: 99px; overflow: hidden; position: relative;">
                <div id="progress-bar-${emp.id}" style="width: 0%; height: 100%; background: ${cardColor}; border-radius: 99px; transition: width 0.1s linear;"></div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <div style="display: flex; gap: 0.5rem; width: 100%;">
                <button class="btn btn-secondary btn-sm emp-clockin-btn" data-id="${emp.id}" style="flex-grow: 1; padding: 0.6rem 0; font-weight: 700; background: ${isOnDuty ? '#f5f5f5' : 'rgba(214, 234, 216, 0.4)'}; color: ${isOnDuty ? 'var(--text-muted)' : '#2e6930'}; border: 1px solid ${isOnDuty ? 'transparent' : 'rgba(140, 216, 167, 0.5)'};" ${isOnDuty ? 'disabled' : ''}>
                  <i data-lucide="play" style="width: 14px; height: 14px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                  ${isOnDuty ? '已上班' : '上班打卡'}
                </button>
                <button class="btn btn-secondary btn-sm emp-clockout-btn" data-id="${emp.id}" style="flex-grow: 1; padding: 0.6rem 0; font-weight: 700; background: ${isOnDuty ? 'rgba(255, 159, 159, 0.25)' : '#f5f5f5'}; color: ${isOnDuty ? '#a83c3c' : 'var(--text-muted)'}; border: 1px solid ${isOnDuty ? 'rgba(255, 159, 159, 0.6)' : 'transparent'};" ${isOnDuty ? '' : 'disabled'}>
                  <i data-lucide="log-out" style="width: 14px; height: 14px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                  下班結算
                </button>
              </div>
              ${isOnDuty ? `
                <button class="btn btn-secondary btn-sm toggle-break-btn" data-id="${emp.id}" style="width: 100%; padding: 0.5rem 0; font-size: 0.8rem; background: #ffffff; border: 1px solid var(--border-light);">
                  <i data-lucide="${activeShift.status === 'working' ? 'coffee' : 'chevron-right'}" style="width: 13px; height: 13px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                  ${activeShift.status === 'working' ? '點擊休息' : '結束休息，繼續工作'}
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      // --- 員工個人視角：僅顯示該登入員工的卡片，並提供「安全登出」 ---
      const myId = session.userId;
      const myEmp = employees.find(e => e.id === myId);
      
      if (!myEmp) {
        // 容錯防護
        Store.clearSession();
        setTimeout(() => window.location.reload(), 100);
        return '';
      }

      headerActionHtml = `
        <button id="logout-btn" class="btn btn-secondary btn-sm">
          <i data-lucide="log-out" style="width: 16px; height: 16px;"></i>
          登出 / 切換身分
        </button>
      `;

      const activeShift = activeShifts[myId];
      const isOnDuty = !!activeShift;
      const statusLabel = isOnDuty ? (activeShift.status === 'working' ? '工作中' : '休息中 (暫停計薪)') : '未上班';
      const statusClass = isOnDuty ? (activeShift.status === 'working' ? 'working' : 'break') : '';
      const cardColor = myEmp.color || '#E8DFF5';

      employeeCardsHtml = `
        <div class="glass-card emp-clock-card" data-employee-id="${myEmp.id}" style="--job-color: ${cardColor}; border-left: 6px solid ${cardColor}; padding: 2rem; display: flex; flex-direction: column; justify-content: space-between; min-height: 350px; max-width: 500px; margin: 0 auto; opacity: 1;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
              <div>
                <h4 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem;">${myEmp.name}</h4>
                <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">${myEmp.role}</span>
              </div>
              <span class="status-badge ${statusClass}" style="margin-bottom: 0; padding: 0.4rem 0.8rem; font-size: 0.8rem; background: ${isOnDuty ? '' : 'rgba(0,0,0,0.05)'}; color: ${isOnDuty ? '' : 'var(--text-muted)'};">
                ${statusLabel}
              </span>
            </div>
            
            <div class="clock-timer" id="timer-${myEmp.id}" style="font-size: 3rem; margin-bottom: 0.5rem; text-align: left; color: ${isOnDuty ? 'var(--text-main)' : 'var(--text-muted)'};">00:00:00</div>
            <div class="live-earnings" style="justify-content: flex-start; margin-bottom: 1.5rem; font-size: 1.35rem;">
              <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 500;">結算薪資：</span>
              <span class="live-earnings-num" id="earnings-${myEmp.id}" style="color: ${isOnDuty ? '#5aa16b' : 'var(--text-muted)'}; font-weight: 700;">$0</span>
            </div>
          </div>
          <div style="margin-bottom: 2rem; opacity: ${isOnDuty ? '1' : '0.4'};">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem;">
              <span>薪資遞增進度條 (+ $50)</span>
              <span id="progress-text-${myEmp.id}">已累積 0 分 0 秒 / 15 分</span>
            </div>
            <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.05); border-radius: 99px; overflow: hidden; position: relative;">
              <div id="progress-bar-${myEmp.id}" style="width: 0%; height: 100%; background: ${cardColor}; border-radius: 99px; transition: width 0.1s linear;"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.8rem;">
            <div style="display: flex; gap: 0.8rem; width: 100%;">
              <button class="btn btn-secondary emp-clockin-btn" data-id="${myEmp.id}" style="flex-grow: 1; padding: 0.9rem 0; font-size: 1.05rem; font-weight: 700; background: ${isOnDuty ? '#f5f5f5' : 'rgba(214, 234, 216, 0.5)'}; color: ${isOnDuty ? 'var(--text-muted)' : '#2e6930'}; border: 1px solid ${isOnDuty ? 'transparent' : 'rgba(140, 216, 167, 0.5)'};" ${isOnDuty ? 'disabled' : ''}>
                <i data-lucide="play" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                ${isOnDuty ? '已上班' : '上班打卡'}
              </button>
              <button class="btn btn-secondary emp-clockout-btn" data-id="${myEmp.id}" style="flex-grow: 1; padding: 0.9rem 0; font-size: 1.05rem; font-weight: 700; background: ${isOnDuty ? 'rgba(255, 159, 159, 0.35)' : '#f5f5f5'}; color: ${isOnDuty ? '#a83c3c' : 'var(--text-muted)'}; border: 1px solid ${isOnDuty ? 'rgba(255, 159, 159, 0.6)' : 'transparent'};" ${isOnDuty ? '' : 'disabled'}>
                <i data-lucide="log-out" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                下班結算
              </button>
            </div>
            ${isOnDuty ? `
              <button class="btn btn-secondary toggle-break-btn" data-id="${myEmp.id}" style="width: 100%; padding: 0.8rem 0; font-size: 0.9rem; background: #ffffff; border: 1px solid var(--border-light);">
                <i data-lucide="${activeShift.status === 'working' ? 'coffee' : 'chevron-right'}" style="width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                ${activeShift.status === 'working' ? '點擊休息' : '結束休息，繼續工作'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="view-header">
        <div>
          <h2 class="view-title">即時員工打卡</h2>
          <p class="view-subtitle">${isAdmin ? '全體員工一覽，獨立「上班」與「下班」打卡控制（15分鐘/50元）' : '個人打卡系統'}</p>
        </div>
        <div>
          ${headerActionHtml}
        </div>
      </div>

      <!-- 員工打卡監控面板 -->
      <div style="${isAdmin ? 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.8rem;' : 'padding: 1rem 0;'}">
        ${employeeCardsHtml}
      </div>

      <!-- 下班打卡備註模態框 -->
      <div id="clockout-modal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">下班工資結算</h3>
            <span class="modal-close" id="modal-close-btn">&times;</span>
          </div>
          <div class="modal-body">
            <input type="hidden" id="modal-emp-id" value="">
            <div style="background: #ffffff; padding: 1.2rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-weight: 600;">
                <span style="color: var(--text-muted);">員工姓名：</span>
                <span id="modal-emp-name" style="font-weight: 700;">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-weight: 600;">
                <span style="color: var(--text-muted);">上班時段：</span>
                <span id="modal-emp-time-range">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.6rem; font-weight: 600;">
                <span style="color: var(--text-muted);">實際工作時數：</span>
                <span id="modal-emp-hours">-</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: #5aa16b; font-size: 1.25rem; border-top: 1px dashed var(--border-light); padding-top: 0.6rem; margin-top: 0.6rem;">
                <span>應付薪資支出：</span>
                <span id="modal-emp-earnings">-</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: 0.4rem; font-weight: 500;">
                * 休息時間已從計費工時中自動扣除（不計薪）
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="clockout-note">填寫班次備註 (選填)</label>
              <textarea id="clockout-note" class="form-input" rows="3" placeholder="例如：本日提早交接、協助補貨、遲到 5 分鐘..." style="resize: none;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button id="modal-cancel-btn" class="btn btn-secondary">返回</button>
            <button id="modal-confirm-btn" class="btn btn-primary" style="background: var(--color-success); border-color: var(--color-success);">確認下班並寫入歷史</button>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    // 清除舊的計時器
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    const logoutBtn = document.getElementById('logout-btn');

    // 模態框相關 DOM
    const clockoutModal = document.getElementById('clockout-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalEmpId = document.getElementById('modal-emp-id');
    const modalEmpName = document.getElementById('modal-emp-name');
    const modalEmpTimeRange = document.getElementById('modal-emp-time-range');
    const modalEmpHours = document.getElementById('modal-emp-hours');
    const modalEmpEarnings = document.getElementById('modal-emp-earnings');
    const clockoutNote = document.getElementById('clockout-note');

    // 登出按鈕事件
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const confirmLogout = confirm('確定要登出並切換身分嗎？');
        if (confirmLogout) {
          Store.clearSession();
          window.AppRouter.navigate('login');
        }
      });
    }

    // 綁定各卡片的「上班打卡」按鈕
    const clockinBtns = document.querySelectorAll('.emp-clockin-btn');
    clockinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        if (!empId) return;

        const started = Store.startClockIn(empId);
        if (started) {
          window.AppRouter.navigate('clockin');
        }
      });
    });

    // 綁定各卡片的「下班結算」按鈕
    const clockoutBtns = document.querySelectorAll('.emp-clockout-btn:not([disabled])');
    clockoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        const activeShifts = Store.getActiveShifts();
        const shift = activeShifts[empId];
        if (!shift) return;

        const now = Date.now();
        let finalBreakDuration = shift.totalBreakDuration;
        if (shift.status === 'on_break' && shift.breakStartTime) {
          finalBreakDuration += (now - shift.breakStartTime);
        }

        const totalDurationMs = now - shift.startTime - finalBreakDuration;
        const totalMins = Math.max(0, totalDurationMs / (1000 * 60));
        const totalHours = totalMins / 60;
        const earnings = Math.floor(totalMins / 15) * 50;

        // 填寫模態框資料
        modalEmpId.value = empId;
        modalEmpName.textContent = shift.employeeName;
        modalEmpTimeRange.textContent = `${Utils.formatDate(shift.startTime, 'HH:mm')} - ${Utils.formatDate(now, 'HH:mm')}`;
        
        const breakMins = Math.round(finalBreakDuration / 60000);
        modalEmpHours.textContent = `${totalHours.toFixed(2)} 小時 (實際工作約 ${Math.round(totalMins)} 分鐘，休息 ${breakMins} 分鐘)`;
        modalEmpEarnings.textContent = Utils.formatCurrency(earnings, 0);
        clockoutNote.value = '';

        // 顯示模態框
        clockoutModal.classList.add('active');
      });
    });

    // 綁定「休息」按鈕
    const breakBtns = document.querySelectorAll('.toggle-break-btn');
    breakBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        const activeShifts = Store.getActiveShifts();
        const shift = activeShifts[empId];
        if (!shift) return;

        if (shift.status === 'working') {
          Store.startBreak(empId);
        } else {
          Store.endBreak(empId);
        }
        window.AppRouter.navigate('clockin');
      });
    });

    // 關閉模態框
    const closeModal = () => {
      clockoutModal.classList.remove('active');
    };

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);

    // 模態框確認下班
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', () => {
        const empId = modalEmpId.value;
        const noteText = clockoutNote.value.trim();

        if (!empId) return;

        const savedShift = Store.stopClockOut(empId, noteText);
        if (savedShift) {
          closeModal();
          alert(`員工「${savedShift.employeeName}」下班成功！\n實際工時：${savedShift.totalHours.toFixed(2)} 小時\n應付工資：${Utils.formatCurrency(savedShift.earnings)}`);
          
          // 如果身分是員工，結算完後自動登出以策安全，若是管理員則重導回歷史頁
          const session = Store.getSession();
          if (session.role === 'employee') {
            Store.clearSession();
            window.AppRouter.navigate('login');
          } else {
            window.AppRouter.navigate('history');
          }
        }
      });
    }

    // 更新計時器
    const updateActiveTimers = () => {
      const activeShifts = Store.getActiveShifts();
      const now = Date.now();

      Object.keys(activeShifts).forEach(empId => {
        const shift = activeShifts[empId];
        
        const timerEl = document.getElementById(`timer-${empId}`);
        const earningsEl = document.getElementById(`earnings-${empId}`);
        const progressEl = document.getElementById(`progress-bar-${empId}`);
        const progressTextEl = document.getElementById(`progress-text-${empId}`);

        if (!timerEl || !earningsEl || !progressEl || !progressTextEl) return;

        let currentBreakDuration = shift.totalBreakDuration;
        if (shift.status === 'on_break' && shift.breakStartTime) {
          currentBreakDuration += (now - shift.breakStartTime);
        }

        const totalDurationMs = now - shift.startTime - currentBreakDuration;
        const totalSeconds = Math.floor(totalDurationMs / 1000);
        const totalMinutes = totalDurationMs / 60000;

        timerEl.textContent = Utils.formatDuration(totalDurationMs);
        const currentEarnings = Math.floor(totalMinutes / 15) * 50;
        earningsEl.textContent = Utils.formatCurrency(currentEarnings, 0);

        const currentCycleMins = Math.floor(totalMinutes) % 15;
        const currentCycleSecs = totalSeconds % 60;
        
        const elapsedCycleSeconds = currentCycleMins * 60 + currentCycleSecs;
        const progressPercent = Math.min(100, (elapsedCycleSeconds / 900) * 100);

        progressEl.style.width = `${progressPercent}%`;
        progressTextEl.textContent = `已累積 ${currentCycleMins} 分 ${currentCycleSecs} 秒 / 15 分`;
      });
    };

    const activeShifts = Store.getActiveShifts();
    if (Object.keys(activeShifts).length > 0) {
      updateActiveTimers();
      this.timerInterval = setInterval(updateActiveTimers, 100);
    }
  }
};
