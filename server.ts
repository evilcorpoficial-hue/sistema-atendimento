import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { QueueState, Ticket, WebSocketMessage } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_FILE = path.join(process.cwd(), 'queue-data.json');

// Initial default state
const defaultQueueState: QueueState = {
  institution: 'Secretaria de Desenvolvimento Agropecuário',
  currentTicket: {
    id: 'init-1',
    number: 1,
    formattedNumber: '01',
    category: 'CAF',
    code: '01 CAF',
    desk: 'Sala 1',
    status: 'called',
    createdAt: new Date().toISOString(),
    calledAt: new Date().toISOString()
  },
  history: [],
  waitingQueue: [
    {
      id: 'init-2',
      number: 2,
      formattedNumber: '02',
      category: 'CAF',
      code: '02 CAF',
      desk: 'Sala 1',
      status: 'waiting',
      createdAt: new Date().toISOString()
    },
    {
      id: 'init-3',
      number: 3,
      formattedNumber: '03',
      category: 'CAF',
      code: '03 CAF',
      desk: 'Sala 1',
      status: 'waiting',
      createdAt: new Date().toISOString()
    }
  ],
  activeCategory: 'TODAS',
  currentDesk: 'Sala 1',
  counters: {
    CAF: 3,
    GERAL: 0,
    LICENCIAMENTO: 0,
    INCRA: 0
  },
  soundAlertToken: 1,
  lastCalledAt: new Date().toISOString(),
  speechEnabled: true,
  chimeEnabled: true,
  categories: [
    { id: 'cat-caf', name: 'Atendimento CAF', code: 'CAF', speechText: 'kaf', defaultDesk: 'Sala 1', nextShortcut: 'ArrowUp', prevShortcut: 'ArrowDown', color: 'blue' },
    { id: 'cat-incra', name: 'Atendimento INCRA', code: 'INCRA', speechText: 'incra', defaultDesk: 'Sala 5', nextShortcut: 'ArrowRight', prevShortcut: 'ArrowLeft', color: 'emerald' }
  ]
};

function loadPersistedState(): QueueState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        console.log('[Persistence] Successfully loaded queue state from queue-data.json');
        const categories = (Array.isArray(parsed.categories) && parsed.categories.length > 0)
          ? parsed.categories
          : defaultQueueState.categories;

        const counters: Record<string, number> = {
          ...defaultQueueState.counters,
          ...(parsed.counters || {})
        };

        // Ensure all categories have a valid counter initialized
        categories.forEach((cat: any) => {
          const code = (cat.code || '').trim().toUpperCase();
          if (code && (counters[code] === undefined || counters[code] === null)) {
            counters[code] = 0;
          }
        });

        return {
          ...defaultQueueState,
          ...parsed,
          categories,
          counters,
          waitingQueue: [], // Clear dummy waiting queue items
          lastResetSlot: parsed.lastResetSlot || undefined,
          resetAllShortcut: parsed.resetAllShortcut || undefined
        };
      }
    }
  } catch (err) {
    console.error('[Persistence] Error loading queue-data.json:', err);
  }
  return defaultQueueState;
}

function savePersistedState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(queueState, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Persistence] Error saving queue-data.json:', err);
  }
}

let queueState: QueueState = loadPersistedState();
savePersistedState(); // Ensure file exists immediately

