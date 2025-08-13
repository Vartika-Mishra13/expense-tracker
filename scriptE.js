// const form = document.getElementById('expense-form');
// const amountEl = document.getElementById('amount');
// const categoryEl = document.getElementById('category');
// const dateEl = document.getElementById('date');
// const noteEl = document.getElementById('note');
// const tbody = document.getElementById('expense-tbody');
// const totalEl = document.getElementById('total');
// const topCatEl = document.getElementById('top-category');
// const saveBtn = document.getElementById('save-btn');
// const cancelEditBtn = document.getElementById('cancel-edit');

// const budgetInput = document.getElementById('budget-input');
// const saveBudgetBtn = document.getElementById('save-budget-btn');
// const budgetWarning = document.getElementById('budget-warning');

// const searchNoteInput = document.getElementById('search-note');
// const filterCategorySelect = document.getElementById('filter-category');
// const filterStartDate = document.getElementById('filter-start');
// const filterEndDate = document.getElementById('filter-end');

// const reportMonthInput = document.getElementById('report-month');
// const generateReportBtn = document.getElementById('generate-report-btn');
// const reportOutput = document.getElementById('report-output');

// const exportBtn = document.getElementById('export-btn');
// const importBtn = document.getElementById('import-btn');
// const importInput = document.getElementById('import-input');

// let expenses = [];
// let editId = null;
// let categoryChart = null;

// const LS_KEY = 'expenses';
// const BUDGET_KEY = 'monthlyBudget';

// // ===== Utilities =====
// const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// const loadFromLocalStorage = (key, fallback = []) => {
//   try {
//     const raw = localStorage.getItem(key);
//     return raw ? JSON.parse(raw) : fallback;
//   } catch (e) {
//     console.error(`Error reading ${key} from localStorage`, e);
//     return fallback;
//   }
// };

// const saveToLocalStorage = (key, data) => {
//   try {
//     localStorage.setItem(key, JSON.stringify(data));
//   } catch (e) {
//     console.error(`Error saving ${key} to localStorage`, e);
//   }
// };

// // ===== Budget Handling =====
// function checkBudgetWarning() {
//   const budget = parseFloat(loadFromLocalStorage(BUDGET_KEY, 0));
//   if (budget <= 0) {
//     budgetWarning.style.display = 'none';
//     return;
//   }
//   const now = new Date();
//   const currentMonth = now.getMonth();
//   const currentYear = now.getFullYear();

//   // Sum expenses for this month
//   const monthlyTotal = expenses.reduce((sum, e) => {
//     const d = new Date(e.date);
//     return (d.getMonth() === currentMonth && d.getFullYear() === currentYear) ? sum + Number(e.amount) : sum;
//   }, 0);

//   if (monthlyTotal > budget) {
//     budgetWarning.style.display = 'block';
//   } else {
//     budgetWarning.style.display = 'none';
//   }
// }

// saveBudgetBtn.addEventListener('click', () => {
//   const val = parseFloat(budgetInput.value);
//   if (isNaN(val) || val < 0) {
//     alert('Enter a valid budget.');
//     return;
//   }
//   saveToLocalStorage(BUDGET_KEY, val);
//   alert('Monthly budget saved.');
//   checkBudgetWarning();
// });

// // ===== CRUD =====
// function addExpense(exp) {
//   expenses.push(exp);
//   saveToLocalStorage(LS_KEY, expenses);
//   renderExpenses();
// }

// function deleteExpense(id) {
//   if (!confirm('Delete this expense?')) return;
//   expenses = expenses.filter(e => e.id !== id);
//   saveToLocalStorage(LS_KEY, expenses);
//   renderExpenses();
// }

// function startEditExpense(id) {
//   const exp = expenses.find(e => e.id === id);
//   if (!exp) return;
//   editId = id;
//   amountEl.value = exp.amount;
//   categoryEl.value = exp.category;
//   dateEl.value = exp.date;
//   noteEl.value = exp.note || '';
//   saveBtn.textContent = 'Save Changes';
//   cancelEditBtn.classList.remove('hidden');
//   window.scrollTo({ top: 0, behavior: 'smooth' });
// }

// function cancelEdit() {
//   editId = null;
//   form.reset();
//   dateEl.valueAsDate = new Date();
//   saveBtn.textContent = 'Add Expense';
//   cancelEditBtn.classList.add('hidden');
//   amountEl.focus();
// }

// // ===== Render =====
// function renderExpenses() {
//   tbody.innerHTML = '';

//   // Apply filters
//   const filteredExpenses = expenses.filter(exp => {
//     // Search note
//     const searchText = searchNoteInput.value.trim().toLowerCase();
//     if (searchText && !exp.note?.toLowerCase().includes(searchText)) return false;

//     // Filter category
//     if (filterCategorySelect.value && exp.category !== filterCategorySelect.value) return false;

