import { Store } from '../store.js';
import { Utils } from '../utils.js';

export const CalendarView = {
  currentDate: new Date(),

  render() {
    const shifts = Store.getShifts();
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth(); // 0-11

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

    // 建立日曆表格骨架
    const calendarHeaderHtml = `
      <div class="calendar-header">
        <button id="prev-month-btn" class="btn btn-secondary btn-sm" style="padding: 0.4rem 0.8rem;">
          <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
        </button>
        <h3 style="font-weight: 700; font-size: 1.25rem; min-width: 120px; text-align: center;">
          ${year} 年 ${monthNames[month]}
        </h3>
        <button id="next-month-btn" class="btn btn-secondary btn-sm" style="padding: 0.4rem 0.8rem;">
          <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
        </button>
      </div>
    `;

    // 日曆網格計算
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=週日
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let cellsHtml = '';

    // 1. 填補上個月的格子
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      cellsHtml += `
        <div class="calendar-cell other-month">
          <span class="calendar-day-num">${prevDay}</span>
          <div class="calendar-cell-events"></div>
        </div>
      `;
    }

    // 2. 當月格子
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

      // 篩選出這一天的所有班次
      const dayShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.startTime);
        return shiftDate.getFullYear() === year && 
               shiftDate.getMonth() === month && 
               shiftDate.getDate() === day;
      });

      // 渲染班次標籤
      const eventsHtml = dayShifts.map(shift => {
        return `
          <div class="calendar-event-tag" 
               style="background-color: ${shift.employeeColor || '#E8DFF5'}bb; --tag-border-color: ${shift.employeeColor || '#2D3142'};"
               data-id="${shift.id}" 
               title="${shift.employeeName}: ${shift.totalHours.toFixed(2)} 小時 | $${shift.earnings}">
            ${shift.employeeName} (${shift.totalHours.toFixed(1)}h)
          </div>
        `;
      }).join('');

      cellsHtml += `
        <div class="calendar-cell ${isToday ? 'today' : ''}" data-date="${cellDateStr}">
          <span class="calendar-day-num">${day}</span>
          <div class="calendar-cell-events">
            ${eventsHtml}
          </div>
        </div>
      `;
    }

    // 3. 填補下個月的格子
    const totalCellsSoFar = firstDayIndex + daysInMonth;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      cellsHtml += `
        <div class="calendar-cell other-month">
          <span class="calendar-day-num">${day}</span>
          <div class="calendar-cell-events"></div>
        </div>
      `;
    }

    return `
      <div class="view-header">
        <div>
          <h2 class="view-title">打卡記錄與歷史</h2>
          <p class="view-subtitle">在日曆上直觀檢視每位員工的排班分佈</p>
        </div>
        <div style="display: flex; gap: 0.8rem;">
          <button id="calendar-add-btn" class="btn btn-secondary btn-sm">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            補記班次
          </button>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem;">
        <div class="history-controls" style="margin-bottom: 1.5rem;">
          <div class="tabs-container">
            <button class="tab-btn" onclick="window.AppRouter.navigate('history')">
              <i data-lucide="list" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
              班次列表
            </button>
            <button class="tab-btn active" onclick="window.AppRouter.navigate('calendar')">
              <i data-lucide="calendar" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
              日曆檢視
            </button>
          </div>
        </div>

        <div class="calendar-view-container">
          <!-- 月份切換標頭 -->
          ${calendarHeaderHtml}

          <!-- 星期標頭 -->
          <div class="calendar-grid">
            <div class="calendar-day-header">日</div>
            <div class="calendar-day-header">一</div>
            <div class="calendar-day-header">二</div>
            <div class="calendar-day-header">三</div>
            <div class="calendar-day-header">四</div>
            <div class="calendar-day-header">五</div>
            <div class="calendar-day-header">六</div>
          </div>

          <!-- 日曆網格內容 -->
          <div class="calendar-grid" id="calendar-grid-cells">
            ${cellsHtml}
          </div>
        </div>
      </div>

      <!-- 日曆詳情模態框 -->
      <div id="day-detail-modal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title" id="day-detail-title">2026-06-14 班次明細</h3>
            <span class="modal-close" id="day-modal-close">&times;</span>
          </div>
          <div class="modal-body" id="day-detail-body">
            <!-- 動態填入該日班次 -->
          </div>
          <div class="modal-footer">
            <button id="day-modal-close-btn" class="btn btn-secondary">關閉</button>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const calendarAddBtn = document.getElementById('calendar-add-btn');

    // 詳情模態框
    const dayDetailModal = document.getElementById('day-detail-modal');
    const dayDetailTitle = document.getElementById('day-detail-title');
    const dayDetailBody = document.getElementById('day-detail-body');
    const dayModalClose = document.getElementById('day-modal-close');
    const dayModalCloseBtn = document.getElementById('day-modal-close-btn');

    // 上個月
    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        window.AppRouter.navigate('calendar');
      });
    }

    // 下個月
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        window.AppRouter.navigate('calendar');
      });
    }

    // 補記班次
    if (calendarAddBtn) {
      calendarAddBtn.addEventListener('click', () => {
        sessionStorage.setItem('auto_open_add_shift', 'true');
        window.AppRouter.navigate('history');
      });
    }

    // 點擊事件標籤 -> 編輯
    const eventTags = document.querySelectorAll('.calendar-event-tag');
    eventTags.forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const shiftId = tag.getAttribute('data-id');
        sessionStorage.setItem('auto_edit_shift_id', shiftId);
        window.AppRouter.navigate('history');
      });
    });

    // 點擊日曆格子 -> 顯示明細
    const cells = document.querySelectorAll('.calendar-cell:not(.other-month)');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        const cellDate = new Date(dateStr);
        const year = cellDate.getFullYear();
        const month = cellDate.getMonth();
        const day = cellDate.getDate();

        const dayShifts = Store.getShifts().filter(shift => {
          const shiftDate = new Date(shift.startTime);
          return shiftDate.getFullYear() === year && 
                 shiftDate.getMonth() === month && 
                 shiftDate.getDate() === day;
        });

        if (dayShifts.length === 0) return;

        dayDetailTitle.textContent = `${dateStr} 員工出勤明細`;
        
        let shiftsHtml = dayShifts.map(shift => `
          <div style="background: #ffffff; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); border-left: 5px solid ${shift.employeeColor || '#E8DFF5'}; margin-bottom: 1.2rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="font-weight: 700; font-size: 1.1rem;">${shift.employeeName}</h4>
              <span class="job-badge-pill" style="background-color: ${shift.employeeColor || '#E8DFF5'}55; font-size: 0.8rem;">
                薪資計算：15分/50元
              </span>
            </div>
            <p style="font-size: 0.9rem; margin-bottom: 0.3rem;">
              <b>工作時段:</b> ${Utils.formatDate(shift.startTime, 'HH:mm')} - ${Utils.formatDate(shift.endTime, 'HH:mm')}
              ${shift.breakDuration > 0 ? ` (休息 ${shift.breakDuration} 分鐘)` : ''}
            </p>
            <p style="font-size: 0.9rem; margin-bottom: 0.3rem;">
              <b>實得工時:</b> ${shift.totalHours.toFixed(2)} 小時 (約 ${Math.round(shift.totalHours * 60)} 分鐘)
            </p>
            <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">
              <b>結算工資:</b> <span style="font-weight: 700; color: #5aa16b; font-size: 1.05rem;">${Utils.formatCurrency(shift.earnings, 0)}</span>
            </p>
            ${shift.note ? `<p style="font-size: 0.85rem; color: var(--text-muted); background: var(--bg-app); padding: 0.5rem; border-radius: var(--radius-sm);"><b>備註:</b> ${shift.note}</p>` : ''}
            
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.8rem; border-top: 1px dashed var(--border-light); padding-top: 0.6rem;">
              <button class="btn btn-secondary btn-sm quick-edit-btn" data-id="${shift.id}" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">編輯</button>
            </div>
          </div>
        `).join('');

        dayDetailBody.innerHTML = shiftsHtml;
        dayDetailModal.classList.add('active');

        // 綁定編輯
        const quickEditBtns = dayDetailBody.querySelectorAll('.quick-edit-btn');
        quickEditBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const shiftId = btn.getAttribute('data-id');
            dayDetailModal.classList.remove('active');
            sessionStorage.setItem('auto_edit_shift_id', shiftId);
            window.AppRouter.navigate('history');
          });
        });
      });
    });

    const closeDayModal = () => {
      dayDetailModal.classList.remove('active');
    };

    if (dayModalClose) dayModalClose.addEventListener('click', closeDayModal);
    if (dayModalCloseBtn) dayModalCloseBtn.addEventListener('click', closeDayModal);
  }
};