function formatTicketNumber(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function broadcastState() {
  savePersistedState();

  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    payload: queueState
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Logic to advance to next password
function callNextTicket(desk?: string, categoryFilter?: string) {
  let rawFilter = (categoryFilter || queueState.activeCategory || '').trim().toUpperCase();
  if (!rawFilter || rawFilter === 'TODAS') {
    rawFilter = queueState.categories?.[0]?.code?.trim().toUpperCase() || 'CAF';
  }

  const matchedCategory = queueState.categories?.find(c => c.code.trim().toUpperCase() === rawFilter);
  const cat = matchedCategory ? matchedCategory.code.trim().toUpperCase() : rawFilter;
  const targetDesk = desk || matchedCategory?.defaultDesk || (cat === 'INCRA' ? 'Sala 5' : queueState.currentDesk) || 'Sala 1';

  // Ensure counter exists and is a valid number
  if (typeof queueState.counters[cat] !== 'number' || isNaN(queueState.counters[cat])) {
    queueState.counters[cat] = 0;
  }

  const nextNum = queueState.counters[cat] + 1;
  queueState.counters[cat] = nextNum;

  const nextTicket: Ticket = {
    id: `auto-${Date.now()}-${nextNum}`,
    number: nextNum,
    formattedNumber: formatTicketNumber(nextNum),
    category: cat,
    code: `${formatTicketNumber(nextNum)} ${cat}`,
    desk: targetDesk,
    status: 'called',
    createdAt: new Date().toISOString(),
    calledAt: new Date().toISOString()
  };

  // Move existing currentTicket to history if present
  if (queueState.currentTicket) {
    queueState.history.unshift({
      ...queueState.currentTicket,
      status: 'completed'
    });
    // keep history capped at 15 items
    if (queueState.history.length > 15) {
      queueState.history.pop();
    }
  }

  queueState.currentTicket = nextTicket;
  queueState.soundAlertToken += 1;
  queueState.lastCalledAt = new Date().toISOString();

  broadcastState();
}

// Logic to return to previous password (isolated by category if provided)
function callPrevTicket(desk?: string, categoryFilter?: string) {
  let rawFilter = (categoryFilter || queueState.activeCategory || '').trim().toUpperCase();
  if (!rawFilter || rawFilter === 'TODAS') {
    rawFilter = queueState.categories?.[0]?.code?.trim().toUpperCase() || 'CAF';
  }

  const matchedCategory = queueState.categories?.find(c => c.code.trim().toUpperCase() === rawFilter);
  const cat = matchedCategory ? matchedCategory.code.trim().toUpperCase() : rawFilter;
  const targetDesk = desk || matchedCategory?.defaultDesk || (cat === 'INCRA' ? 'Sala 5' : queueState.currentDesk) || 'Sala 1';

  // Find most recent ticket in history for this category
  const historyIndex = queueState.history.findIndex(t => t.category.trim().toUpperCase() === cat);

  if (historyIndex !== -1) {
    const [prevTicketFromHistory] = queueState.history.splice(historyIndex, 1);

    // Keep counter synchronized with the ticket currently displayed
    queueState.counters[cat] = prevTicketFromHistory.number;

    queueState.currentTicket = {
      ...prevTicketFromHistory,
      desk: targetDesk,
      status: 'called',
      calledAt: new Date().toISOString()
    };

    queueState.soundAlertToken += 1;
    queueState.lastCalledAt = new Date().toISOString();

    broadcastState();
    return;
  }

  // If no ticket in history for this category, decrement counter down to minimum 1
  const currentNum = queueState.counters[cat] || 1;
  if (currentNum > 1) {
    const prevNum = currentNum - 1;
    queueState.counters[cat] = prevNum;

    const formattedPrev = formatTicketNumber(prevNum);
    queueState.currentTicket = {
      id: `auto-${Date.now()}-${prevNum}`,
      number: prevNum,
      formattedNumber: formattedPrev,
      category: cat,
      code: `${formattedPrev} ${cat}`,
      desk: targetDesk,
      status: 'called',
      createdAt: new Date().toISOString(),
      calledAt: new Date().toISOString()
    };

    queueState.soundAlertToken += 1;
    queueState.lastCalledAt = new Date().toISOString();
    broadcastState();
  }
}

// Logic to call any specific ticket directly
function callDirectTicket(category: string, ticketNumber: number | string, desk?: string): Ticket {
  let cat = (category || 'CAF').trim().toUpperCase();
  let num = 1;

  const rawInput = String(ticketNumber || '').trim();
  const letterMatch = rawInput.match(/([a-zA-Z]+)/);
  const numberMatch = rawInput.match(/(\d+)/);

  if (numberMatch) {
    num = parseInt(numberMatch[1], 10);
  }
  if (letterMatch && (!category || category === 'TODAS')) {
    cat = letterMatch[1].toUpperCase();
  }

  const matchedCategory = queueState.categories?.find(c => c.code.trim().toUpperCase() === cat);
  const targetDesk = desk || matchedCategory?.defaultDesk || queueState.currentDesk || 'Sala 1';

  // Move current ticket to history if present
  if (queueState.currentTicket) {
    queueState.history.unshift({
      ...queueState.currentTicket,
      status: 'completed'
    });
    if (queueState.history.length > 15) {
      queueState.history.pop();
    }
  }

  // Synchronize category counter with called number
  queueState.counters[cat] = num;

  const formattedNum = formatTicketNumber(num);
  const newTicket: Ticket = {
    id: `direct-${Date.now()}-${num}`,
    number: num,
    formattedNumber: formattedNum,
    category: cat,
    code: `${formattedNum} ${cat}`,
    desk: targetDesk,
    status: 'called',
    createdAt: new Date().toISOString(),
    calledAt: new Date().toISOString()
  };

  queueState.currentTicket = newTicket;
  queueState.soundAlertToken += 1;
  queueState.lastCalledAt = new Date().toISOString();

  broadcastState();
  return newTicket;
}

function recallCurrentTicket() {
  if (queueState.currentTicket && queueState.currentTicket.number > 0) {
    queueState.soundAlertToken += 1;
    queueState.lastCalledAt = new Date().toISOString();
    broadcastState();
  }
}

function addTicket(category: string) {
  const cat = (category || 'CAF').trim().toUpperCase();
  const nextNum = (queueState.counters[cat] || 0) + 1;
  queueState.counters[cat] = nextNum;

  const newTicket: Ticket = {
    id: `ticket-${Date.now()}-${nextNum}`,
    number: nextNum,
    formattedNumber: formatTicketNumber(nextNum),
    category: cat,
    code: `${formatTicketNumber(nextNum)} ${cat}`,
    desk: queueState.currentDesk,
    status: 'waiting',
    createdAt: new Date().toISOString()
  };

  queueState.waitingQueue.push(newTicket);
  broadcastState();
  return newTicket;
}

function resetQueue(categoryFilter?: string) {
  if (!categoryFilter || categoryFilter === 'TODAS' || categoryFilter === 'ALL') {
    const newCounters: Record<string, number> = {
      CAF: 0,
      GERAL: 0,
      LICENCIAMENTO: 0,
      INCRA: 0
    };

    if (queueState.categories && queueState.categories.length > 0) {
      queueState.categories.forEach(cat => {
        if (cat.code) {
          newCounters[cat.code.trim().toUpperCase()] = 0;
        }
      });
    }

    queueState = {
      ...queueState,
      currentTicket: null, // Reset ticket to null so the screen displays 00 cleanly without calling any password
      history: [],
      waitingQueue: [],
      counters: newCounters
      // Do NOT increment soundAlertToken on reset! Resets must be completely silent.
    };
  } else {
    const cleanCat = categoryFilter.trim().toUpperCase();
    // Reset counter for specific category
    queueState.counters[cleanCat] = 0;

    // Filter out waiting tickets and history for this category
    queueState.waitingQueue = queueState.waitingQueue.filter(t => t.category.trim().toUpperCase() !== cleanCat);
    queueState.history = queueState.history.filter(t => t.category.trim().toUpperCase() !== cleanCat);

    // Reset currentTicket if it belongs to this category
    if (queueState.currentTicket && queueState.currentTicket.category.trim().toUpperCase() === cleanCat) {
      queueState.currentTicket = null;
    }
    // Do NOT increment soundAlertToken on reset! Resets must be completely silent.
  }
  broadcastState();
}

// REST API Endpoints
app.get('/api/queue', (req, res) => {
  checkAndExecuteAutoReset();
  res.json(queueState);
});

app.post('/api/queue/next', (req, res) => {
  const { desk, category } = req.body || {};
  callNextTicket(desk, category);
  res.json({ success: true, state: queueState });
});

app.post('/api/queue/prev', (req, res) => {
  const { desk, category } = req.body || {};
  callPrevTicket(desk, category);
  res.json({ success: true, state: queueState });
});

app.post('/api/queue/recall', (req, res) => {
  recallCurrentTicket();
  res.json({ success: true, state: queueState });
});

app.post('/api/queue/add', (req, res) => {
  const { category } = req.body || {};
  const ticket = addTicket(category || 'CAF');
  res.json({ success: true, ticket, state: queueState });
});

app.post('/api/queue/reset', (req, res) => {
  const { category } = req.body || {};
  resetQueue(category);
  res.json({ success: true, state: queueState });
});

app.post('/api/queue/config', (req, res) => {
  const { desk, institution, activeCategory, speechEnabled, chimeEnabled, resetAllShortcut } = req.body || {};
  if (desk !== undefined) queueState.currentDesk = desk;
  if (institution !== undefined) queueState.institution = institution;
  if (activeCategory !== undefined) queueState.activeCategory = activeCategory;
  if (speechEnabled !== undefined) queueState.speechEnabled = speechEnabled;
  if (chimeEnabled !== undefined) queueState.chimeEnabled = chimeEnabled;
  if (resetAllShortcut !== undefined) queueState.resetAllShortcut = resetAllShortcut;

  broadcastState();
  res.json({ success: true, state: queueState });
});

app.post('/api/queue/direct', (req, res) => {
  const { category, number, desk } = req.body || {};
  const ticket = callDirectTicket(category, number, desk);
  res.json({ success: true, ticket, state: queueState });
});

app.post('/api/queue/categories', (req, res) => {
  const { categories } = req.body || {};
  if (Array.isArray(categories)) {
    queueState.categories = categories;
    categories.forEach(cat => {
      const code = (cat.code || '').trim().toUpperCase();
      if (code && queueState.counters[code] === undefined) {
        queueState.counters[code] = 0;
      }
    });
    broadcastState();
  }
  res.json({ success: true, state: queueState });
});

// Utility to get local network IP addresses
app.get('/api/ip', (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const k in interfaces) {
    for (const k2 of interfaces[k] || []) {
      if (k2.family === 'IPv4' && !k2.internal) {
        addresses.push(k2.address);
      }
    }
  }
  res.json({ ips: addresses, port: PORT });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Check auto-reset upon connection
  checkAndExecuteAutoReset();

  // Send current state to newly connected client
  ws.send(JSON.stringify({
    type: 'STATE_UPDATE',
    payload: queueState
  }));

  ws.on('message', (message: string) => {
    try {
      const data: WebSocketMessage = JSON.parse(message.toString());
      switch (data.type) {
        case 'CALL_NEXT':
          callNextTicket(data.desk, data.category);
          break;
        case 'CALL_PREV':
          callPrevTicket(data.desk, data.category);
          break;
        case 'CALL_DIRECT':
          callDirectTicket(data.category, data.number, data.desk);
          break;
        case 'RECALL_CURRENT':
          recallCurrentTicket();
          break;
        case 'ADD_TICKET':
          addTicket(data.category);
          break;
        case 'RESET_QUEUE':
          resetQueue((data as any).category);
          break;
        case 'UPDATE_DESK':
          queueState.currentDesk = data.desk;
          broadcastState();
          break;
        case 'UPDATE_INSTITUTION':
          queueState.institution = data.institution;
          broadcastState();
          break;
        case 'UPDATE_CATEGORIES':
          if (Array.isArray(data.categories)) {
            queueState.categories = data.categories;
            data.categories.forEach(cat => {
              const code = (cat.code || '').trim().toUpperCase();
              if (code && queueState.counters[code] === undefined) {
                queueState.counters[code] = 0;
              }
            });
            broadcastState();
          }
          break;
        case 'UPDATE_RESET_ALL_SHORTCUT':
          queueState.resetAllShortcut = data.shortcut;
          broadcastState();
          break;
      }
    } catch (e) {
      console.error('WebSocket parsing error:', e);
    }
  });
});

// Automatic reset scheduler for 3 daily shifts in America/Sao_Paulo (Brasilia time):
// 1) Início do expediente da manhã: 08:00
// 2) Intervalo do almoço: 12:00
// 3) Encerramento do expediente / noite: 17:00
function getTargetResetSlot(date = new Date()): { slotKey: string; slotName: string; hours: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  let hours = 0;
  let minutes = 0;
  let year = '';
  let month = '';
  let day = '';

  parts.forEach(p => {
    if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
    if (p.type === 'year') year = p.value;
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
  });

  const todayStr = `${year}-${month}-${day}`;

  if (hours >= 17) {
    return { slotKey: `${todayStr}_17h`, slotName: 'Encerramento da Noite (17:00)', hours, minutes };
  } else if (hours >= 12) {
    return { slotKey: `${todayStr}_12h`, slotName: 'Intervalo de Almoço (12:00)', hours, minutes };
  } else if (hours >= 8) {
    return { slotKey: `${todayStr}_08h`, slotName: 'Início de Expediente (08:00)', hours, minutes };
  } else {
    // Before 08:00 AM, belongs to the evening closure of the preceding day
    const yesterday = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const yParts = formatter.formatToParts(yesterday);
    let yYear = '', yMonth = '', yDay = '';
    yParts.forEach(p => {
      if (p.type === 'year') yYear = p.value;
      if (p.type === 'month') yMonth = p.value;
      if (p.type === 'day') day = p.value;
    });
    return { slotKey: `${yYear}-${yMonth}-${yDay}_17h`, slotName: 'Fechamento Noturno', hours, minutes };
  }
}

function checkAndExecuteAutoReset() {
  try {
    const { slotKey, slotName } = getTargetResetSlot();

    if (!queueState.lastResetSlot) {
      // If queue-data has data from an older session, trigger auto-reset immediately
      const lastCalled = queueState.lastCalledAt ? new Date(queueState.lastCalledAt) : null;
      if (lastCalled) {
        const lastSlot = getTargetResetSlot(lastCalled).slotKey;
        if (lastSlot !== slotKey) {
          console.log(`[Auto-Reset] Stale data from previous session (${lastSlot}) detected. Auto-resetting for ${slotKey} (${slotName}).`);
          resetQueue();
          queueState.lastResetSlot = slotKey;
          savePersistedState();
          return;
        }
      }
      queueState.lastResetSlot = slotKey;
      savePersistedState();
      return;
    }

    if (queueState.lastResetSlot !== slotKey) {
      console.log(`[Auto-Reset] Shift transition detected: ${queueState.lastResetSlot} -> ${slotKey} (${slotName}). Auto-resetting queues to 00.`);
      resetQueue();
      queueState.lastResetSlot = slotKey;
      savePersistedState();
    }
  } catch (err) {
    console.error('[Auto-Reset Error]', err);
  }
}

// Initial check at startup
checkAndExecuteAutoReset();

// Check every 5 seconds for seamless precision at 08:00, 12:00, and 17:00
setInterval(checkAndExecuteAutoReset, 5000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
