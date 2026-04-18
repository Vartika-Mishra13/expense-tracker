const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/expense_tracker';

app.use(cors());
app.use(express.json());

const EXPENSES_FILE = path.join(__dirname, 'data.json');
const USERS_FILE = path.join(__dirname, 'users.json');

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  passwordSalt: { type: String, required: true },
  tokens: { type: [String], default: [] }
}, { timestamps: true });

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  note: { type: String, default: '' },
  recurring: { type: Boolean, default: false }
}, { timestamps: true });

const categoryBudgetSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  category: { type: String, required: true, trim: true },
  monthlyLimit: { type: Number, required: true, min: 0 }
}, { timestamps: true });

categoryBudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const CategoryBudget = mongoose.model('CategoryBudget', categoryBudgetSchema);

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildAnomalies(expenses, budgets) {
  const anomalies = [];
  const duplicateMap = new Map();
  const categoryHistory = new Map();
  const budgetMap = new Map(budgets.map(budget => [budget.category, Number(budget.monthlyLimit)]));
  const monthlyCategorySpend = new Map();

  const sortedExpenses = expenses
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.createdAt) - new Date(b.createdAt));

  for (const expense of sortedExpenses) {
    const amount = Number(expense.amount);
    const category = expense.category;
    const monthKey = getMonthKey(expense.date);
    const history = categoryHistory.get(category) || [];

    if (history.length >= 3) {
      const average = history.reduce((sum, value) => sum + value, 0) / history.length;
      if (amount >= average * 1.75 && amount - average >= 250) {
        anomalies.push({
          expenseId: expense.id,
          type: 'spike',
          severity: amount >= average * 2.5 ? 'high' : 'medium',
          title: `${category} spike detected`,
          description: `${category} expense of Rs ${amount.toFixed(2)} is much higher than your usual Rs ${average.toFixed(2)}.`
        });
      }
    }

    const duplicateKey = [
      category,
      amount.toFixed(2),
      expense.date,
      String(expense.note || '').trim().toLowerCase()
    ].join('|');

    if (duplicateMap.has(duplicateKey)) {
      anomalies.push({
        expenseId: expense.id,
        type: 'duplicate',
        severity: 'medium',
        title: 'Possible duplicate expense',
        description: `This looks similar to another ${category} expense with the same amount and date.`
      });
    } else {
      duplicateMap.set(duplicateKey, expense.id);
    }

    if (monthKey) {
      const budgetKey = `${monthKey}|${category}`;
      const nextSpend = (monthlyCategorySpend.get(budgetKey) || 0) + amount;
      monthlyCategorySpend.set(budgetKey, nextSpend);

      const monthlyLimit = budgetMap.get(category);
      if (typeof monthlyLimit === 'number' && nextSpend > monthlyLimit) {
        anomalies.push({
          expenseId: expense.id,
          type: 'budget',
          severity: nextSpend > monthlyLimit * 1.2 ? 'high' : 'medium',
          title: `${category} budget crossed`,
          description: `This pushed ${category} spending to Rs ${nextSpend.toFixed(2)} against a monthly budget of Rs ${monthlyLimit.toFixed(2)}.`
        });
      }
    }

    history.push(amount);
    categoryHistory.set(category, history.slice(-12));
  }

  const anomalyMap = new Map();
  for (const anomaly of anomalies) {
    const existing = anomalyMap.get(anomaly.expenseId);
    if (!existing) {
      anomalyMap.set(anomaly.expenseId, {
        expenseId: anomaly.expenseId,
        severity: anomaly.severity,
        signals: [anomaly]
      });
      continue;
    }

    existing.signals.push(anomaly);
    if (anomaly.severity === 'high') {
      existing.severity = 'high';
    }
  }

  return Array.from(anomalyMap.values())
    .map(entry => {
      const matchingExpense = expenses.find(expense => expense.id === entry.expenseId);
      return {
        expenseId: entry.expenseId,
        severity: entry.severity,
        expense: matchingExpense ? {
          id: matchingExpense.id,
          amount: Number(matchingExpense.amount),
          category: matchingExpense.category,
          date: matchingExpense.date,
          note: matchingExpense.note || '',
          recurring: Boolean(matchingExpense.recurring)
        } : null,
        signals: entry.signals
      };
    })
    .filter(item => item.expense)
    .sort((a, b) => {
      const severityScore = { high: 2, medium: 1, low: 0 };
      return (
        severityScore[b.severity] - severityScore[a.severity]
        || new Date(b.expense.date) - new Date(a.expense.date)
      );
    })
    .slice(0, 8);
}

