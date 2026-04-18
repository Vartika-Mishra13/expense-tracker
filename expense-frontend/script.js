const authShell = document.getElementById('auth-shell');
const appShell = document.getElementById('app-shell');
const authForm = document.getElementById('auth-form');
const authTitleEl = document.getElementById('auth-title');
const authSubtitleEl = document.getElementById('auth-subtitle');
const authNameRow = document.getElementById('auth-name-row');
const authNameEl = document.getElementById('auth-name');
const authEmailEl = document.getElementById('auth-email');
const authPasswordEl = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authMessageEl = document.getElementById('auth-message');
const currentUserNameEl = document.getElementById('current-user-name');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const logoutBtn = document.getElementById('logout-btn');

const form = document.getElementById('expense-form');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const dateEl = document.getElementById('date');
const noteEl = document.getElementById('note');
const recurringEl = document.getElementById('recurring');
const tbody = document.getElementById('expense-tbody');
const totalEl = document.getElementById('total');
const totalCaptionEl = document.getElementById('total-caption');
const monthTotalEl = document.getElementById('month-total');
const monthCaptionEl = document.getElementById('month-caption');
const averageExpenseEl = document.getElementById('average-expense');
const averageCaptionEl = document.getElementById('average-caption');
const topCatEl = document.getElementById('top-category');
const topCategoryCaptionEl = document.getElementById('top-category-caption');
const heroMonthTotalEl = document.getElementById('hero-month-total');
const heroMonthMessageEl = document.getElementById('hero-month-message');
const recentExpenseEl = document.getElementById('recent-expense');
const dailyAverageEl = document.getElementById('daily-average');
const largestExpenseEl = document.getElementById('largest-expense');
const saveBtn = document.getElementById('save-btn');
const cancelEditBtn = document.getElementById('cancel-edit');

const budgetInput = document.getElementById('budget-input');
const saveBudgetBtn = document.getElementById('save-budget-btn');
const budgetWarning = document.getElementById('budget-warning');
const budgetProgressText = document.getElementById('budget-progress-text');
const budgetProgressFill = document.getElementById('budget-progress-fill');
const categoryBudgetCategoryEl = document.getElementById('category-budget-category');
const categoryBudgetAmountEl = document.getElementById('category-budget-amount');
const saveCategoryBudgetBtn = document.getElementById('save-category-budget-btn');
const categoryBudgetListEl = document.getElementById('category-budget-list');
const anomalyListEl = document.getElementById('anomaly-list');
const insightsListEl = document.getElementById('insights-list');
const forecastSummaryEl = document.getElementById('forecast-summary');
const forecastListEl = document.getElementById('forecast-list');

const searchNoteInput = document.getElementById('search-note');
const filterCategorySelect = document.getElementById('filter-category');
const filterStartDate = document.getElementById('filter-start');
const filterEndDate = document.getElementById('filter-end');

const reportMonthInput = document.getElementById('report-month');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportOutput = document.getElementById('report-output');
const tableStatusEl = document.getElementById('table-status');

const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

let expenses = [];
let editId = null;
let categoryChart = null;
let currentUser = null;
let authMode = 'signup';
let categoryBudgets = [];
let anomalies = [];
let insights = [];
let forecast = null;

const BUDGET_KEY_PREFIX = 'monthlyBudget';
const AUTH_TOKEN_KEY = 'expenseTrackerAuthToken';
const THEME_KEY = 'expenseTrackerTheme';
const isLocalhost = ['', 'localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = isLocalhost
  ? 'http://localhost:3001'
  : 'https://expense-tracker-7o58.onrender.com';
const API_URL = `${API_BASE_URL}/expenses`;
const CATEGORY_BUDGETS_URL = `${API_BASE_URL}/category-budgets`;
const ANOMALIES_URL = `${API_BASE_URL}/anomalies`;
const INSIGHTS_URL = `${API_BASE_URL}/insights`;
const FORECAST_URL = `${API_BASE_URL}/forecast`;

const formatCurrency = value => `Rs ${Number(value || 0).toFixed(2)}`;
const formatDisplayDate = value => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});
const formatLongDate = value => new Date(value).toLocaleDateString('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getBudgetKey() {
  return currentUser ? `${BUDGET_KEY_PREFIX}:${currentUser.id}` : BUDGET_KEY_PREFIX;
}

