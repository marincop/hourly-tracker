import { Store } from '../store.js';

export const LoginView = {
  enteredPin: '',
  activeEmpId: '',

  render() {
    const employees = Store.getEmployees();

    // 渲染員工選單
    const employeeOptionsHtml = employees.map(emp => `
      <option value="${emp.id}">${emp.name} (${emp.role})</option>
    `).join('');

    return `
      <div class="login-view-wrapper">
        <div class="login-grid">
          
          <!-- 左側：員工打卡入口 -->
          <div class="glass-card login-portal-card" style="--job-color: var(--macaron-blue);">
            <div>
              <h3 class="login-portal-title" style="color: #1e40af;">
                <i data-lucide="users" style="width: 24px; height: 24px;"></i>
                員工打卡通道
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">選擇您的姓名，輸入 PIN 碼完成登入打卡</p>
              
              <div class="form-group">
                <label class="form-label" for="login-emp-select">選擇您的名字</label>
                <div class="job-select-wrapper">
                  <select id="login-emp-select" class="job-select" style="text-align: left; padding-left: 1rem;">
                    <option value="" disabled selected>請選擇姓名...</option>
                    ${employeeOptionsHtml}
                  </select>
                </div>
              </div>

              <!-- PIN 密碼顯示點與小鍵盤 -->
              <div id="pin-area" class="pin-display-wrapper" style="display: none; margin-top: 1.5rem;">
                <span class="form-label">請輸入 4 位數 PIN 碼</span>
                <div class="pin-dots-container">
                  <div class="pin-dot" id="dot-1"></div>
                  <div class="pin-dot" id="dot-2"></div>
                  <div class="pin-dot" id="dot-3"></div>
                  <div class="pin-dot" id="dot-4"></div>
                </div>

                <!-- 數字鍵盤 -->
                <div class="pin-keyboard">
                  <button class="keypad-btn" data-val="1">1</button>
                  <button class="keypad-btn" data-val="2">2</button>
                  <button class="keypad-btn" data-val="3">3</button>
                  <button class="keypad-btn" data-val="4">4</button>
                  <button class="keypad-btn" data-val="5">5</button>
                  <button class="keypad-btn" data-val="6">6</button>
                  <button class="keypad-btn" data-val="7">7</button>
                  <button class="keypad-btn" data-val="8">8</button>
                  <button class="keypad-btn" data-val="9">9</button>
                  <button class="keypad-btn action-btn" data-val="clear">清除</button>
                  <button class="keypad-btn" data-val="0">0</button>
                  <button class="keypad-btn action-btn" data-val="back">退格</button>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 1.5rem;">
              * 密碼預設值通常為 1234
            </div>
          </div>

          <!-- 右側：管理者控制台入口 -->
          <div class="glass-card login-portal-card" style="--job-color: var(--macaron-pink);">
            <div>
              <h3 class="login-portal-title" style="color: #a83c3c;">
                <i data-lucide="settings" style="width: 24px; height: 24px;"></i>
                管理者控制台
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 2rem;">進入後台檢視數據統計與進行員工管理設定</p>
              
              <form id="admin-login-form" style="margin-top: 2rem;">
                <div class="form-group">
                  <label class="form-label" for="admin-password">請輸入管理密碼</label>
                  <input type="password" id="admin-password" class="form-input" placeholder="預設密碼為 admin" required style="letter-spacing: 2px;">
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 2rem; background: linear-gradient(135deg, var(--macaron-pink), #ffb3c1);">
                  <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
                  驗證並進入後台
                </button>
              </form>
            </div>
            
            <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted);">
              資料安全儲存於本地與 Supabase 雲端
            </div>
          </div>

        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    this.enteredPin = '';
    this.activeEmpId = '';

    const empSelect = document.getElementById('login-emp-select');
    const pinArea = document.getElementById('pin-area');
    const adminForm = document.getElementById('admin-login-form');
    const adminPasswordInput = document.getElementById('admin-password');

    // 當選擇員工時顯示密碼鍵盤
    if (empSelect) {
      empSelect.addEventListener('change', () => {
        this.activeEmpId = empSelect.value;
        this.enteredPin = '';
        this.updatePinDots();
        
        const emp = Store.getEmployees().find(e => e.id === this.activeEmpId);
        if (emp) {
          // 如果員工有設定密碼，開啟輸入框
          pinArea.style.display = 'block';
        } else {
          // 若無密碼，直接登入
          this.loginAsEmployee(this.activeEmpId);
        }
      });
    }

    // 綁定數字小鍵盤按鈕事件
    const keys = document.querySelectorAll('.keypad-btn');
    keys.forEach(key => {
      key.addEventListener('click', () => {
        const val = key.getAttribute('data-val');
        this.handlePinInput(val);
      });
    });

    // 綁定實體鍵盤事件 (方便電腦輸入)
    const handlePhysicalKey = (e) => {
      if (document.activeElement === adminPasswordInput) return; // 避開管理者輸入框
      
      if (pinArea.style.display === 'block') {
        if (e.key >= '0' && e.key <= '9') {
          this.handlePinInput(e.key);
        } else if (e.key === 'Backspace') {
          this.handlePinInput('back');
        } else if (e.key === 'Escape') {
          this.handlePinInput('clear');
        }
      }
    };
    
    // 移除舊的監聽，綁定新的
    window.removeEventListener('keydown', window._loginKeydownHandler);
    window._loginKeydownHandler = handlePhysicalKey;
    window.addEventListener('keydown', window._loginKeydownHandler);

    // 管理者登入表單提交
    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputPwd = adminPasswordInput.value;
        const correctPwd = Store.getManagerPassword();

        if (inputPwd === correctPwd) {
          Store.setSession('admin');
          alert('管理者登入成功！');
          window.AppRouter.navigate('dashboard'); // 跳轉到儀表板
        } else {
          alert('管理密碼錯誤，請再試一次！');
          adminPasswordInput.value = '';
          adminPasswordInput.focus();
        }
      });
    }
  },

  handlePinInput(val) {
    if (val === 'clear') {
      this.enteredPin = '';
    } else if (val === 'back') {
      this.enteredPin = this.enteredPin.slice(0, -1);
    } else if (this.enteredPin.length < 4) {
      this.enteredPin += val;
    }

    this.updatePinDots();

    // 當輸入滿 4 位數時，立刻進行比對驗證
    if (this.enteredPin.length === 4) {
      const emp = Store.getEmployees().find(e => e.id === this.activeEmpId);
      if (emp) {
        // 比對密碼 (若員工未設定 PIN 則預設為 1234)
        const expectedPin = emp.pin || '1234';
        if (this.enteredPin === expectedPin) {
          this.loginAsEmployee(this.activeEmpId);
        } else {
          alert('密碼輸入錯誤，請再試一次！');
          this.enteredPin = '';
          this.updatePinDots();
        }
      }
    }
  },

  updatePinDots() {
    for (let i = 1; i <= 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        if (i <= this.enteredPin.length) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      }
    }
  },

  loginAsEmployee(empId) {
    Store.setSession('employee', empId);
    // 移除實體鍵盤監聽
    window.removeEventListener('keydown', window._loginKeydownHandler);
    window.location.hash = '#/clockin'; // 跳轉至打卡頁面
  }
};