function buildInsights(expenses, budgets) {
  const insights = [];
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthlyTotals = new Map();
  const currentMonthExpenses = [];
  const currentMonthCategoryTotals = new Map();
  let weekendSpend = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const monthKey = getMonthKey(expense.date);
    monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + amount);

    if (monthKey !== currentMonthKey) continue;

    currentMonthExpenses.push(expense);
    currentMonthCategoryTotals.set(
      expense.category,
      (currentMonthCategoryTotals.get(expense.category) || 0) + amount
    );

    const date = new Date(expense.date);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      weekendSpend += amount;
    }
  }

  const currentMonthTotal = monthlyTotals.get(currentMonthKey) || 0;
  const previousMonthTotal = monthlyTotals.get(previousMonthKey) || 0;
  if (currentMonthTotal > 0 && previousMonthTotal > 0) {
    const percentChange = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
    insights.push({
      type: 'trend',
      tone: percentChange > 15 ? 'warning' : 'neutral',
      title: percentChange >= 0 ? 'Monthly spending is rising' : 'Monthly spending is easing',
      detail: `${Math.abs(percentChange).toFixed(0)}% ${percentChange >= 0 ? 'higher' : 'lower'} than last month (${previousMonthKey}).`
    });
  }

  const sortedCategories = Array.from(currentMonthCategoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length) {
    const [topCategory, topAmount] = sortedCategories[0];
    const share = currentMonthTotal > 0 ? (topAmount / currentMonthTotal) * 100 : 0;
    insights.push({
      type: 'category',
      tone: share >= 40 ? 'warning' : 'positive',
      title: `${topCategory} is leading this month`,
      detail: `About ${share.toFixed(0)}% of this month's spending is in ${topCategory} (Rs ${topAmount.toFixed(2)}).`
    });
  }

  let riskiestBudget = null;
  for (const budget of budgets) {
    const spent = currentMonthCategoryTotals.get(budget.category) || 0;
    const ratio = budget.monthlyLimit > 0 ? spent / Number(budget.monthlyLimit) : 0;
    if (!riskiestBudget || ratio > riskiestBudget.ratio) {
      riskiestBudget = {
        category: budget.category,
        spent,
        limit: Number(budget.monthlyLimit),
        ratio
      };
    }
  }

  if (riskiestBudget && riskiestBudget.limit > 0) {
    insights.push({
      type: 'budget',
      tone: riskiestBudget.ratio >= 1 ? 'warning' : riskiestBudget.ratio >= 0.8 ? 'warning' : 'positive',
      title: `${riskiestBudget.category} budget pacing`,
      detail: riskiestBudget.ratio >= 1
        ? `You are over budget in ${riskiestBudget.category} by Rs ${(riskiestBudget.spent - riskiestBudget.limit).toFixed(2)}.`
        : `You have used ${(riskiestBudget.ratio * 100).toFixed(0)}% of your ${riskiestBudget.category} budget so far this month.`
    });
  }

  if (currentMonthTotal > 0 && currentMonthExpenses.length >= 3) {
    const weekendShare = (weekendSpend / currentMonthTotal) * 100;
    if (weekendShare >= 45) {
      insights.push({
        type: 'timing',
        tone: 'neutral',
        title: 'Weekend spending stands out',
        detail: `${weekendShare.toFixed(0)}% of this month's spending happened on weekends.`
      });
    }
  }

  if (!insights.length && currentMonthExpenses.length) {
    insights.push({
      type: 'baseline',
      tone: 'positive',
      title: 'Building your spending profile',
      detail: 'Keep logging expenses this month and the tracker will start showing stronger behavior patterns.'
    });
  }

  return insights.slice(0, 4);
}