function setAuthMessage(message, isError = false) {
  authMessageEl.textContent = message;
  authMessageEl.classList.remove('hidden', 'error', 'success');
  authMessageEl.classList.add(isError ? 'error' : 'success');
}

function clearAuthMessage() {
  authMessageEl.textContent = '';
  authMessageEl.classList.add('hidden');
  authMessageEl.classList.remove('error', 'success');
}

function updateAuthMode() {
  const isSignup = authMode === 'signup';
  authTitleEl.textContent = isSignup ? 'Create your account' : 'Welcome back';
  authSubtitleEl.textContent = isSignup
    ? 'Each user gets their own expenses, budgets, and future smart insights.'
    : 'Sign in to access your private expense dashboard.';
  authNameRow.classList.toggle('hidden', !isSignup);
  authNameEl.required = isSignup;
  authSubmitBtn.textContent = isSignup ? 'Sign Up' : 'Login';
  authToggleBtn.textContent = isSignup ? 'I already have an account' : 'Create a new account';
  clearAuthMessage();
}

function showAuthView() {
  authShell.classList.remove('hidden');
  appShell.classList.add('hidden');
}

function showAppView() {
  authShell.classList.add('hidden');
  appShell.classList.remove('hidden');
  currentUserNameEl.textContent = currentUser ? `Signed in as ${currentUser.name}` : 'Signed in';
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleBtn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
}

