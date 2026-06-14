import { Store } from '../store.js?v=1.0.3';
import { Utils } from '../utils.js?v=1.0.3';

export const DashboardView = {
  chart1: null,
  chart2: null,

  render() {
    const shifts = Store.getShifts();
    const employees = Store.getEmployees();

    // 1. 計算統計數據 (本月與本週)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 本月班次
    const thisMonthShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.startTime);
      return shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear;
    });

    const monthlyHours = thisMonthShifts.reduce((acc, s) => acc + s.totalHours, 0);
    const monthlyEarnings = thisMonthShifts.reduce((acc, s) => acc + s.earnings, 0);

    // 本週班次
    const { monday: thisWeekMon, sunday: thisWeekSun } = Utils.getWeekRange(now);
    const lastWeekMon = new Date(thisWeekMon);
    lastWeekMon.setDate(thisWeekMon.getDate() - 7);
    const lastWeekSun = new Date(thisWeekSun);
    lastWeekSun.setDate(thisWeekSun.getDate() - 7);

    const thisWeekShifts = shifts.filter(shift => {
      const t = new Date(shift.startTime).getTime();
      return t >= thisWeekMon.getTime() && t <= thisWeekSun.getTime();
    });

    const lastWeekShifts = shifts.filter(shift => {
      const t = new Date(shift.startTime).getTime();
      return t >= lastWeekMon.getTime() && t <= lastWeekSun.getTime();
    });

    const thisWeekHours = thisWeekShifts.reduce((acc, s) => acc + s.totalHours, 0);
    const lastWeekHours = lastWeekShifts.reduce((acc, s) => acc + s.totalHours, 0);
    const thisWeekEarnings = thisWeekShifts.reduce((acc, s) => acc + s.earnings, 0);

    // 計算週工時變化百分比
    let weekChangeText = '無前週資料';
    let weekChangeClass = '';
    if (lastWeekHours > 0) {
      const diffPct = ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100;
      if (diffPct >= 0) {
        weekChangeText = `較上週增加 +${diffPct.toFixed(0)}%`;
        weekChangeClass = 'color-success';
      } else {
        weekChangeText = `較上週減少 ${diffPct.toFixed(0)}%`;
        weekChangeClass = 'color-danger';
      }
    } else if (thisWeekHours > 0) {
      weekChangeText = '本週開始打卡！';
      weekChangeClass = 'color-success';
    }

    return `
      <div class="view-header">
        <div>
          <h2 class="view-title">數據分析儀表板</h2>
          <p class="view-subtitle">追蹤員工總工時、預估薪資支出與工時分佈</p>
        </div>
        <div>
          <button id="generate-demo-btn" class="btn btn-secondary btn-sm" style="background: rgba(255,241,197,0.5); border-color: rgba(255,210,117,0.5); color: #796112;">
            <i data-lucide="sparkles" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 0.3rem;"></i>
            產生一個月測試數據
          </button>
        </div>
      </div>

      <!-- 第一排：關鍵指標 KPI 卡片 -->
      <div class="stats-grid">
        <!-- 卡片 1：本月工時 -->
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background-color: var(--macaron-blue); color: var(--text-main);">
            <i data-lucide="clock" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">本月員工總工時</span>
            <span class="stat-number">${monthlyHours.toFixed(1)} 小時</span>
          </div>
        </div>

        <!-- 卡片 2：本月工資支出 -->
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background-color: var(--macaron-green); color: var(--text-main);">
            <i data-lucide="banknote" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">本月預估工資支出</span>
            <span class="stat-number" style="color: #5aa16b;">${Utils.formatCurrency(monthlyEarnings, 0)}</span>
          </div>
        </div>

        <!-- 卡片 3：本週工資支出 -->
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background-color: var(--macaron-purple); color: var(--text-main);">
            <i data-lucide="calendar-days" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">本週工資支出 (${thisWeekHours.toFixed(1)}h)</span>
            <span class="stat-number" style="font-size: 1.4rem;">${Utils.formatCurrency(thisWeekEarnings, 0)}</span>
            <span style="font-size: 0.75rem; font-weight: 600; margin-top: 0.2rem;" class="${weekChangeClass}">
              ${weekChangeText}
            </span>
          </div>
        </div>

        <!-- 卡片 4：在職員工數 -->
        <div class="glass-card stat-card">
          <div class="stat-icon" style="background-color: var(--macaron-yellow); color: var(--text-main);">
            <i data-lucide="users" style="width: 24px; height: 24px;"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">登記在職員工數</span>
            <span class="stat-number">${employees.length} 人</span>
          </div>
        </div>
      </div>

      <!-- 第二排：圖表分析 -->
      <div class="charts-container">
        <!-- 左邊：近期工時趨勢 -->
        <div class="glass-card chart-card">
          <h3 style="font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="bar-chart-3" style="width: 20px; height: 20px; color: var(--text-muted);"></i>
            近七日全體員工每日工時
          </h3>
          <div class="chart-wrapper">
            ${shifts.length === 0 
              ? `<div class="empty-state">暫無足夠的打卡資料可繪製圖表</div>` 
              : `<canvas id="hoursTrendChart"></canvas>`
            }
          </div>
        </div>

        <!-- 右邊：員工工時分配比例 -->
        <div class="glass-card chart-card">
          <h3 style="font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="pie-chart" style="width: 20px; height: 20px; color: var(--text-muted);"></i>
            員工工時分配佔比
          </h3>
          <div class="chart-wrapper">
            ${shifts.length === 0 
              ? `<div class="empty-state">暫無工時佔比資料</div>` 
              : `<canvas id="jobShareChart"></canvas>`
            }
          </div>
        </div>
      </div>
    `;
  },

  init() {
    if (window.lucide) window.lucide.createIcons();

    // 綁定產生測試數據按鈕 (即使無打卡記錄也需可用)
    const demoBtn = document.getElementById('generate-demo-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', async () => {
        const confirmGen = confirm('這會清除您目前所有的員工與打卡資料，並自動為您建立 10 名測試員工以及過去 30 天內（以15分鐘50元計薪）的完整排班打卡紀錄以供圖表展示。\n\n確定要產生測試數據嗎？');
        if (confirmGen) {
          try {
            await Store.generateDemoData();
            alert('測試數據產生成功！網頁即將自動重新整理。');
            window.location.reload();
          } catch (err) {
            console.error('產生測試數據失敗:', err);
            alert(`產生測試數據失敗！錯誤訊息：${err.message || err.details || JSON.stringify(err)}`);
          }
        }
      });
    }

    if (this.chart1) { this.chart1.destroy(); this.chart1 = null; }
    if (this.chart2) { this.chart2.destroy(); this.chart2 = null; }

    const shifts = Store.getShifts();
    if (shifts.length === 0) return;

    // --- 圖表一：近七日每日總工時趨勢 ---
    const ctx1 = document.getElementById('hoursTrendChart');
    if (ctx1) {
      const labels = [];
      const dataHours = [];
      const dataEarnings = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = Utils.formatDate(d, 'MM/DD');
        labels.push(dateStr);

        const dayShifts = shifts.filter(s => {
          const sDate = new Date(s.startTime);
          return sDate.getDate() === d.getDate() && 
                 sDate.getMonth() === d.getMonth() && 
                 sDate.getFullYear() === d.getFullYear();
        });

        const sumHours = dayShifts.reduce((acc, s) => acc + s.totalHours, 0);
        const sumEarnings = dayShifts.reduce((acc, s) => acc + s.earnings, 0);
        dataHours.push(sumHours);
        dataEarnings.push(sumEarnings);
      }

      this.chart1 = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: '總工時 (小時)',
            data: dataHours,
            backgroundColor: '#BEE3DB',
            borderColor: '#A8D3C9',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 24,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#2D3142',
              titleFont: { family: 'Outfit', size: 13 },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                footer: (tooltipItems) => {
                  const index = tooltipItems[0].dataIndex;
                  return `薪資總支出: NT$ ${dataEarnings[index].toFixed(0)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Outfit', weight: '600' } }
            },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.03)' },
              ticks: { font: { family: 'Outfit' }, stepSize: 2 }
            }
          }
        }
      });
    }

    // --- 圖表二：員工工時分配比例 ---
    const ctx2 = document.getElementById('jobShareChart');
    if (ctx2) {
      const empHoursMap = {};
      const empColorMap = {};

      shifts.forEach(shift => {
        if (!empHoursMap[shift.employeeName]) {
          empHoursMap[shift.employeeName] = 0;
          empColorMap[shift.employeeName] = shift.employeeColor || '#E8DFF5';
        }
        empHoursMap[shift.employeeName] += shift.totalHours;
      });

      const labels = Object.keys(empHoursMap);
      const data = Object.values(empHoursMap);
      const colors = labels.map(label => empColorMap[label]);

      this.chart2 = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 3,
            borderColor: '#ffffff',
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Outfit', weight: '600', size: 12 },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: '#2D3142',
              titleFont: { family: 'Outfit', size: 13 },
              bodyFont: { family: 'Outfit', size: 12 },
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: (tooltipItem) => {
                  const val = tooltipItem.raw;
                  const total = data.reduce((a, b) => a + b, 0);
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${tooltipItem.label}: ${val.toFixed(1)} 小時 (${pct}%)`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }
};