function buildForecast(expenses, budgets) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysElapsed = Math.max(now.getDate(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const currentMonthExpenses = expenses.filter(expense => getMonthKey(expense.date) === currentMonthKey);
  const currentMonthTotal = currentMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const dailyRunRate = currentMonthTotal / daysElapsed;
  const projectedTotal = dailyRunRate * daysInMonth;

  const categoryTotals = new Map();
  for (const expense of currentMonthExpenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) || 0) + Number(expense.amount)
    );
  }

  const categoryForecasts = Array.from(categoryTotals.entries()).map(([category, spent]) => {
    const projected = (spent / daysElapsed) * daysInMonth;
    const matchingBudget = budgets.find(budget => budget.category === category);
    const limit = matchingBudget ? Number(matchingBudget.monthlyLimit) : null;
    return {
      category,
      spent,
      projected,
      limit,
      overBy: typeof limit === 'number' ? projected - limit : null
    };
  }).sort((a, b) => b.projected - a.projected);

  const riskiestForecast = categoryForecasts
    .filter(item => typeof item.limit === 'number')
    .sort((a, b) => (b.overBy || 0) - (a.overBy || 0))[0] || null;

  const insights = [];
  if (currentMonthTotal > 0) {
    insights.push({
      title: 'Projected month-end spend',
      tone: 'neutral',
      detail: `At your current pace, this month is trending toward Rs ${projectedTotal.toFixed(2)}.`
    });
  } else {
    insights.push({
      title: 'Waiting for current-month data',
      tone: 'neutral',
      detail: 'Add a few expenses this month to unlock a reliable forecast.'
    });
  }

  if (riskiestForecast && (riskiestForecast.overBy || 0) > 0) {
    insights.push({
      title: `${riskiestForecast.category} may overshoot`,
      tone: 'warning',
      detail: `This category is projected to finish near Rs ${riskiestForecast.projected.toFixed(2)}, about Rs ${riskiestForecast.overBy.toFixed(2)} over budget.`
    });
  } else if (categoryForecasts.length) {
    const topForecast = categoryForecasts[0];
    insights.push({
      title: `${topForecast.category} is pacing highest`,
      tone: 'positive',
      detail: `This category is projected to finish near Rs ${topForecast.projected.toFixed(2)} if the current pace continues.`
    });
  }

  const confidence = currentMonthExpenses.length >= 8
    ? 'higher'
    : currentMonthExpenses.length >= 4 ? 'medium' : 'early';

  return {
    daysElapsed,
    daysInMonth,
    currentMonthTotal,
    dailyRunRate,
    projectedTotal,
    confidence,
    categoryForecasts: categoryForecasts.slice(0, 5),
    insights
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

async function findUserByToken(token) {
  return User.findOne({ tokens: token });
}

async function issueToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  await User.updateOne({ id: userId }, { $push: { tokens: token } });
  return token;
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await findUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = sanitizeUser(user);
  req.token = token;
  return next();
}

async function migrateFileDataToMongo() {
  const fileUsers = readJson(USERS_FILE, []);
  const fileExpenses = readJson(EXPENSES_FILE, []);

  let demoUser = await User.findOne({ email: 'demo@local' });

  for (const fileUser of fileUsers) {
    const existingUser = await User.findOne({ email: String(fileUser.email || '').toLowerCase() });
    if (existingUser) {
      if (existingUser.email === 'demo@local') demoUser = existingUser;
      continue;
    }

    const createdUser = await User.create({
      id: fileUser.id || createId('user'),
      name: fileUser.name || 'User',
      email: String(fileUser.email || '').toLowerCase(),
      passwordHash: fileUser.passwordHash,
      passwordSalt: fileUser.passwordSalt,
      tokens: Array.isArray(fileUser.tokens) ? fileUser.tokens : []
    });

    if (createdUser.email === 'demo@local') demoUser = createdUser;
  }

  const hasLegacyExpenses = fileExpenses.some(expense => !expense.userId);
  if (hasLegacyExpenses && !demoUser) {
    const credentials = hashPassword('demo12345');
    demoUser = await User.create({
      id: createId('user'),
      name: 'Demo User',
      email: 'demo@local',
      passwordHash: credentials.hash,
      passwordSalt: credentials.salt,
      tokens: []
    });
    console.log('Created migrated demo user: demo@local / demo12345');
  }

  for (const fileExpense of fileExpenses) {
    const existingExpense = await Expense.findOne({ id: fileExpense.id });
    if (existingExpense) continue;

    await Expense.create({
      id: fileExpense.id || createId('exp'),
      userId: fileExpense.userId || demoUser?.id,
      amount: Number(fileExpense.amount),
      category: fileExpense.category,
      date: fileExpense.date,
      note: fileExpense.note || '',
      recurring: Boolean(fileExpense.recurring)
    });
  }
}

async function bootstrapDatabase() {
  await mongoose.connect(MONGO_URI);
  await migrateFileDataToMongo();
}