//     // Date range filter
//     if (filterStartDate.value) {
//       const start = new Date(filterStartDate.value);
//       const expDate = new Date(exp.date);
//       if (expDate < start) return false;
//     }
//     if (filterEndDate.value) {
//       const end = new Date(filterEndDate.value);
//       const expDate = new Date(exp.date);
//       if (expDate > end) return false;
//     }
//     return true;
//   });

//   filteredExpenses
//     .slice()
//     .sort((a, b) => new Date(b.date) - new Date(a.date))
//     .forEach(exp => {
//       const tr = document.createElement('tr');
//       tr.innerHTML = `
//         <td>₹${Number(exp.amount).toFixed(2)}</td>
//         <td>${exp.category}</td>
//         <td>${new Date(exp.date).toLocaleDateString()}</td>
//         <td>${exp.note || '-'}</td>
//         <td>
//           <button class="action-btn edit-btn" onclick="startEditExpense('${exp.id}')">Edit</button>
//           <button class="action-btn delete-btn" onclick="deleteExpense('${exp.id}')">Delete</button>
//         </td>
//       `;
//       tbody.appendChild(tr);
//     });

//   updateSummaryAndChart();
//   checkBudgetWarning();
// }

// function updateSummaryAndChart() {
//   const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
//   totalEl.textContent = `₹${total.toFixed(2)}`;

//   const catMap = {};
//   expenses.forEach(e => {
//     catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
//   });

//   const entries = Object.entries(catMap);
//   topCatEl.textContent = entries.length
//     ? `${entries.sort((a, b) => b[1] - a[1])[0][0]} (₹${entries[0][1].toFixed(2)})`
//     : '-';

//   updateChart(catMap);
// }

// function updateChart(catMap) {
//   const labels = Object.keys(catMap);
//   const data = Object.values(catMap);
//   const colors = labels.map((_, i) => `hsl(${i * 50}, 70%, 60%)`);

//   const ctx = document.getElementById('categoryChart').getContext('2d');

//   if (categoryChart) {
//     categoryChart.data.labels = labels;
//     categoryChart.data.datasets[0].data = data;
//     categoryChart.data.datasets[0].backgroundColor = colors;
//     categoryChart.update();
//     return;
//   }

//   categoryChart = new Chart(ctx, {
//     type: 'pie',
//     data: {
//       labels,
//       datasets: [{
//         data,
//         borderWidth: 1,
//         backgroundColor: colors
//       }]
//     },
//     options: {
//       plugins: { legend: { position: 'bottom' } }
//     }
//   });
// }

// // ===== Form Handling =====
// form.addEventListener('submit', e => {
//   e.preventDefault();
//   const amount = parseFloat(amountEl.value);
//   const category = categoryEl.value;
//   const date = dateEl.value;
//   const note = noteEl.value.trim();

//   if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount.');
//   if (!date) return alert('Please select a date.');
//   if (new Date(date) > new Date()) return alert('Date cannot be in the future.');

//   if (editId) {
//     const idx = expenses.findIndex(x => x.id === editId);
//     if (idx !== -1) {
//       expenses[idx] = { ...expenses[idx], amount, category, date, note };
//       saveToLocalStorage(LS_KEY, expenses);
//       renderExpenses();
//       cancelEdit();
//     }
//   } else {
//     addExpense({ id: generateId(), amount, category, date, note });
//     form.reset();
//     dateEl.valueAsDate = new Date();
//     amountEl.focus();
//   }
// });

// cancelEditBtn.addEventListener('click', cancelEdit);

// // ===== Filters Handling =====
// searchNoteInput.addEventListener('input', renderExpenses);
// filterCategorySelect.addEventListener('change', renderExpenses);
// filterStartDate.addEventListener('change', renderExpenses);
// filterEndDate.addEventListener('change', renderExpenses);

// // ===== Monthly Report =====
// generateReportBtn.addEventListener('click', () => {
//   const monthVal = reportMonthInput.value;
//   if (!monthVal) {
//     alert('Please select a month to generate report.');
//     return;
//   }
//   const [year, month] = monthVal.split('-').map(Number);

//   const monthlyExpenses = expenses.filter(e => {
//     const d = new Date(e.date);
//     return d.getFullYear() === year && (d.getMonth() + 1) === month;
//   });

//   if (!monthlyExpenses.length) {
//     reportOutput.textContent = 'No expenses for the selected month.';
//     return;
//   }

//   const total = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

//   // Group by category
//   const categoryTotals = {};
//   monthlyExpenses.forEach(e => {
//     categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
//   });

//   let reportText = `Monthly Report for ${month}/${year}\n\n`;
//   reportText += `Total Spent: ₹${total.toFixed(2)}\n\n`;
//   reportText += `Breakdown by Category:\n`;
//   for (const [cat, amt] of Object.entries(categoryTotals)) {
//     reportText += `- ${cat}: ₹${amt.toFixed(2)}\n`;
//   }

