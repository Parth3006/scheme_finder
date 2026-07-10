/**
 * Dashboard Module
 * Rebuilds all stats, charts, and the activity feed from real search
 * history saved by results.js (localStorage key below). No hardcoded
 * or randomly-generated numbers — if there's no history yet, an honest
 * empty state is shown instead.
 */
const Dashboard = (() => {
  'use strict';

  // Must match Results' HISTORY_KEY exactly.
  const HISTORY_KEY = 'schemefinder_search_history';

  const DONUT_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B'];

  // ── State ──────────────────────────────────────────────────────────────
  let initialized = false;

  // ── DOM Helpers ────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);

  // ── Initialization ─────────────────────────────────────────────────────
  function init() {
    // Re-render every time the dashboard page is shown, since real history
    // may have changed since the last visit (e.g. a search was just done).
    renderAll();

    if (!initialized) {
      initialized = true;
      window.addEventListener('schemefinder:historyUpdated', renderAll);
      window.addEventListener('storage', onStorageEvent);
    }
  }

  function onStorageEvent(e) {
    if (e.key === HISTORY_KEY) renderAll();
  }

  // ── History Access ─────────────────────────────────────────────────────
  function getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('Could not read search history:', err.message);
      return [];
    }
  }

  // ── Master Render ──────────────────────────────────────────────────────
  function renderAll() {
    const history = getHistory();

    if (history.length === 0) {
      showEmptyState();
      return;
    }

    showDataState();
    renderStats(history);
    renderBarChart(history);
    renderDonutChart(history);
    renderActivityFeed(history);
  }

  // ── Empty / Data State Toggling ────────────────────────────────────────
  function showEmptyState() {
    const statsGrid = el('dashboardStats');
    const chartsGrid = document.querySelector('.dashboard-charts');
    const feedCard = el('activityFeed')?.closest('.chart-card');

    if (statsGrid) statsGrid.style.display = 'none';
    if (chartsGrid) chartsGrid.style.display = 'none';
    if (feedCard) feedCard.style.display = 'none';

    let empty = el('dashboardEmptyState');
    if (!empty) {
      const container = document.querySelector('#dashboard .container');
      if (!container) return;

      empty = document.createElement('div');
      empty.id = 'dashboardEmptyState';
      empty.className = 'chart-card full-width';
      empty.style.textAlign = 'center';
      empty.style.padding = '48px 24px';
      empty.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
        <h3 style="margin-bottom: 8px;">No activity yet</h3>
        <p style="color: var(--text-secondary, #64748b); margin-bottom: 20px;">
          This dashboard reflects real searches. Run an eligibility check to see your data appear here.
        </p>
        <button type="button" class="btn btn-primary" id="dashboardEmptyCta">Check Your Eligibility →</button>
      `;
      container.appendChild(empty);

      empty.querySelector('#dashboardEmptyCta').addEventListener('click', () => {
        if (typeof App !== 'undefined') App.navigateTo('eligibility');
      });
    }
    empty.style.display = 'block';
  }

  function showDataState() {
    const statsGrid = el('dashboardStats');
    const chartsGrid = document.querySelector('.dashboard-charts');
    const feedCard = el('activityFeed')?.closest('.chart-card');
    const empty = el('dashboardEmptyState');

    if (statsGrid) statsGrid.style.display = '';
    if (chartsGrid) chartsGrid.style.display = '';
    if (feedCard) feedCard.style.display = '';
    if (empty) empty.style.display = 'none';
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  function renderStats(history) {
    const totalSearches = history.length;
    const totalMatches = history.reduce((sum, h) => sum + (h.schemeCount || 0), 0);
    const uniqueStates = new Set(history.map((h) => h.state).filter(Boolean)).size;

    const allScores = [];
    history.forEach((h) => {
      (h.schemes || []).forEach((s) => {
        if (typeof s.matchScore === 'number') allScores.push(s.matchScore);
      });
    });
    const avgScore = allScores.length
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    setStat('dashSearches', totalSearches, 'Total Searches');
    setStat('dashMatches', totalMatches, 'Schemes Matched');
    setStat('dashUsers', uniqueStates, 'States Explored');
    setStat('dashSuccess', avgScore, 'Avg Match Score %');
  }

  function setStat(id, value, label) {
    const numEl = el(id);
    if (!numEl) return;

    numEl.dataset.target = value;
    numEl.textContent = value.toLocaleString('en-IN');

    const labelEl = numEl.parentElement?.querySelector('.dash-stat-label');
    if (labelEl && label) labelEl.textContent = label;
  }

  // ── Bar Chart: real states from search history ────────────────────────
  function renderBarChart(history) {
    const container = el('statesChart');
    if (!container) return;

    container.innerHTML = '';

    const counts = {};
    history.forEach((h) => {
      const state = h.state || 'Unknown';
      counts[state] = (counts[state] || 0) + 1;
    });

    const entries = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxValue = Math.max(...entries.map(([, v]) => v));

    entries.forEach(([state, value], i) => {
      const percentage = (value / maxValue) * 100;

      const barItem = document.createElement('div');
      barItem.className = 'bar-item';
      barItem.innerHTML = `
        <span class="bar-label">${escapeHtml(state)}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: 0%" data-value="${value}"></div>
        </div>
      `;

      container.appendChild(barItem);

      const fill = barItem.querySelector('.bar-fill');
      setTimeout(() => {
        fill.style.width = `${percentage}%`;
      }, 200 + i * 150);
    });
  }

  // ── Donut Chart: real scheme categories from matched schemes ──────────
  function renderDonutChart(history) {
    const container = el('categoriesChart');
    if (!container) return;

    container.innerHTML = '';

    const counts = {};
    history.forEach((h) => {
      (h.schemes || []).forEach((s) => {
        const cat = s.category || 'Uncategorized';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });

    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    // Collapse long tails into "Other" so the legend stays readable.
    if (entries.length > 6) {
      const top = entries.slice(0, 5);
      const otherTotal = entries.slice(5).reduce((sum, [, v]) => sum + v, 0);
      entries = [...top, ['Other', otherTotal]];
    }

    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    if (total === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary, #64748b);">No matched schemes yet.</p>';
      return;
    }

    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    let svgContent = `<circle class="donut-ring" cx="100" cy="100" r="${radius}"
      fill="none" stroke="var(--bg-elevated, #e2e8f0)" stroke-width="16"/>`;

    let offset = 0;
    entries.forEach(([, value], i) => {
      const percentage = value / total;
      const dashLength = percentage * circumference;
      const dashOffset = -offset * circumference;

      svgContent += `
        <circle class="donut-segment"
          cx="100" cy="100" r="${radius}"
          fill="none"
          stroke="${DONUT_COLORS[i % DONUT_COLORS.length]}"
          stroke-width="16"
          stroke-dasharray="${dashLength} ${circumference - dashLength}"
          stroke-dashoffset="${dashOffset}"
          transform="rotate(-90 100 100)"
          style="transition: stroke-dasharray 1s ease ${i * 0.15}s"/>
      `;

      offset += percentage;
    });

    svgContent += `
      <text x="100" y="95" text-anchor="middle" class="donut-center-text" fill="var(--text-primary, #1e293b)" font-size="18" font-weight="700">${total}</text>
      <text x="100" y="115" text-anchor="middle" class="donut-center-label" fill="var(--text-secondary, #64748b)" font-size="11">Matches</text>
    `;

    const svg = document.createElement('div');
    svg.innerHTML = `<svg class="donut-svg" viewBox="0 0 200 200">${svgContent}</svg>`;

    const legend = document.createElement('div');
    legend.className = 'donut-legend';
    entries.forEach(([label, value], i) => {
      const percentage = Math.round((value / total) * 100);
      legend.innerHTML += `
        <div class="legend-item">
          <span class="legend-dot" style="background: ${DONUT_COLORS[i % DONUT_COLORS.length]}"></span>
          <span class="legend-label">${escapeHtml(label)}</span>
          <span class="legend-value">${percentage}%</span>
        </div>
      `;
    });

    container.appendChild(svg.firstElementChild);
    container.appendChild(legend);
  }

  // ── Activity Feed: real search history, most recent first ─────────────
  function renderActivityFeed(history) {
    const feed = el('activityFeed');
    if (!feed) return;

    feed.innerHTML = '';

    const recent = [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);

    recent.forEach((entry, i) => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.style.animationDelay = `${i * 0.1}s`;

      const stateText = escapeHtml(entry.state || 'Unknown');
      const count = entry.schemeCount || 0;
      const text = count > 0
        ? `<strong>Search from ${stateText}</strong> matched ${count} scheme${count !== 1 ? 's' : ''}`
        : `<strong>Search from ${stateText}</strong> found no matching schemes`;

      item.innerHTML = `
        <div class="activity-icon">${count > 0 ? '✅' : '🔍'}</div>
        <div class="activity-text">${text}</div>
        <div class="activity-time">${timeAgo(entry.timestamp)}</div>
      `;
      feed.appendChild(item);
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────
  function cleanup() {
    window.removeEventListener('schemefinder:historyUpdated', renderAll);
    window.removeEventListener('storage', onStorageEvent);
    initialized = false;
  }

  // ── Utilities ──────────────────────────────────────────────────────────
  function timeAgo(timestamp) {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin !== 1 ? 's' : ''} ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return { init, cleanup };
})();
