/**
 * LocalStorage / Local Server / Supabase 三軌快取儲存中心 (多員工版 - 含 PIN 驗證)
 */

// --- 雲端連線設定區 ---
const SUPABASE_URL = 'https://veoklrkrucgejbscmivy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DPg8x_cU4HENRis8v4GpYA_yw6FFmSl';

const STORAGE_KEYS = {
  EMPLOYEES: 'hourly_tracker_employees',
  SHIFTS: 'hourly_tracker_shifts',
  ACTIVE_SHIFTS: 'hourly_tracker_active_shifts'
};

// 預設馬卡龍色系
export const MACARON_COLORS = [
  { name: '薰衣草紫', value: '#E8DFF5' },
  { name: '薄荷綠', value: '#D6EAD8' },
  { name: '蜜桃粉', value: '#FAD2E1' },
  { name: '天空藍', value: '#BEE3DB' },
  { name: '黃油黃', value: '#FFF1C5' },
  { name: '櫻花粉', value: '#FFE5EC' },
  { name: '抹茶綠', value: '#E8F5E9' },
  { name: '杏仁橘', value: '#FFD8BE' }
];

// --- 狀態標記 ---
let storeMode = 'local_storage'; // 'local_storage' | 'local_server' | 'supabase'

// --- 初始化 Supabase 用戶端 ---
const isSupabaseConfigured = 
  SUPABASE_URL && 
  SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
  SUPABASE_ANON_KEY && 
  SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;
if (isSupabaseConfigured && window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    storeMode = 'supabase';
  } catch (err) {
    console.error('初始化 Supabase 用戶端失敗:', err);
  }
}

// --- 本地記憶體快取 ---
let employeesCache = [];
let shiftsCache = [];
let activeShiftsCache = {};

// 初始化同步載入 LocalStorage 快取
try {
  const localEmp = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  employeesCache = localEmp ? JSON.parse(localEmp) : [];
  
  const localShifts = localStorage.getItem(STORAGE_KEYS.SHIFTS);
  shiftsCache = localShifts ? JSON.parse(localShifts) : [];
  
  const localActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_SHIFTS);
  activeShiftsCache = localActive ? JSON.parse(localActive) : {};
} catch (e) {
  console.error('載入本地 localStorage 快取失敗:', e);
}

// 共通寫入本地儲存庫
function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employeesCache));
  localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shiftsCache));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_SHIFTS, JSON.stringify(activeShiftsCache));
}

// 向本地 Ruby API 伺服器保存完整數據庫
async function saveToLocalServer() {
  if (storeMode !== 'local_server') return;
  const db = {
    employees: employeesCache,
    shifts: shiftsCache,
    active_shifts: activeShiftsCache
  };
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    });
  } catch (err) {
    console.error('無法儲存資料至本地伺服器 API:', err);
  }
}

