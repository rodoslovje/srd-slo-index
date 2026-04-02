import { t } from './i18n.js';
import { renderTable } from './table.js';
import { API_BASE_URL } from './config.js';

const contributorColumns = ['contributor_ID', 'total_births', 'total_families', 'total_deaths', 'total', 'total_links', 'last_modified'];
let cachedData = null;
let fetchPromise = null;
let chartInstance = null;

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

export function prefetchContributors() {
  ensureData().catch(() => {});
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
    const data = await ensureData();
    renderChart(data);
    renderTable(data, 'table-contributors', contributorColumns, 'total', false);
  } catch {
    container.innerHTML = `<p>${t('contributors_failed')}</p>`;
  }
}

function renderChart(data) {
  if (!window.Chart) return;

  const wrapper = document.getElementById('chart-wrapper');
  if (wrapper) wrapper.style.display = 'block';

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

/** Re-renders the contributors table if it is currently visible (re-translates column headers). */
export function refreshContributorsIfVisible() {
  if (cachedData && document.getElementById('tab-contributors').classList.contains('active')) {
    renderChart(cachedData);
    renderTable(cachedData, 'table-contributors', contributorColumns, 'total', false);
  }
}
