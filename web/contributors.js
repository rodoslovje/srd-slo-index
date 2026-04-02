import { t } from './i18n.js';
import { renderTable } from './table.js';
import { API_BASE_URL } from './config.js';

const contributorColumns = ['contributor_ID', 'total_births', 'total_families', 'total_deaths', 'total', 'total_links', 'last_modified'];
let cachedData = null;
let fetchPromise = null;
let chartInstance = null;

let timelineData = null;
let timelinePromise = null;
let timelineChartInstance = null;

function ensureData() {
  if (cachedData) return Promise.resolve(cachedData);
  if (!fetchPromise) {
    fetchPromise = fetch(`${API_BASE_URL}/api/contributors/`)
      .then(r => r.json())
      .then(metadata => {
        cachedData = metadata.map(m => ({
          contributor_ID: m.name,
          total_births: m.births_count,
          total_families: m.families_count,
          total_deaths: m.deaths_count || 0,
          total: m.births_count + m.families_count + (m.deaths_count || 0),
          total_links: m.links_count || 0,
          last_modified: m.last_modified ? m.last_modified.slice(0, 10) : '',
        }));
        return cachedData;
      });
  }
  return fetchPromise;
}

function ensureTimelineData() {
  if (timelineData) return Promise.resolve(timelineData);
  if (!timelinePromise) {
    timelinePromise = fetch(`${API_BASE_URL}/api/stats/birth-years`)
      .then(r => r.json())
      .then(data => { timelineData = data; return data; });
  }
  return timelinePromise;
}

export function prefetchContributors() {
  ensureData().catch(() => {});
  ensureTimelineData().catch(() => {});
}

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export async function renderTotalsBar() {
  try {
    const data = await ensureData();
    const births = data.reduce((s, r) => s + r.total_births, 0);
    const families = data.reduce((s, r) => s + r.total_families, 0);
    const deaths = data.reduce((s, r) => s + r.total_deaths, 0);
    const links = data.reduce((s, r) => s + r.total_links, 0);
    const lastUpdate = data.reduce((max, r) => r.last_modified > max ? r.last_modified : max, '');
    setEl('total-contributors', data.length.toLocaleString());
    setEl('total-births', births.toLocaleString());
    setEl('total-families', families.toLocaleString());
    setEl('total-deaths', deaths.toLocaleString());
    setEl('total-all', (births + families + deaths).toLocaleString());
    setEl('total-links', links.toLocaleString());
    setEl('total-last-update', lastUpdate);
    document.getElementById('totals-bar').style.display = '';
  } catch { /* silently skip if API unavailable */ }
}

export async function renderContributors() {
  const container = document.getElementById('table-contributors');
  container.innerHTML = `<p>${t('loading_contributors')}</p>`;

  try {
    const [data, timeline] = await Promise.all([ensureData(), ensureTimelineData()]);

    const chartsContainer = document.getElementById('charts-container');
    if (chartsContainer) chartsContainer.style.display = 'grid';

    renderChart(data);
    renderTimelineChart(timeline);
    renderTable(data, 'table-contributors', contributorColumns, 'total', false);
  } catch {
    container.innerHTML = `<p>${t('contributors_failed')}</p>`;
  }
}

function renderChart(data) {
  if (!window.Chart) return;

  const ctx = document.getElementById('contributorsChart')?.getContext('2d');
  if (!ctx) return;

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const top10 = sorted.slice(0, 10);
  const others = sorted.slice(10);
  const othersTotal = others.reduce((sum, r) => sum + r.total, 0);

  const labels = top10.map(d => d.contributor_ID);
  const values = top10.map(d => d.total);

  if (othersTotal > 0) {
    labels.push(t('chart_others'));
    values.push(othersTotal);
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  // Vibrant, accessible colors for the chart slices
  const bgColors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#d35400', '#7f8c8d', '#bdc3c7'];

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: t('tab_contributors'),
          font: { family: 'system-ui, -apple-system, sans-serif', size: 14, weight: '600' },
          color: '#444'
        },
        legend: {
          position: window.innerWidth > 600 ? 'right' : 'bottom',
          labels: { font: { family: 'system-ui, -apple-system, sans-serif' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderTimelineChart(data) {
  if (!window.Chart) return;
  const ctx = document.getElementById('timelineChart')?.getContext('2d');
  if (!ctx) return;

  const decades = {};
  data.forEach(d => {
    const decade = Math.floor(d.year / 10) * 10;
    decades[decade] = (decades[decade] || 0) + d.count;
  });

  // Fill any gaps so the timeline represents a continuous X-axis
  if (Object.keys(decades).length > 0) {
    const minDecade = Math.min(...Object.keys(decades).map(Number));
    const maxDecade = Math.max(...Object.keys(decades).map(Number));
    for (let i = minDecade; i <= maxDecade; i += 10) {
      if (decades[i] === undefined) decades[i] = 0;
    }
  }

  const labels = Object.keys(decades).sort((a, b) => a - b).map(d => `${d}s`);
  const values = Object.keys(decades).sort((a, b) => a - b).map(d => decades[d]);

  if (timelineChartInstance) timelineChartInstance.destroy();

  timelineChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: t('chart_birth_years'),
        data: values,
        backgroundColor: '#3498db',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: t('chart_birth_years'),
          font: { family: 'system-ui, -apple-system, sans-serif', size: 14, weight: '600' },
          color: '#444'
        },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} ${t('results_births').toLowerCase()}` }
        }
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } }
    }
  });
}

/** Re-renders the contributors table if it is currently visible (re-translates column headers). */
export function refreshContributorsIfVisible() {
  if (cachedData && document.getElementById('tab-contributors').classList.contains('active')) {
    renderChart(cachedData);
    if (timelineData) renderTimelineChart(timelineData);
    renderTable(cachedData, 'table-contributors', contributorColumns, 'total', false);
  }
}