export const Store = {
  getMode() {
    return storeMode;
  },

  /**
   * 與 Supabase 雲端資料庫進行非同步資料同步
   */
  async syncFromCloud() {
    if (storeMode === 'supabase' && supabaseClient) {
      try {
        const [resEmp, resShifts, resActive] = await Promise.all([
          supabaseClient.from('employees').select('*'),
          supabaseClient.from('shifts').select('*'),
          supabaseClient.from('active_shifts').select('*')
        ]);

        if (resEmp.error) throw resEmp.error;
        if (resShifts.error) throw resShifts.error;
        if (resActive.error) throw resActive.error;

        // 快取讀入，並保留 pin 欄位
        employeesCache = resEmp.data.map(row => ({
          id: row.id, 
          name: row.name, 
          phone: row.phone || '', 
          role: row.role || '兼職', 
          color: row.color || '#E8DFF5',
          pin: row.pin || '' // 讀取安全 PIN 碼
        }));
        
        shiftsCache = resShifts.data.map(row => ({
          id: row.id, employeeId: row.employee_id, employeeName: row.employee_name, employeeColor: row.employee_color || '#E8DFF5',
          startTime: row.start_time, endTime: row.end_time, breakDuration: parseInt(row.break_duration) || 0,
          totalHours: parseFloat(row.total_hours) || 0, earnings: parseFloat(row.earnings) || 0, note: row.note || ''
        }));
        shiftsCache.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        activeShiftsCache = {};
        resActive.data.forEach(row => {
          activeShiftsCache[row.employee_id] = {
            employeeId: row.employee_id, employeeName: row.employee_name, employeeColor: row.employee_color || '#E8DFF5',
            startTime: parseInt(row.start_time), breakStartTime: row.break_start_time ? parseInt(row.break_start_time) : null,
            totalBreakDuration: parseInt(row.total_break_duration) || 0, status: row.status
          };
        });

        saveToLocalStorage();
        return true;
      } catch (err) {
        console.error('Supabase 同步失敗，將降級使用本地快取/伺服器:', err);
        storeMode = 'local_storage';
      }
    }

    // 嘗試與本地的 Ruby API 伺服器進行同步
    try {
      const response = await fetch('/api/data', { method: 'GET' });
      if (response.ok) {
        const db = await response.json();
        storeMode = 'local_server';
        
        employeesCache = db.employees || [];
        shiftsCache = db.shifts || [];
        activeShiftsCache = db.active_shifts || {};
        
        shiftsCache.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        saveToLocalStorage();
        return true;
      }
    } catch (err) {
      // 降級
    }

    storeMode = 'local_storage';
    if (employeesCache.length === 0) {
      employeesCache = [
        { id: 'emp-1', name: '陳小明', phone: '0912-345-678', role: '計時店員', color: '#E8DFF5', pin: '1234' },
        { id: 'emp-2', name: '林美玲', phone: '0928-111-222', role: '資深收銀', color: '#D6EAD8', pin: '5678' }
      ];
      saveToLocalStorage();
    }
    return false;
  },

  // --- 登入與 Session 狀態管理 ---
  setSession(role, userId = null) {
    sessionStorage.setItem('currentRole', role);
    if (userId) {
      sessionStorage.setItem('currentUserId', userId);
    } else {
      sessionStorage.removeItem('currentUserId');
    }
  },

  getSession() {
    return {
      role: sessionStorage.getItem('currentRole'),
      userId: sessionStorage.getItem('currentUserId')
    };
  },

  clearSession() {
    sessionStorage.removeItem('currentRole');
    sessionStorage.removeItem('currentUserId');
  },

  getManagerPassword() {
    return localStorage.getItem('manager_password') || 'admin';
  },

  setManagerPassword(newPwd) {
    localStorage.setItem('manager_password', newPwd);
  },

  // --- 員工資料管理 (Employees) ---
  getEmployees() {
    return employeesCache;
  },

  saveEmployees(employees) {
    employeesCache = employees;
    saveToLocalStorage();
    saveToLocalServer();
  },

  async addEmployee(emp) {
    const newEmp = {
      id: 'emp-' + Date.now(),
      name: emp.name || '無名員工',
      phone: emp.phone || '',
      role: emp.role || '兼職員工',
      color: emp.color || MACARON_COLORS[0].value,
      pin: emp.pin || '' // 4位數字密碼
    };
    
    employeesCache.push(newEmp);
    this.saveEmployees(employeesCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('employees').insert({
        id: newEmp.id, name: newEmp.name, phone: newEmp.phone, role: newEmp.role, color: newEmp.color, pin: newEmp.pin
      });
      if (error) {
        console.error('Supabase 新增員工失敗:', error);
        throw error;
      }
    }

    return newEmp;
  },

  async updateEmployee(id, updatedFields) {
    employeesCache = employeesCache.map(emp => {
      if (emp.id === id) return { ...emp, ...updatedFields };
      return emp;
    });
    
    shiftsCache = shiftsCache.map(shift => {
      if (shift.employeeId === id) {
        return { ...shift, employeeName: updatedFields.name || shift.employeeName, employeeColor: updatedFields.color || shift.employeeColor };
      }
      return shift;
    });

    if (activeShiftsCache[id]) {
      activeShiftsCache[id].employeeName = updatedFields.name || activeShiftsCache[id].employeeName;
      activeShiftsCache[id].employeeColor = updatedFields.color || activeShiftsCache[id].employeeColor;
    }

    saveToLocalStorage();
    saveToLocalServer();

    if (storeMode === 'supabase' && supabaseClient) {
      const [res1, res2, res3] = await Promise.all([
        supabaseClient.from('employees').update({
          name: updatedFields.name, phone: updatedFields.phone, role: updatedFields.role, color: updatedFields.color, pin: updatedFields.pin
        }).eq('id', id),
        supabaseClient.from('shifts').update({
          employee_name: updatedFields.name, employee_color: updatedFields.color
        }).eq('employee_id', id),
        supabaseClient.from('active_shifts').update({
          employee_name: updatedFields.name, employee_color: updatedFields.color
        }).eq('employee_id', id)
      ]);

      if (res1.error) { console.error('Supabase 更新員工失敗:', res1.error); throw res1.error; }
      if (res2.error) console.error('Supabase 歷史關聯同步失敗:', res2.error);
      if (res3.error) console.error('Supabase 在線狀態關聯同步失敗:', res3.error);
    }
  },

  async deleteEmployee(id) {
    employeesCache = employeesCache.filter(emp => emp.id !== id);
    if (activeShiftsCache[id]) delete activeShiftsCache[id];

    saveToLocalStorage();
    saveToLocalServer();

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('employees').delete().eq('id', id);
      if (error) {
        console.error('Supabase 刪除員工失敗:', error);
        throw error;
      }
    }
  },

  // --- 打卡歷史記錄 (Shifts) ---
  getShifts() {
    return shiftsCache;
  },

  saveShifts(shifts) {
    shifts.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    shiftsCache = shifts;
    saveToLocalStorage();
    saveToLocalServer();
  },

  async addShift(shift) {
    const newShift = {
      id: 'shift-' + Date.now(),
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      employeeColor: shift.employeeColor,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: parseFloat(shift.breakDuration) || 0,
      totalHours: parseFloat(shift.totalHours) || 0,
      earnings: parseFloat(shift.earnings) || 0,
      note: shift.note || ''
    };

    shiftsCache.push(newShift);
    this.saveShifts(shiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('shifts').insert({
        id: newShift.id, employee_id: newShift.employeeId, employee_name: newShift.employeeName, employee_color: newShift.employeeColor,
        start_time: newShift.startTime, end_time: newShift.endTime, break_duration: newShift.breakDuration,
        total_hours: newShift.totalHours, earnings: newShift.earnings, note: newShift.note
      });
      if (error) {
        console.error('Supabase 歷史記錄寫入失敗:', error);
        throw error;
      }
    }

    return newShift;
  },

  async updateShift(id, updatedFields) {
    shiftsCache = shiftsCache.map(shift => {
      if (shift.id === id) return { ...shift, ...updatedFields };
      return shift;
    });
    this.saveShifts(shiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('shifts').update({
        employee_id: updatedFields.employeeId, employee_name: updatedFields.employeeName, employee_color: updatedFields.employeeColor,
        start_time: updatedFields.startTime, end_time: updatedFields.endTime, break_duration: updatedFields.breakDuration,
        total_hours: updatedFields.totalHours, earnings: updatedFields.earnings, note: updatedFields.note
      }).eq('id', id);
      if (error) {
        console.error('Supabase 歷史記錄更新失敗:', error);
        throw error;
      }
    }
  },

  async deleteShift(id) {
    shiftsCache = shiftsCache.filter(shift => shift.id !== id);
    this.saveShifts(shiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('shifts').delete().eq('id', id);
      if (error) {
        console.error('Supabase 歷史記錄刪除失敗:', error);
        throw error;
      }
    }
  },

  // --- 在線打卡狀態 (Active Shifts) ---
  getActiveShifts() {
    return activeShiftsCache;
  },

  saveActiveShifts(activeShifts) {
    activeShiftsCache = activeShifts;
    saveToLocalStorage();
    saveToLocalServer();
  },

  async startClockIn(employeeId) {
    const employee = employeesCache.find(e => e.id === employeeId);
    if (!employee) return null;

    if (activeShiftsCache[employeeId]) return activeShiftsCache[employeeId];

    const newActive = {
      employeeId: employee.id,
      employeeName: employee.name,
      employeeColor: employee.color,
      startTime: Date.now(),
      breakStartTime: null,
      totalBreakDuration: 0,
      status: 'working'
    };

    activeShiftsCache[employeeId] = newActive;
    this.saveActiveShifts(activeShiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('active_shifts').insert({
        employee_id: newActive.employeeId, employee_name: newActive.employeeName, employee_color: newActive.employeeColor,
        start_time: newActive.startTime, break_start_time: newActive.breakStartTime,
        total_break_duration: newActive.totalBreakDuration, status: newActive.status
      });
      if (error) {
        console.error('Supabase 上班寫入失敗:', error);
        throw error;
      }
    }

    return newActive;
  },

  async startBreak(employeeId) {
    const shift = activeShiftsCache[employeeId];
    if (!shift || shift.status !== 'working') return null;

    shift.status = 'on_break';
    shift.breakStartTime = Date.now();
    this.saveActiveShifts(activeShiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('active_shifts').update({
        status: 'on_break', break_start_time: shift.breakStartTime
      }).eq('employee_id', employeeId);
      if (error) {
        console.error('Supabase 切換休息失敗:', error);
        throw error;
      }
    }

    return shift;
  },

  async endBreak(employeeId) {
    const shift = activeShiftsCache[employeeId];
    if (!shift || shift.status !== 'on_break') return null;

    const breakDuration = Date.now() - shift.breakStartTime;
    shift.status = 'working';
    shift.totalBreakDuration += breakDuration;
    shift.breakStartTime = null;
    
    this.saveActiveShifts(activeShiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('active_shifts').update({
        status: 'working', break_start_time: null, total_break_duration: shift.totalBreakDuration
      }).eq('employee_id', employeeId);
      if (error) {
        console.error('Supabase 結束休息失敗:', error);
        throw error;
      }
    }

    return shift;
  },

  async stopClockOut(employeeId, note = '') {
    const shift = activeShiftsCache[employeeId];
    if (!shift) return null;

    let finalBreakDuration = shift.totalBreakDuration;
    if (shift.status === 'on_break' && shift.breakStartTime) {
      finalBreakDuration += (Date.now() - shift.breakStartTime);
    }

    const endTime = Date.now();
    const totalDurationMs = endTime - shift.startTime - finalBreakDuration;
    const totalMins = Math.max(0, totalDurationMs / 60000);
    
    const earnings = Math.floor(totalMins / 15) * 50;
    const totalHours = totalMins / 60;

    const newShift = {
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      employeeColor: shift.employeeColor,
      startTime: new Date(shift.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      breakDuration: Math.round(finalBreakDuration / 60000),
      totalHours: parseFloat(totalHours.toFixed(4)),
      earnings: parseFloat(earnings.toFixed(2)),
      note: note
    };

    const savedShift = await this.addShift(newShift);
    delete activeShiftsCache[employeeId];
    this.saveActiveShifts(activeShiftsCache);

    if (storeMode === 'supabase' && supabaseClient) {
      const { error } = await supabaseClient.from('active_shifts').delete().eq('employee_id', employeeId);
      if (error) {
        console.error('Supabase 刪除在線狀態失敗:', error);
        throw error;
      }
    }

    return savedShift;
  },

  async generateDemoData() {
    const mockEmployees = [
      { id: 'mock-1', name: '王小明', phone: '0912-111-222', role: '店長', color: '#E8DFF5', pin: '1111' },
      { id: 'mock-2', name: '李美華', phone: '0928-333-444', role: '副店長', color: '#D6EAD8', pin: '2222' },
      { id: 'mock-3', name: '張家豪', phone: '0935-555-666', role: '主廚', color: '#FAD2E1', pin: '3333' },
      { id: 'mock-4', name: '林志玲', phone: '0972-777-888', role: '收銀主管', color: '#BEE3DB', pin: '4444' },
      { id: 'mock-5', name: '陳建宏', phone: '0988-999-000', role: '外送組長', color: '#FFF1C5', pin: '5555' },
      { id: 'mock-6', name: '黃雅婷', phone: '0919-123-456', role: '行銷專員', color: '#FFE5EC', pin: '6666' },
      { id: 'mock-7', name: '曾冠宇', phone: '0933-456-789', role: '理貨助理', color: '#E8F5E9', pin: '7777' },
      { id: 'mock-8', name: '劉德華', phone: '0920-987-654', role: '門市計時', color: '#FFD8BE', pin: '8888' },
      { id: 'mock-9', name: '周杰倫', phone: '0955-654-321', role: '吧台調酒', color: '#E8DFF5', pin: '9999' },
      { id: 'mock-10', name: '蔡依林', phone: '0911-222-333', role: '大廳接待', color: '#BEE3DB', pin: '0000' }
    ];

    this.saveEmployees(mockEmployees);

    const shifts = [];
    const now = new Date();
    
    for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date(now);
      currentDate.setDate(now.getDate() - dayOffset);
      
      const employeeCount = 4 + Math.floor(Math.random() * 4);
      const selectedEmployees = [...mockEmployees].sort(() => 0.5 - Math.random()).slice(0, employeeCount);
      
      selectedEmployees.forEach(emp => {
        const startHour = 8 + Math.floor(Math.random() * 7);
        const startMinute = Math.random() > 0.5 ? 0 : 30;
        
        const startTime = new Date(currentDate);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const durationHours = 3 + Math.floor(Math.random() * 11) * 0.5;
        const breakMins = Math.random() > 0.5 ? 30 : 0;
        
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + (durationHours * 60) + breakMins);
        
        const totalMins = durationHours * 60;
        const earnings = Math.floor(totalMins / 15) * 50;
        
        shifts.push({
          id: `mock-shift-${emp.id}-${dayOffset}`,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeColor: emp.color,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          breakDuration: breakMins,
          totalHours: durationHours,
          earnings: earnings,
          note: Math.random() > 0.75 ? '例行排班班次' : ''
        });
      });
    }

    this.saveShifts(shifts);
    this.saveActiveShifts({});

    if (storeMode === 'supabase' && supabaseClient) {
      try {
        await Promise.all([
          supabaseClient.from('active_shifts').delete().neq('employee_id', ''),
          supabaseClient.from('shifts').delete().neq('id', ''),
          supabaseClient.from('employees').delete().neq('id', '')
        ]);
        
        await supabaseClient.from('employees').insert(mockEmployees.map(e => ({
          id: e.id, name: e.name, phone: e.phone, role: e.role, color: e.color, pin: e.pin
        })));
        
        const dbShifts = shifts.map(s => ({
          id: s.id, employee_id: s.employeeId, employee_name: s.employeeName, employee_color: s.employeeColor,
          start_time: s.startTime, end_time: s.endTime, break_duration: s.breakDuration,
          total_hours: s.totalHours, earnings: s.earnings, note: s.note
        }));
        
        const { error } = await supabaseClient.from('shifts').insert(dbShifts);
        if (error) {
          console.error('Supabase 批次新增班次失敗:', error);
          throw error;
        }
      } catch (err) {
        console.error('Supabase 產生測試數據失敗:', err);
        throw err;
      }
    }
  }
};