app.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const credentials = hashPassword(String(password));
  const newUser = await User.create({
    id: createId('user'),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: credentials.hash,
    passwordSalt: credentials.salt,
    tokens: []
  });

  const token = await issueToken(newUser.id);
  return res.status(201).json({
    token,
    user: sanitizeUser(newUser)
  });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const credentials = hashPassword(String(password || ''), user.passwordSalt);
  if (credentials.hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = await issueToken(user.id);
  return res.json({
    token,
    user: sanitizeUser(user)
  });
});

app.get('/auth/me', authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});

app.post('/auth/logout', authMiddleware, async (req, res) => {
  await User.updateOne({ id: req.user.id }, { $pull: { tokens: req.token } });
  return res.json({ success: true });
});

app.get('/expenses', authMiddleware, async (req, res) => {
  const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).lean();
  return res.json(expenses.map(({ _id, __v, ...expense }) => expense));
});

app.get('/category-budgets', authMiddleware, async (req, res) => {
  const budgets = await CategoryBudget.find({ userId: req.user.id }).sort({ category: 1 }).lean();
  return res.json(budgets.map(({ _id, __v, ...budget }) => budget));
});

app.get('/anomalies', authMiddleware, async (req, res) => {
  const [expenses, budgets] = await Promise.all([
    Expense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).lean(),
    CategoryBudget.find({ userId: req.user.id }).lean()
  ]);

  return res.json(buildAnomalies(expenses, budgets));
});

app.get('/insights', authMiddleware, async (req, res) => {
  const [expenses, budgets] = await Promise.all([
    Expense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).lean(),
    CategoryBudget.find({ userId: req.user.id }).lean()
  ]);

  return res.json(buildInsights(expenses, budgets));
});

app.get('/forecast', authMiddleware, async (req, res) => {
  const [expenses, budgets] = await Promise.all([
    Expense.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 }).lean(),
    CategoryBudget.find({ userId: req.user.id }).lean()
  ]);

  return res.json(buildForecast(expenses, budgets));
});

app.put('/category-budgets/:category', authMiddleware, async (req, res) => {
  const category = String(req.params.category || '').trim();
  const monthlyLimit = Number(req.body?.monthlyLimit);

  if (!category) {
    return res.status(400).json({ error: 'Category is required' });
  }

  if (Number.isNaN(monthlyLimit) || monthlyLimit < 0) {
    return res.status(400).json({ error: 'Monthly limit must be a valid non-negative number' });
  }

  const budget = await CategoryBudget.findOneAndUpdate(
    { userId: req.user.id, category },
    { $set: { monthlyLimit } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();

  const { _id, __v, ...payload } = budget;
  return res.json(payload);
});

app.delete('/category-budgets/:category', authMiddleware, async (req, res) => {
  const category = String(req.params.category || '').trim();
  const deletedBudget = await CategoryBudget.findOneAndDelete({ userId: req.user.id, category });

  if (!deletedBudget) {
    return res.status(404).json({ error: 'Category budget not found' });
  }

  return res.json({ success: true });
});

app.post('/expenses', authMiddleware, async (req, res) => {
  const expense = req.body || {};

  if (!expense.id || !expense.amount || !expense.category || !expense.date) {
    return res.status(400).json({ error: 'Invalid expense data' });
  }

  const newExpense = await Expense.create({
    id: expense.id,
    userId: req.user.id,
    amount: Number(expense.amount),
    category: expense.category,
    date: expense.date,
    note: expense.note || '',
    recurring: Boolean(expense.recurring)
  });

  const { _id, __v, ...payload } = newExpense.toObject();
  return res.status(201).json(payload);
});

app.put('/expenses/:id', authMiddleware, async (req, res) => {
  const updatedExpense = await Expense.findOneAndUpdate(
    { id: req.params.id, userId: req.user.id },
    {
      $set: {
        amount: Number(req.body.amount),
        category: req.body.category,
        date: req.body.date,
        note: req.body.note || '',
        recurring: Boolean(req.body.recurring)
      }
    },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedExpense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const { _id, __v, ...payload } = updatedExpense;
  return res.json(payload);
});

app.delete('/expenses/:id', authMiddleware, async (req, res) => {
  const deletedExpense = await Expense.findOneAndDelete({ id: req.params.id, userId: req.user.id });

  if (!deletedExpense) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  return res.json({ success: true });
});

bootstrapDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`MongoDB connected at ${MONGO_URI}`);
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