//   reportOutput.textContent = reportText;
// });

// // ===== Export & Import =====
// exportBtn.addEventListener('click', () => {
//   if (!expenses.length) {
//     alert('No expenses to export!');
//     return;
//   }
//   const dataStr = JSON.stringify(expenses, null, 2);
//   const blob = new Blob([dataStr], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement('a');
//   a.href = url;
//   a.download = 'expenses_backup.json';
//   a.click();

//   URL.revokeObjectURL(url);
// });

// importBtn.addEventListener('click', () => {
//   importInput.click();
// });

// importInput.addEventListener('change', (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   const reader = new FileReader();
//   reader.onload = (event) => {
//     try {
//       const importedData = JSON.parse(event.target.result);
//       if (Array.isArray(importedData)) {
//         if (importedData.every(exp => exp.id && exp.amount && exp.category && exp.date)) {
//           expenses = importedData;
//           saveToLocalStorage(LS_KEY, expenses);
//           renderExpenses();
//           alert('Expenses imported successfully!');
//         } else {
//           alert('Invalid data format in JSON.');
//         }
//       } else {
//         alert('Invalid JSON file.');
//       }
//     } catch (error) {
//       alert('Failed to read JSON file.');
//     }
//   };
//   reader.readAsText(file);
//   importInput.value = '';
// });

// // ===== Init =====
// (function init() {
//   expenses = loadFromLocalStorage(LS_KEY, []);
//   const savedBudget = loadFromLocalStorage(BUDGET_KEY, 0);
//   budgetInput.value = savedBudget || '';
//   dateEl.valueAsDate = new Date();
//   renderExpenses();
// })();

const form = document.getElementById('expense-form');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const dateEl = document.getElementById('date');
const noteEl = document.getElementById('note');
const recurringEl = document.getElementById('recurring');
const tbody = document.getElementById('expense-tbody');
const totalEl = document.getElementById('total');
const topCatEl = document.getElementById('top-category');
const saveBtn = document.getElementById('save-btn');
const cancelEditBtn = document.getElementById('cancel-edit');

const budgetInput = document.getElementById('budget-input');
const saveBudgetBtn = document.getElementById('save-budget-btn');
const budgetWarning = document.getElementById('budget-warning');

const searchNoteInput = document.getElementById('search-note');
const filterCategorySelect = document.getElementById('filter-category');
const filterStartDate = document.getElementById('filter-start');
const filterEndDate = document.getElementById('filter-end');

const reportMonthInput = document.getElementById('report-month');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportOutput = document.getElementById('report-output');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');

let expenses = [];
let editId = null;
let categoryChart = null;

const BUDGET_KEY = 'monthlyBudget';
const API_URL = 'http://localhost:3000/expenses';

// ===== Utilities =====
const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ===== Budget Handling =====
function checkBudgetWarning() {
  const budget = parseFloat(localStorage.getItem(BUDGET_KEY) || 0);
  if (budget <= 0) {
    budgetWarning.style.display = 'none';
    return;
  }
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyTotal = expenses.reduce((sum, e) => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear ? sum + Number(e.amount) : sum;
  }, 0);

  budgetWarning.style.display = monthlyTotal > budget ? 'block' : 'none';
}

saveBudgetBtn.addEventListener('click', () => {
  const val = parseFloat(budgetInput.value);
  if (isNaN(val) || val < 0) return alert('Enter a valid budget.');
  localStorage.setItem(BUDGET_KEY, val);
  alert('Monthly budget saved.');
  checkBudgetWarning();
});

// ===== Fetch / CRUD =====
async function loadExpenses() {
  try {
    expenses = await fetch(API_URL).then(r => r.json());
    renderExpenses();
  } catch (e) {
    console.error('Failed to load expenses', e);
  }
}

async function addExpenseBackend(exp) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exp)
    });
    const saved = await res.json();
    expenses.push(saved);
    renderExpenses();
  } catch (e) { console.error(e); }
}

async function updateExpenseBackend(id, exp) {
  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exp)
    });
    const updated = await res.json();
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) expenses[idx] = updated;
    renderExpenses();
  } catch (e) { console.error(e); }
}

async function deleteExpenseBackend(id) {
  if (!confirm('Delete this expense?')) return;
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    expenses = expenses.filter(e => e.id !== id);
    renderExpenses();
  } catch (e) { console.error(e); }
}

