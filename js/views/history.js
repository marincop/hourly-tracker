import { Store } from '../store.js';
import { Utils } from '../utils.js';

export const HistoryView = {
  render() {
    const shifts = Store.getShifts();
    const employees = Store.getEmployees();

    // 渲染打卡記錄表格行
    const tableRowsHtml = shifts.length === 0
      ? `<tr>
           <td colspan="8" class="empty-state">
             <i data-lucide="history" class="empty-icon" style="width: 48px; height: 48px; margin: 0 auto 1rem;"></i>
             <p>目前沒有任何打卡記錄</p>
           </td>
         </tr>`
      : shifts.map(shift => {
          const dateStr = Utils.formatDate(shift.startTime, 'YYYY-MM-DD');
          const timeRange = `${Utils.formatDate(shift.startTime, 'HH:mm')} - ${Utils.formatDate(shift.endTime, 'HH:mm')}`;
          
          return `
            <tr>
              <td>
                <span style="font-weight: 600;">${dateStr}</span>
              </td>
              <td>
                <span class="job-badge-pill" style="background-color: ${shift.employeeColor || '#E8DFF5'};">
                  <span class="job-color-dot" style="--dot-color: ${shift.employeeColor || '#2D3142'};"></span>
                  ${shift.employeeName}
                </span>
              </td>
              <td>${timeRange}</td>
              <td>${Utils.formatMinutesText(shift.breakDuration)}</td>
              <td>
                <span style="font-weight: 700;">${shift.totalHours.toFixed(2)} 小時</span>
              </td>
              <td>
                <span style="font-weight: 700; color: #6bb07b;">${Utils.formatCurrency(shift.earnings, 0)}</span>
              </td>
              <td>
                <span style="font-size: 0.85rem; color: var(--text-muted); max-width: 150px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${shift.note || ''}">
                  ${shift.note || '-'}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-icon edit-shift-btn" data-id="${shift.id}" title="編輯">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                  </button>
                  <button class="btn-icon delete-shift-btn" data-id="${shift.id}" title="刪除">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    return `
      <div class="view-header">
        <div>
          <h2 class="view-title">打卡記錄與歷史</h2>
          <p class="view-subtitle">查看、編輯與匯出您的員工打卡班次歷史</p>
        </div>
        <div style="display: flex; gap: 0.8rem;">
          <button id="add-shift-btn" class="btn btn-secondary btn-sm">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
            補記班次
          </button>
          <button id="export-csv-btn" class="btn btn-primary btn-sm">
            <i data-lucide="download" style="width: 16px; height: 16px;"></i>
            匯出報表 (CSV)
          </button>
        </div>
      </div>

      <div class="glass-card" style="margin-bottom: 2rem; padding: 1.5rem;">
        <div class="history-controls">
          <!-- 頁籤切換：清單 vs 日曆 -->
          <div class="tabs-container">
            <button class="tab-btn active" onclick="window.AppRouter.navigate('history')">
              <i data-lucide="list" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
              班次列表
            </button>
            <button class="tab-btn" onclick="window.AppRouter.navigate('calendar')">
              <i data-lucide="calendar" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
              日曆檢視
            </button>
          </div>
          <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">
            共 ${shifts.length} 筆打卡記錄
          </span>
        </div>

        <div class="table-container">
          <table class="history-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>員工姓名</th>
                <th>上班時間段</th>
                <th>休息時間</th>
                <th>實際工時</th>
                <th>結算薪資</th>
                <th>備註</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 補記/編輯班次模態框 -->
      <div id="shift-modal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title" id="shift-modal-title">補登員工班次</h3>
            <span class="modal-close" id="shift-modal-close">&times;</span>
          </div>
          <form id="shift-form">
            <div class="modal-body">
              <input type="hidden" id="edit-shift-id" value="">
              
              <div class="form-group">
                <label class="form-label" for="shift-emp-id">選擇員工</label>
                <div class="job-select-wrapper">
                  <select id="shift-emp-id" class="job-select" required style="text-align: left; padding-left: 1rem;">
                    ${employees.map(emp => `<option value="${emp.id}">${emp.name} (${emp.role})</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="shift-date">工作日期</label>
                <input type="date" id="shift-date" class="form-input" required>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="shift-start-time">上班時間</label>
                  <input type="time" id="shift-start-time" class="form-input" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="shift-end-time">下班時間</label>
                  <input type="time" id="shift-end-time" class="form-input" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="shift-break">扣除休息時間 (分鐘)</label>
                <input type="number" id="shift-break" class="form-input" placeholder="例如: 30" min="0" value="0" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="shift-note">班次備註 (選填)</label>
                <textarea id="shift-note" class="form-input" rows="3" placeholder="例如: 手動補登、公假..." style="resize: none;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" id="shift-modal-cancel" class="btn btn-secondary">取消</button>
              <button type="submit" class="btn btn-primary">儲存班次</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    const addShiftBtn = document.getElementById('add-shift-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    // 模態框與表單 DOM
    const shiftModal = document.getElementById('shift-modal');
    const shiftForm = document.getElementById('shift-form');
    const shiftModalTitle = document.getElementById('shift-modal-title');
    const shiftModalClose = document.getElementById('shift-modal-close');
    const shiftModalCancel = document.getElementById('shift-modal-cancel');
    const editShiftId = document.getElementById('edit-shift-id');
    const shiftEmpId = document.getElementById('shift-emp-id');
    const shiftDate = document.getElementById('shift-date');
    const shiftStartTime = document.getElementById('shift-start-time');
    const shiftEndTime = document.getElementById('shift-end-time');
    const shiftBreak = document.getElementById('shift-break');
    const shiftNote = document.getElementById('shift-note');

    // 匯出 CSV 檔事件
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        const shifts = Store.getShifts();
        Utils.exportToCSV(shifts, `員工打卡報表_${Utils.formatDate(new Date(), 'YYYYMMDD')}.csv`);
      });
    }

    // 開啟模態框 (新增模式)
    if (addShiftBtn) {
      addShiftBtn.addEventListener('click', () => {
        const employees = Store.getEmployees();
        if (employees.length === 0) {
          alert('請先到「員工資料管理」頁面新增員工！');
          return;
        }
        
        // 重設表單
        shiftForm.reset();
        editShiftId.value = '';
        shiftModalTitle.textContent = '補登員工班次';
        
        // 預設今天日期
        shiftDate.value = Utils.formatDate(new Date(), 'YYYY-MM-DD');
        shiftBreak.value = '0';

        shiftModal.classList.add('active');
      });
    }

    // 關閉模態框
    const closeModal = () => {
      shiftModal.classList.remove('active');
    };

    if (shiftModalClose) shiftModalClose.addEventListener('click', closeModal);
    if (shiftModalCancel) shiftModalCancel.addEventListener('click', closeModal);

    // 表單送出 (新增或編輯)
    shiftForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const empId = shiftEmpId.value;
      const emp = Store.getEmployees().find(e => e.id === empId);
      if (!emp) return;

      const dateVal = shiftDate.value;
      const startVal = shiftStartTime.value;
      const endVal = shiftEndTime.value;
      const breakMins = parseInt(shiftBreak.value) || 0;

      // 組合日期與時間
      const startDateTime = new Date(`${dateVal}T${startVal}:00`);
      const endDateTime = new Date(`${dateVal}T${endVal}:00`);

      if (endDateTime <= startDateTime) {
        alert('下班時間必須晚於上班時間！');
        return;
      }

      // 計算總實際工時分鐘
      const durationMs = endDateTime.getTime() - startDateTime.getTime() - (breakMins * 60 * 1000);
      const totalMins = Math.max(0, durationMs / 60000);
      
      // 15分鐘計薪規則 ($50/15min)
      const earnings = Math.floor(totalMins / 15) * 50;
      const totalHours = totalMins / 60;

      const shiftData = {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeColor: emp.color,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        breakDuration: breakMins,
        totalHours: parseFloat(totalHours.toFixed(4)),
        earnings: parseFloat(earnings.toFixed(2)),
        note: shiftNote.value.trim()
      };

      const id = editShiftId.value;
      if (id) {
        Store.updateShift(id, shiftData);
        alert('打卡記錄修改成功！');
      } else {
        Store.addShift(shiftData);
        alert('班次補登成功！');
      }

      closeModal();
      window.AppRouter.navigate('history');
    });

    // 點擊編輯記錄
    const editBtns = document.querySelectorAll('.edit-shift-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const shift = Store.getShifts().find(s => s.id === id);
        
        if (shift) {
          shiftModalTitle.textContent = '修改打卡記錄';
          editShiftId.value = shift.id;
          shiftEmpId.value = shift.employeeId;
          
          const startDateObj = new Date(shift.startTime);
          const endDateObj = new Date(shift.endTime);

          shiftDate.value = Utils.formatDate(startDateObj, 'YYYY-MM-DD');
          shiftStartTime.value = Utils.formatDate(startDateObj, 'HH:mm');
          shiftEndTime.value = Utils.formatDate(endDateObj, 'HH:mm');
          shiftBreak.value = shift.breakDuration;
          shiftNote.value = shift.note || '';

          shiftModal.classList.add('active');
        }
      });
    });

    // 點擊刪除記錄
    const deleteBtns = document.querySelectorAll('.delete-shift-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const shift = Store.getShifts().find(s => s.id === id);

        if (shift) {
          const confirmDelete = confirm(`確定要刪除員工「${shift.employeeName}」這筆在 ${Utils.formatDate(shift.startTime, 'YYYY-MM-DD')} 的打卡記錄嗎？`);
          if (confirmDelete) {
            Store.deleteShift(id);
            window.AppRouter.navigate('history');
          }
        }
      });
    });

    // 檢查是否有來自日曆頁面的快速補登請求
    if (sessionStorage.getItem('auto_open_add_shift') === 'true') {
      sessionStorage.removeItem('auto_open_add_shift');
      if (addShiftBtn) addShiftBtn.click();
    }

    // 檢查是否有快速編輯請求
    const autoEditId = sessionStorage.getItem('auto_edit_shift_id');
    if (autoEditId) {
      sessionStorage.removeItem('auto_edit_shift_id');
      const editBtn = document.querySelector(`.edit-shift-btn[data-id="${autoEditId}"]`);
      if (editBtn) editBtn.click();
    }
  }
};
