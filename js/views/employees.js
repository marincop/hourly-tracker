import { Store, MACARON_COLORS } from '../store.js?v=1.0.3';

export const EmployeesView = {
  render() {
    const employees = Store.getEmployees();

    // 渲染員工卡片列表
    const employeesListHtml = employees.length === 0 
      ? `<div class="empty-state">
           <i data-lucide="users" class="empty-icon" style="width: 48px; height: 48px; margin: 0 auto 1rem;"></i>
           <p>目前沒有設定任何員工，請在右側新增！</p>
         </div>`
      : employees.map(emp => `
          <div class="glass-card job-setup-card" style="--job-color: ${emp.color}; margin-bottom: 1.2rem;">
            <div class="job-card-meta">
              <span class="job-card-name" style="display: flex; align-items: center; gap: 0.5rem;">
                ${emp.name}
                <span style="font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.05); padding: 0.2rem 0.6rem; border-radius: 99px;">
                  ${emp.role}
                </span>
              </span>
              <span class="job-card-wage" style="font-size: 0.85rem; color: var(--text-muted);">
                <i data-lucide="phone" style="width: 14px; height: 14px; display: inline; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
                ${emp.phone || '未填寫電話'}
              </span>
            </div>
            <div class="job-card-actions">
              <button class="btn-icon edit-emp-btn" data-id="${emp.id}" title="編輯資料">
                <i data-lucide="edit-3" style="width: 18px; height: 18px;"></i>
              </button>
              <button class="btn-icon delete-emp-btn" data-id="${emp.id}" title="刪除員工">
                <i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>
              </button>
            </div>
          </div>
        `).join('');

    // 渲染馬卡龍代表色選擇器
    const colorPickerHtml = MACARON_COLORS.map((color, index) => `
      <div 
        class="color-option ${index === 0 ? 'selected' : ''}" 
        style="background-color: ${color.value};" 
        data-color="${color.value}"
        title="${color.name}">
      </div>
    `).join('');

    return `
      <div class="view-header">
        <div>
          <h2 class="view-title">員工資料管理</h2>
          <p class="view-subtitle">新增、修改或刪除您的員工檔案，並指派代表色彩</p>
        </div>
      </div>

      <div class="jobs-layout">
        <!-- 左側：員工列表 -->
        <div class="jobs-list-container">
          <h3 style="margin-bottom: 1rem; font-weight: 600;">在職員工列表 (${employees.length})</h3>
          <div class="job-cards-list">
            ${employeesListHtml}
          </div>
        </div>

        <!-- 右側：新增/編輯員工表單與管理者密碼變更 -->
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <!-- 員工表單 -->
          <div class="glass-card job-form-card">
            <h3 id="form-title" style="margin-bottom: 1.5rem; font-weight: 700;">新增員工檔案</h3>
            <form id="emp-setup-form">
              <input type="hidden" id="edit-emp-id" value="">
              
              <div class="form-group">
                <label class="form-label" for="emp-name">員工姓名</label>
                <input type="text" id="emp-name" class="form-input" placeholder="例如：張小明" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="emp-phone">聯絡電話</label>
                <input type="tel" id="emp-phone" class="form-input" placeholder="例如：0912-345-678">
              </div>

              <div class="form-group">
                <label class="form-label" for="emp-role">職位或部門</label>
                <input type="text" id="emp-role" class="form-input" placeholder="例如：計時人員、廚房助理、收銀員" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="emp-pin">打卡安全 PIN 碼 (4 位數字)</label>
                <input type="text" id="emp-pin" class="form-input" placeholder="例如：1234 (預設)" pattern="[0-9]{4}" title="請輸入4位數字" maxlength="4">
              </div>

              <div class="form-group">
                <label class="form-label">指派代表色 (馬卡龍色彩)</label>
                <div class="color-picker-grid">
                  ${colorPickerHtml}
                </div>
              </div>

              <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button type="submit" id="save-emp-btn" class="btn btn-primary" style="flex-grow: 1;">
                  <i data-lucide="check" style="width: 18px; height: 18px;"></i>
                  <span>確認儲存</span>
                </button>
                <button type="button" id="cancel-edit-btn" class="btn btn-secondary" style="display: none;">
                  取消編輯
                </button>
              </div>
            </form>
          </div>

          <!-- 修改管理密碼卡片 -->
          <div class="glass-card" style="padding: 1.8rem 1.5rem;">
            <h3 style="margin-bottom: 1.2rem; font-weight: 700; color: #a83c3c; display: flex; align-items: center; gap: 0.5rem; font-size: 1.15rem;">
              <i data-lucide="key-round" style="width: 20px; height: 20px;"></i>
              修改管理者控制台密碼
            </h3>
            <form id="change-admin-pwd-form">
              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" for="current-admin-pwd">目前管理者密碼</label>
                <input type="password" id="current-admin-pwd" class="form-input" placeholder="請輸入目前密碼" required style="letter-spacing: 2px;">
              </div>
              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" for="new-admin-pwd">設定新管理者密碼</label>
                <input type="password" id="new-admin-pwd" class="form-input" placeholder="請輸入新密碼" required style="letter-spacing: 2px;">
              </div>
              <div class="form-group" style="margin-bottom: 1.5rem;">
                <label class="form-label" for="confirm-admin-pwd">確認新密碼</label>
                <input type="password" id="confirm-admin-pwd" class="form-input" placeholder="再次確認新密碼" required style="letter-spacing: 2px;">
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; background: linear-gradient(135deg, var(--macaron-pink), #ffb3c1); font-weight: 700; color: #5c1818;">
                <i data-lucide="check-circle" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.2rem;"></i>
                確認變更密碼
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    const form = document.getElementById('emp-setup-form');
    const empNameInput = document.getElementById('emp-name');
    const empPhoneInput = document.getElementById('emp-phone');
    const empRoleInput = document.getElementById('emp-role');
    const empPinInput = document.getElementById('emp-pin');
    const editEmpIdInput = document.getElementById('edit-emp-id');
    const formTitle = document.getElementById('form-title');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveEmpBtnSpan = document.querySelector('#save-emp-btn span');

    let selectedColor = MACARON_COLORS[0].value;

    // 顏色選取事件
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedColor = opt.getAttribute('data-color');
      });
    });

    // 表單提交處理 (新增或編輯)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const empData = {
        name: empNameInput.value.trim(),
        phone: empPhoneInput.value.trim(),
        role: empRoleInput.value.trim(),
        color: selectedColor,
        pin: empPinInput.value.trim() || '1234' // 預設 1234
      };

      const editId = editEmpIdInput.value;
      try {
        if (editId) {
          await Store.updateEmployee(editId, empData);
          alert('員工資料更新成功！');
        } else {
          await Store.addEmployee(empData);
          alert('成功新增員工！');
        }
        window.AppRouter.navigate('jobs'); // 跳回管理頁面重新載入
      } catch (err) {
        console.error('儲存員工失敗:', err);
        alert(`儲存失敗！請檢查您的 Supabase 資料表是否已執行升級指令 (例如新增 pin 欄位)。\n\n錯誤訊息：${err.message || err.details || JSON.stringify(err)}`);
      }
    });

    // 編輯員工事件
    const editBtns = document.querySelectorAll('.edit-emp-btn');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        const employees = Store.getEmployees();
        const emp = employees.find(e => e.id === empId);

        if (emp) {
          formTitle.textContent = `編輯員工：${emp.name}`;
          editEmpIdInput.value = emp.id;
          empNameInput.value = emp.name;
          empPhoneInput.value = emp.phone || '';
          empRoleInput.value = emp.role;
          empPinInput.value = emp.pin || '1234';
          selectedColor = emp.color;

          // 更新顏色格狀態
          colorOptions.forEach(opt => {
            if (opt.getAttribute('data-color') === emp.color) {
              opt.classList.add('selected');
            } else {
              opt.classList.remove('selected');
            }
          });

          saveEmpBtnSpan.textContent = '更新檔案';
          cancelEditBtn.style.display = 'block';
        }
      });
    });

    // 取消編輯
    cancelEditBtn.addEventListener('click', () => {
      form.reset();
      editEmpIdInput.value = '';
      empPinInput.value = ''; // 清除 PIN 欄位
      formTitle.textContent = '新增員工檔案';
      saveEmpBtnSpan.textContent = '確認儲存';
      cancelEditBtn.style.display = 'none';
      colorOptions.forEach((o, i) => {
        if (i === 0) o.classList.add('selected');
        else o.classList.remove('selected');
      });
      selectedColor = MACARON_COLORS[0].value;
    });

    // 刪除員工事件
    const deleteBtns = document.querySelectorAll('.delete-emp-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const empId = btn.getAttribute('data-id');
        const employees = Store.getEmployees();
        const emp = employees.find(e => e.id === empId);

        if (emp) {
          const confirmDelete = confirm(`確定要刪除員工「${emp.name}」嗎？\n這將移除其目前的打卡計時狀態，但其歷史打卡記錄將被保留以供薪資核對。`);
          if (confirmDelete) {
            try {
              await Store.deleteEmployee(empId);
              alert('已成功刪除員工！');
              window.AppRouter.navigate('jobs');
            } catch (err) {
              console.error('刪除員工失敗:', err);
              alert(`刪除失敗！錯誤訊息：${err.message || err.details || JSON.stringify(err)}`);
            }
          }
        }
      });
    });

    // 管理者密碼變更表單提交處理
    const changePwdForm = document.getElementById('change-admin-pwd-form');
    if (changePwdForm) {
      changePwdForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPwd = document.getElementById('current-admin-pwd').value;
        const newPwd = document.getElementById('new-admin-pwd').value;
        const confirmPwd = document.getElementById('confirm-admin-pwd').value;

        const correctPwd = Store.getManagerPassword();
        if (currentPwd !== correctPwd) {
          alert('舊管理密碼輸入錯誤，請再試一次！');
          return;
        }

        if (newPwd.length < 4) {
          alert('新管理密碼長度不能小於 4 個字元！');
          return;
        }

        if (newPwd !== confirmPwd) {
          alert('新管理密碼與確認新密碼不相同，請重新輸入！');
          return;
        }

        Store.setManagerPassword(newPwd);
        alert('管理者密碼已成功變更！新密碼已即時生效。');
        changePwdForm.reset();
      });
    }
  }
};