function getCurrentMonthExpenses() {
  const now = new Date();
  return expenses.filter(expense => {
    const date = new Date(expense.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

function getFilteredExpenses() {
  return expenses.filter(expense => {
    const searchText = searchNoteInput.value.trim().toLowerCase();
    if (searchText && !(expense.note || '').toLowerCase().includes(searchText)) return false;
    if (filterCategorySelect.value && expense.category !== filterCategorySelect.value) return false;
    if (filterStartDate.value && new Date(expense.date) < new Date(filterStartDate.value)) return false;
    if (filterEndDate.value && new Date(expense.date) > new Date(filterEndDate.value)) return false;
    return true;
  });
}

function getSortedExpenses(list) {
  return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getCategorySpentThisMonth(category) {
  return getCurrentMonthExpenses()
    .filter(expense => expense.category === category)
    .reduce((sum, expense) => sum + Number(expense.amount), 0);
}

function renderCategoryBudgets() {
  categoryBudgetListEl.innerHTML = '';

  if (!categoryBudgets.length) {
    categoryBudgetListEl.innerHTML = '<div class="summary-note">No category budgets yet. Add one above to start tracking smarter.</div>';
    return;
  }

  categoryBudgets
    .slice()
    .sort((a, b) => a.category.localeCompare(b.category))
    .forEach(budget => {
      const spent = getCategorySpentThisMonth(budget.category);
      const remaining = budget.monthlyLimit - spent;
      const item = document.createElement('div');
      item.className = 'category-budget-item';
      item.innerHTML = `
        <div>
          <strong>${budget.category}</strong>
          <div class="summary-note">${formatCurrency(spent)} spent of ${formatCurrency(budget.monthlyLimit)}</div>
        </div>
        <div class="${remaining < 0 ? 'budget-status danger-text' : 'budget-status'}">
          ${remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
        </div>
      `;
      categoryBudgetListEl.appendChild(item);
    });
}

function renderAnomalies() {
  anomalyListEl.innerHTML = '';

  if (!anomalies.length) {
    anomalyListEl.innerHTML = '<div class="summary-note">No unusual spending patterns detected right now.</div>';
    return;
  }

  anomalies.forEach(anomaly => {
    const item = document.createElement('div');
    item.className = 'anomaly-item';
    const signalTitles = anomaly.signals.map(signal => signal.title).join(' | ');
    const primaryDescription = anomaly.signals[0]?.description || 'Unusual spending pattern detected.';
    item.innerHTML = `
      <div class="anomaly-topline">
        <strong>${anomaly.expense.category} | ${formatCurrency(anomaly.expense.amount)}</strong>
        <span class="anomaly-badge ${anomaly.severity === 'high' ? 'high' : 'medium'}">${anomaly.severity === 'high' ? 'High Alert' : 'Watch'}</span>
      </div>
      <div class="summary-note">${formatDisplayDate(anomaly.expense.date)}${anomaly.expense.note ? ` | ${anomaly.expense.note}` : ''}</div>
      <div class="summary-note">${signalTitles}</div>
      <p class="anomaly-description">${primaryDescription}</p>
    `;
    anomalyListEl.appendChild(item);
  });
}

function renderInsights() {
  insightsListEl.innerHTML = '';

  if (!insights.length) {
    insightsListEl.innerHTML = '<div class="summary-note">Add more expenses to unlock behavior insights.</div>';
    return;
  }

  insights.forEach(insight => {
    const item = document.createElement('div');
    item.className = 'insight-item';
    item.innerHTML = `
      <div class="insight-item-title">
        <strong>${insight.title}</strong>
        <span class="insight-tone ${insight.tone || 'neutral'}">${insight.type}</span>
      </div>
      <p class="insight-item-detail">${insight.detail}</p>
    `;
    insightsListEl.appendChild(item);
  });
}

function renderForecast() {
  forecastSummaryEl.innerHTML = '';
  forecastListEl.innerHTML = '';

  if (!forecast || !forecast.insights?.length) {
    forecastSummaryEl.innerHTML = '<div class="summary-note">Add more current-month expenses to generate a forecast.</div>';
    return;
  }

  const confidenceText = forecast.confidence === 'higher'
    ? 'Higher confidence'
    : forecast.confidence === 'medium' ? 'Medium confidence' : 'Early estimate';

  forecastSummaryEl.innerHTML = `
    <div class="forecast-hero">
      <strong>${formatCurrency(forecast.projectedTotal)}</strong>
      <span class="insight-tone ${forecast.confidence === 'higher' ? 'positive' : 'neutral'}">${confidenceText}</span>
    </div>
    <div class="summary-note">Projected month-end total from ${forecast.daysElapsed} of ${forecast.daysInMonth} days.</div>
  `;

  forecast.insights.forEach(item => {
    const card = document.createElement('div');
    card.className = 'forecast-item';
    card.innerHTML = `
      <div class="insight-item-title">
        <strong>${item.title}</strong>
        <span class="insight-tone ${item.tone || 'neutral'}">forecast</span>
      </div>
      <p class="insight-item-detail">${item.detail}</p>
    `;
    forecastListEl.appendChild(card);
  });

  forecast.categoryForecasts.forEach(category => {
    const card = document.createElement('div');
    card.className = 'forecast-item';
    const riskLabel = typeof category.limit === 'number' && category.overBy > 0
      ? `Risk: +${formatCurrency(category.overBy)}`
      : typeof category.limit === 'number'
        ? `Target: ${formatCurrency(category.limit)}`
        : 'No category budget';
    card.innerHTML = `
      <div class="insight-item-title">
        <strong>${category.category}</strong>
        <span class="insight-tone ${typeof category.limit === 'number' && category.overBy > 0 ? 'warning' : 'neutral'}">${riskLabel}</span>
      </div>
      <p class="insight-item-detail">Spent ${formatCurrency(category.spent)} so far. Forecast ${formatCurrency(category.projected)} by month-end.</p>
    `;
    forecastListEl.appendChild(card);
  });
}

async function apiFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    payload = responseText;
  }

  if (!response.ok) {
    const message = typeof payload === 'object' && payload
      ? payload.error || 'Something went wrong'
      : 'Backend returned an unexpected response. Check that the local API is running on http://localhost:3001.';
    const failure = new Error(message);
    failure.status = response.status;
    throw failure;
  }

  if (typeof payload === 'string') {
    throw new Error('Backend returned HTML instead of JSON. Make sure the API is running on http://localhost:3001.');
  }

  return payload;
}

function updateBudgetWarning() {
  const budget = parseFloat(localStorage.getItem(getBudgetKey()) || 0);
  const monthlyExpenses = getCurrentMonthExpenses();
  const monthTotal = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  if (budget <= 0) {
    budgetProgressText.textContent = 'No budget saved yet.';
    budgetProgressFill.style.width = '0%';
    budgetProgressFill.className = '';
    budgetWarning.classList.add('hidden');
    return;
  }

  const progress = Math.min((monthTotal / budget) * 100, 100);
  budgetProgressFill.style.width = `${progress}%`;
  budgetProgressFill.className = progress >= 100 ? 'danger' : progress >= 80 ? 'warning' : 'safe';

  const remaining = budget - monthTotal;
  if (remaining >= 0) {
    budgetProgressText.textContent = `${formatCurrency(monthTotal)} used of ${formatCurrency(budget)}. ${formatCurrency(remaining)} left this month.`;
    budgetWarning.classList.add('hidden');
  } else {
    budgetProgressText.textContent = `${formatCurrency(monthTotal)} used of ${formatCurrency(budget)}. Overspent by ${formatCurrency(Math.abs(remaining))}.`;
    budgetWarning.classList.remove('hidden');
  }
}

saveBudgetBtn.addEventListener('click', () => {
  const value = parseFloat(budgetInput.value);
  if (isNaN(value) || value < 0) {
    alert('Enter a valid budget.');
    return;
  }

  localStorage.setItem(getBudgetKey(), value);
  alert('Monthly budget saved.');
  updateBudgetWarning();
});

saveCategoryBudgetBtn.addEventListener('click', async () => {
  const category = categoryBudgetCategoryEl.value;
  const monthlyLimit = parseFloat(categoryBudgetAmountEl.value);

  if (Number.isNaN(monthlyLimit) || monthlyLimit < 0) {
    alert('Enter a valid category budget.');
    return;
  }

  try {
    const budget = await apiFetch(`${CATEGORY_BUDGETS_URL}/${encodeURIComponent(category)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyLimit })
    });

    const index = categoryBudgets.findIndex(item => item.category === budget.category);
    if (index === -1) {
      categoryBudgets.push(budget);
    } else {
      categoryBudgets[index] = budget;
    }

    categoryBudgetAmountEl.value = '';
    renderCategoryBudgets();
    await Promise.all([loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

async function loadExpenses() {
  try {
    expenses = await apiFetch(API_URL);
    renderExpenses();
  } catch (error) {
    console.error('Failed to load expenses', error);
    if (error.status === 401) {
      await logout(false);
      return;
    }
    reportOutput.textContent = 'Could not connect to the backend. Start the local API and refresh.';
  }
}

async function loadCategoryBudgets() {
  try {
    categoryBudgets = await apiFetch(CATEGORY_BUDGETS_URL);
    renderCategoryBudgets();
  } catch (error) {
    console.error('Failed to load category budgets', error);
  }
}

async function loadAnomalies() {
  try {
    anomalies = await apiFetch(ANOMALIES_URL);
    renderAnomalies();
  } catch (error) {
    console.error('Failed to load anomalies', error);
  }
}

async function loadInsights() {
  try {
    insights = await apiFetch(INSIGHTS_URL);
    renderInsights();
  } catch (error) {
    console.error('Failed to load insights', error);
  }
}

async function loadForecast() {
  try {
    forecast = await apiFetch(FORECAST_URL);
    renderForecast();
  } catch (error) {
    console.error('Failed to load forecast', error);
  }
}

async function addExpenseBackend(expense) {
  try {
    const savedExpense = await apiFetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    expenses.push(savedExpense);
    renderExpenses();
    await Promise.all([loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function updateExpenseBackend(id, expense) {
  try {
    const updatedExpense = await apiFetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    const index = expenses.findIndex(item => item.id === id);
    if (index !== -1) expenses[index] = updatedExpense;
    renderExpenses();
    await Promise.all([loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function deleteExpenseBackend(id) {
  if (!confirm('Delete this expense?')) return;

  try {
    await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
    expenses = expenses.filter(expense => expense.id !== id);
    renderExpenses();
    await Promise.all([loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function renderExpenses() {
  tbody.innerHTML = '';

  const filteredExpenses = getSortedExpenses(getFilteredExpenses());
  tableStatusEl.textContent = `${filteredExpenses.length} record${filteredExpenses.length === 1 ? '' : 's'}`;

  filteredExpenses.forEach(expense => {
    const safeNote = expense.note ? escapeHtml(expense.note) : 'No note added';
    const recurringLabel = expense.recurring ? 'Recurring' : 'One-time';
    const recurringClass = expense.recurring ? 'status-badge recurring' : 'status-badge one-time';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="expense-main">
          <strong>${formatCurrency(expense.amount)}</strong>
          <div class="expense-meta">
            <span class="category-pill">${escapeHtml(expense.category)}</span>
            <span class="expense-note">${safeNote}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="timing-stack">
          <strong>${formatDisplayDate(expense.date)}</strong>
          <span class="summary-note">${formatLongDate(expense.date)}</span>
        </div>
      </td>
      <td>
        <span class="${recurringClass}">${recurringLabel}</span>
      </td>
      <td class="action-cell">
        <button class="action-btn edit-btn" onclick="startEditExpense('${expense.id}')">Edit</button>
        <button class="action-btn delete-btn" onclick="deleteExpenseBackend('${expense.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  if (!filteredExpenses.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="4" class="empty-state">No expenses match the current filters.</td>';
    tbody.appendChild(emptyRow);
  }

  updateSummaryAndChart();
  updateBudgetWarning();
  renderCategoryBudgets();
}

function updateSummaryAndChart() {
  const totalSpent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthExpenses = getCurrentMonthExpenses();
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const averageExpense = expenses.length ? totalSpent / expenses.length : 0;

  totalEl.textContent = formatCurrency(totalSpent);
  totalCaptionEl.textContent = `${expenses.length} expense${expenses.length === 1 ? '' : 's'} recorded`;

  monthTotalEl.textContent = formatCurrency(monthTotal);
  monthCaptionEl.textContent = monthExpenses.length
    ? `${monthExpenses.length} expense${monthExpenses.length === 1 ? '' : 's'} this month`
    : 'No spending recorded yet';

  averageExpenseEl.textContent = formatCurrency(averageExpense);
  averageCaptionEl.textContent = expenses.length
    ? 'Based on all recorded entries'
    : 'Add your first expense to see averages';

  heroMonthTotalEl.textContent = formatCurrency(monthTotal);
  heroMonthMessageEl.textContent = monthExpenses.length
    ? `You are tracking ${monthExpenses.length} expense${monthExpenses.length === 1 ? '' : 's'} this month.`
    : 'Start adding expenses to unlock insights.';

  const categoryTotals = expenses.reduce((map, expense) => {
    map[expense.category] = (map[expense.category] || 0) + Number(expense.amount);
    return map;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length) {
    topCatEl.textContent = sortedCategories[0][0];
    topCategoryCaptionEl.textContent = `${formatCurrency(sortedCategories[0][1])} spent in this category`;
  } else {
    topCatEl.textContent = '-';
    topCategoryCaptionEl.textContent = 'Your highest spend area';
  }

  const sortedByDate = getSortedExpenses(expenses);
  const recentExpense = sortedByDate[0];
  recentExpenseEl.textContent = recentExpense
    ? `${recentExpense.category} | ${formatCurrency(recentExpense.amount)} on ${formatDisplayDate(recentExpense.date)}`
    : '-';

  const largestExpense = expenses.reduce((largest, current) => {
    if (!largest || Number(current.amount) > Number(largest.amount)) return current;
    return largest;
  }, null);
  largestExpenseEl.textContent = largestExpense
    ? `${largestExpense.category} | ${formatCurrency(largestExpense.amount)}`
    : '-';

  if (monthExpenses.length) {
    const now = new Date();
    const daysElapsed = Math.max(now.getDate(), 1);
    dailyAverageEl.textContent = `${formatCurrency(monthTotal / daysElapsed)} / day`;
  } else {
    dailyAverageEl.textContent = 'Rs 0.00 / day';
  }

  const labels = sortedCategories.map(([category]) => category);
  const data = sortedCategories.map(([, amount]) => amount);
  const colors = labels.map((_, index) => `hsl(${index * 55 + 10}, 75%, 58%)`);
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = colors;
    categoryChart.update();
    return;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      cutout: '62%'
    }
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  const amount = parseFloat(amountEl.value);
  const category = categoryEl.value;
  const date = dateEl.value;
  const note = noteEl.value.trim();
  const recurring = recurringEl.checked;

  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount.');
    return;
  }

  if (!date) {
    alert('Please select a date.');
    return;
  }

  if (new Date(date) > new Date()) {
    alert('Date cannot be in the future.');
    return;
  }

  const expenseData = { id: editId || generateId(), amount, category, date, note, recurring };

  if (editId) {
    await updateExpenseBackend(editId, expenseData);
    cancelEdit();
    return;
  }

  await addExpenseBackend(expenseData);
  form.reset();
  dateEl.valueAsDate = new Date();
  recurringEl.checked = false;
  amountEl.focus();
});

function cancelEdit() {
  editId = null;
  form.reset();
  dateEl.valueAsDate = new Date();
  recurringEl.checked = false;
  saveBtn.textContent = 'Add Expense';
  cancelEditBtn.classList.add('hidden');
  amountEl.focus();
}

cancelEditBtn.addEventListener('click', cancelEdit);

function startEditExpense(id) {
  const expense = expenses.find(item => item.id === id);
  if (!expense) return;

  editId = id;
  amountEl.value = expense.amount;
  categoryEl.value = expense.category;
  dateEl.value = expense.date;
  noteEl.value = expense.note || '';
  recurringEl.checked = Boolean(expense.recurring);
  saveBtn.textContent = 'Save Changes';
  cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

searchNoteInput.addEventListener('input', renderExpenses);
filterCategorySelect.addEventListener('change', renderExpenses);
filterStartDate.addEventListener('change', renderExpenses);
filterEndDate.addEventListener('change', renderExpenses);

generateReportBtn.addEventListener('click', () => {
  const monthValue = reportMonthInput.value;
  if (!monthValue) {
    alert('Select a month.');
    return;
  }

  const [year, month] = monthValue.split('-').map(Number);
  const monthlyExpenses = expenses.filter(expense => {
    const date = new Date(expense.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  if (!monthlyExpenses.length) {
    reportOutput.textContent = 'No expenses for the selected month.';
    return;
  }

  const total = monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const categoryTotals = monthlyExpenses.reduce((map, expense) => {
    map[expense.category] = (map[expense.category] || 0) + Number(expense.amount);
    return map;
  }, {});

  let reportText = `Monthly Report for ${month}/${year}\n\n`;
  reportText += `Total Spent: ${formatCurrency(total)}\n`;
  reportText += `Entries: ${monthlyExpenses.length}\n\n`;
  reportText += 'Breakdown by Category:\n';

  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      reportText += `- ${category}: ${formatCurrency(amount)}\n`;
    });

  reportOutput.textContent = reportText;
});

function downloadFile(content, type, fileName) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatCsvDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

exportCsvBtn.addEventListener('click', () => {
  if (!expenses.length) {
    alert('No expenses to export!');
    return;
  }

  const rows = [
    ['Amount', 'Category', 'Date', 'Note', 'Recurring'],
    ...expenses.map(expense => [
      Number(expense.amount).toFixed(2),
      expense.category,
      formatCsvDate(expense.date),
      expense.note || '',
      expense.recurring ? 'Yes' : 'No'
    ])
  ];
  const csvContent = rows
    .map(row => row.map(escapeCsvValue).join(','))
    .join('\n');

  downloadFile(csvContent, 'text/csv;charset=utf-8;', 'expenses_export.csv');
});

exportJsonBtn.addEventListener('click', () => {
  if (!expenses.length) {
    alert('No expenses to export!');
    return;
  }

  downloadFile(JSON.stringify(expenses, null, 2), 'application/json', 'expenses_backup.json');
});

importBtn.addEventListener('click', () => importInput.click());

importInput.addEventListener('change', event => {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = loadEvent => {
    try {
      const importedData = JSON.parse(loadEvent.target.result);
      const isValid = Array.isArray(importedData)
        && importedData.every(expense => expense.amount && expense.category && expense.date);

      if (!isValid) {
        alert('Invalid JSON format.');
        return;
      }

      expenses = importedData.map(expense => ({ ...expense, id: generateId() }));
      renderExpenses();
      alert('Imported successfully into your current session. Use Add/Save actions to persist new changes.');
    } catch {
      alert('Failed to read JSON file.');
    }
  };

  reader.readAsText(file);
  importInput.value = '';
});

authToggleBtn.addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'login' : 'signup';
  updateAuthMode();
});

themeToggleBtn.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearAuthMessage();

  const payload = {
    email: authEmailEl.value.trim(),
    password: authPasswordEl.value
  };

  if (authMode === 'signup') {
    payload.name = authNameEl.value.trim();
  }

  try {
    const endpoint = authMode === 'signup' ? '/auth/signup' : '/auth/login';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    let data = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      throw new Error('Could not reach the local auth API. Start the backend on http://localhost:3001 and try again.');
    }

    if (!response.ok) {
      throw new Error(data?.error || 'Authentication failed');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    currentUser = data.user;
    authForm.reset();
    showAppView();
    budgetInput.value = localStorage.getItem(getBudgetKey()) || '';
    await Promise.all([loadExpenses(), loadCategoryBudgets(), loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

async function restoreSession() {
  const token = getAuthToken();
  if (!token) {
    showAuthView();
    return;
  }

  try {
    const data = await apiFetch(`${API_BASE_URL}/auth/me`);
    currentUser = data.user;
    showAppView();
    budgetInput.value = localStorage.getItem(getBudgetKey()) || '';
    await Promise.all([loadExpenses(), loadCategoryBudgets(), loadAnomalies(), loadInsights(), loadForecast()]);
  } catch (error) {
    console.error(error);
    await logout(false);
  }
}

async function logout(shouldCallApi = true) {
  if (shouldCallApi && getAuthToken()) {
    try {
      await apiFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch (error) {
      console.error(error);
    }
  }

  currentUser = null;
  expenses = [];
  categoryBudgets = [];
  anomalies = [];
  insights = [];
  forecast = null;
  editId = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  budgetInput.value = '';
  categoryBudgetAmountEl.value = '';
  tbody.innerHTML = '';
  categoryBudgetListEl.innerHTML = '';
  anomalyListEl.innerHTML = '';
  insightsListEl.innerHTML = '';
  forecastSummaryEl.innerHTML = '';
  forecastListEl.innerHTML = '';
  showAuthView();
}

logoutBtn.addEventListener('click', async () => {
  await logout(true);
});

window.startEditExpense = startEditExpense;
window.deleteExpenseBackend = deleteExpenseBackend;

(async function init() {
  dateEl.valueAsDate = new Date();
  reportMonthInput.value = new Date().toISOString().slice(0, 7);
  initializeTheme();
  updateAuthMode();
  await restoreSession();
})();
