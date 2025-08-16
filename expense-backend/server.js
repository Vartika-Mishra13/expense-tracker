// server.js
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = 'data.json';

// Helper: load data
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE);
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// Helper: save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all expenses
app.get('/expenses', (req, res) => {
  const expenses = loadData();
  res.json(expenses);
});

// POST new expense
app.post('/expenses', (req, res) => {
  const expenses = loadData();
  const newExp = req.body;
  if (!newExp.id || !newExp.amount || !newExp.category || !newExp.date) {
    return res.status(400).json({ error: 'Invalid expense data' });
  }
  expenses.push(newExp);
  saveData(expenses);
  res.json(newExp);
});

// PUT update expense
app.put('/expenses/:id', (req, res) => {
  const expenses = loadData();
  const idx = expenses.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Expense not found' });

  expenses[idx] = { ...expenses[idx], ...req.body };
  saveData(expenses);
  res.json(expenses[idx]);
});

// DELETE expense
app.delete('/expenses/:id', (req, res) => {
  let expenses = loadData();
  expenses = expenses.filter(e => e.id !== req.params.id);
  saveData(expenses);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

