/**
 * 共用工具函式庫
 */

export const Utils = {
  /**
   * 格式化日期時間
   * @param {string|Date|number} dateVal 
   * @param {string} format 'YYYY-MM-DD' | 'HH:mm:ss' | 'YYYY-MM-DD HH:mm' | 'MM/DD'
   */
  formatDate(dateVal, format = 'YYYY-MM-DD HH:mm') {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';

    const pad = (num) => String(num).padStart(2, '0');

    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());

    return format
      .replace('YYYY', YYYY)
      .replace('MM', MM)
      .replace('DD', DD)
      .replace('HH', HH)
      .replace('mm', mm)
      .replace('ss', ss);
  },

  /**
   * 格式化貨幣/薪資 (加千分位與整數/小數顯示)
   */
  formatCurrency(value, decimals = 0) {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0';
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * 格式化毫秒數為時分秒 (00:00:00)
   */
  formatDuration(ms) {
    if (isNaN(ms) || ms < 0) return '00:00:00';
    const totalSecs = Math.floor(ms / 1000);
    const secs = totalSecs % 60;
    const totalMins = Math.floor(totalSecs / 60);
    const mins = totalMins % 60;
    const hours = Math.floor(totalMins / 60);

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  },

  /**
   * 格式化分鐘數為可讀字串 (例如：1小時30分 或 45分)
   */
  formatMinutesText(minsVal) {
    const mins = parseInt(minsVal) || 0;
    if (mins <= 0) return '無';
    if (mins < 60) return `${mins} 分鐘`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} 小時 ${m} 分` : `${h} 小時`;
  },

  /**
   * 計算 15 分鐘單位的工資：每 15 分鐘 50 元
   * @param {number} workedMins 工作時間(分鐘)
   */
  calculate15MinEarnings(workedMins) {
    if (isNaN(workedMins) || workedMins < 0) return 0;
    return Math.floor(workedMins / 15) * 50;
  },

  /**
   * 將打卡歷史記錄匯出為 CSV 檔並下載
   */
  exportToCSV(shifts, fileName = 'employee_shifts_report.csv') {
    if (!shifts || shifts.length === 0) {
      alert('沒有資料可供匯出！');
      return;
    }

    // CSV 表頭 (加上 UTF-8 BOM 以防 Excel 開啟亂碼)
    const headers = ['班次ID', '員工姓名', '上班時間', '下班時間', '休息時間(分鐘)', '實際工時(小時)', '結算薪資(元)', '備註'];
    const rows = shifts.map(shift => [
      shift.id,
      shift.employeeName,
      this.formatDate(shift.startTime, 'YYYY-MM-DD HH:mm:ss'),
      this.formatDate(shift.endTime, 'YYYY-MM-DD HH:mm:ss'),
      shift.breakDuration,
      shift.totalHours,
      shift.earnings,
      `"${(shift.note || '').replace(/"/g, '""')}"` // 逸出引號
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * 取得指定日期的週數資訊 (一年的第幾週)
   */
  getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  },

  /**
   * 取得當月的第一天與最後一天 (Date 物件)
   */
  getMonthRange(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { firstDay, lastDay };
  },

  /**
   * 取得本週的第一天（週一）與最後一天（週日）
   */
  getWeekRange(date) {
    const currentDay = date.getDay(); // 0 是週日，1-6 是週一到週六
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(date);
    monday.setDate(date.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }
};