// ===== Render =====
function renderExpenses() {
  tbody.innerHTML = '';

  const filteredExpenses = expenses.filter(exp => {
    const searchText = searchNoteInput.value.trim().toLowerCase();
    if (searchText && !exp.note?.toLowerCase().includes(searchText)) return false;
    if (filterCategorySelect.value && exp.category !== filterCategorySelect.value) return false;
    if (filterStartDate.value && new Date(exp.date) < new Date(filterStartDate.value)) return false;
    if (filterEndDate.value && new Date(exp.date) > new Date(filterEndDate.value)) return false;
    return true;
  });

  filteredExpenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>₹${Number(exp.amount).toFixed(2)}</td>
        <td>${exp.category}</td>
        <td>${new Date(exp.date).toLocaleDateString()}</td>
        <td>${exp.note || '-'}</td>
        <td>${exp.recurring ? '✔️' : '-'}</td>
        <td>
          <button class="action-btn edit-btn" onclick="startEditExpense('${exp.id}')">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteExpenseBackend('${exp.id}')">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  updateSummaryAndChart();
  checkBudgetWarning();
}

function updateSummaryAndChart() {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  totalEl.textContent = `₹${total.toFixed(2)}`;

  const catMap = {};
  expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount); });

  const entries = Object.entries(catMap);
  topCatEl.textContent = entries.length
    ? `${entries.sort((a, b) => b[1] - a[1])[0][0]} (₹${entries[0][1].toFixed(2)})`
    : '-';

  const labels = Object.keys(catMap);
  const data = Object.values(catMap);
  const colors = labels.map((_, i) => `hsl(${i * 50}, 70%, 60%)`);
  const ctx = document.getElementById('categoryChart').getContext('2d');

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = colors;
    categoryChart.update();
  } else {
    categoryChart = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
  }
}

// ===== Form Handling =====
form.addEventListener('submit', async e => {
  e.preventDefault();
  const amount = parseFloat(amountEl.value);
  const category = categoryEl.value;
  const date = dateEl.value;
  const note = noteEl.value.trim();
  const recurring = recurringEl.checked;

  if (isNaN(amount) || amount <= 0) return alert('Enter a valid amount.');
  if (!date) return alert('Please select a date.');
  if (new Date(date) > new Date()) return alert('Date cannot be in the future.');

  const expenseData = { id: editId || generateId(), amount, category, date, note, recurring };

  if (editId) {
    await updateExpenseBackend(editId, expenseData);
    cancelEdit();
  } else {
    await addExpenseBackend(expenseData);
    form.reset();
    dateEl.valueAsDate = new Date();
    recurringEl.checked = false;
    amountEl.focus();
  }
});

cancelEditBtn.addEventListener('click', () => {
  editId = null;
  form.reset();
  dateEl.valueAsDate = new Date();
  recurringEl.checked = false;
  saveBtn.textContent = 'Add Expense';
  cancelEditBtn.classList.add('hidden');
  amountEl.focus();
});

function startEditExpense(id) {
  const exp = expenses.find(e => e.id === id);
  if (!exp) return;
  editId = id;
  amountEl.value = exp.amount;
  categoryEl.value = exp.category;
  dateEl.value = exp.date;
  noteEl.value = exp.note || '';
  recurringEl.checked = !!exp.recurring;
  saveBtn.textContent = 'Save Changes';
  cancelEditBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Filters Handling =====
searchNoteInput.addEventListener('input', renderExpenses);
filterCategorySelect.addEventListener('change', renderExpenses);
filterStartDate.addEventListener('change', renderExpenses);
filterEndDate.addEventListener('change', renderExpenses);

// ===== Monthly Report =====
generateReportBtn.addEventListener('click', () => {
  const monthVal = reportMonthInput.value;
  if (!monthVal) return alert('Select a month.');
  const [year, month] = monthVal.split('-').map(Number);
  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  if (!monthlyExpenses.length) { reportOutput.textContent = 'No expenses for the selected month.'; return; }

  const total = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const categoryTotals = {};
  monthlyExpenses.forEach(e => categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount));

  let reportText = `Monthly Report for ${month}/${year}\n\nTotal Spent: ₹${total.toFixed(2)}\n\nBreakdown by Category:\n`;
  for (const [cat, amt] of Object.entries(categoryTotals)) reportText += `- ${cat}: ₹${amt.toFixed(2)}\n`;
  reportOutput.textContent = reportText;
});

// ===== Export / Import (Frontend only) =====
exportBtn.addEventListener('click', () => {
  if (!expenses.length) return alert('No expenses to export!');
  const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'expenses_backup.json'; a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData) && importedData.every(exp => exp.amount && exp.category && exp.date)) {
        expenses = importedData;
        renderExpenses();
        alert('Imported successfully!');
      } else alert('Invalid JSON format.');
    } catch { alert('Failed to read JSON file.'); }
  };
  reader.readAsText(file);
  importInput.value = '';
});

// ===== Init =====
(async function init() {
  dateEl.valueAsDate = new Date();
  const savedBudget = localStorage.getItem(BUDGET_KEY);
  budgetInput.value = savedBudget || '';
  await loadExpenses();
})();
