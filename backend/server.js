const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const DB = require('./utils/db');
const cron = require('node-cron');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Todos API ---
app.get('/api/todos', (req, res) => {
  res.json(DB.getCollection('todos'));
});

app.post('/api/todos', (req, res) => {
  const { text, dueDate } = req.body;
  const todos = DB.getCollection('todos');
  const newTodo = { 
    id: Date.now().toString(), 
    text, 
    completed: false,
    status: 'todo',
    dueDate 
  };
  todos.push(newTodo);
  DB.setCollection('todos', todos);
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const todos = DB.getCollection('todos');
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    todos[index] = { ...todos[index], ...req.body };
    DB.setCollection('todos', todos);
    res.json(todos[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  const todos = DB.getCollection('todos');
  const filtered = todos.filter(t => t.id !== req.params.id);
  DB.setCollection('todos', filtered);
  res.status(204).send();
});

// --- Snippets API ---
app.get('/api/snippets', (req, res) => {
  res.json(DB.getCollection('snippets'));
});

app.post('/api/snippets', (req, res) => {
  const snippets = DB.getCollection('snippets');
  const newSnippet = { id: Date.now().toString(), ...req.body };
  snippets.push(newSnippet);
  DB.setCollection('snippets', snippets);
  res.status(201).json(newSnippet);
});

app.put('/api/snippets/:id', (req, res) => {
  const snippets = DB.getCollection('snippets');
  const index = snippets.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    snippets[index] = { ...snippets[index], ...req.body };
    DB.setCollection('snippets', snippets);
    res.json(snippets[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/snippets/:id', (req, res) => {
  const snippets = DB.getCollection('snippets');
  const filtered = snippets.filter(t => t.id !== req.params.id);
  DB.setCollection('snippets', filtered);
  res.status(204).send();
});

// --- CronJobs API ---
// Store running cron instances
const activeCronJobs = {};

function startCronJob(job) {
  if (job.status !== 'active') return;
  if (activeCronJobs[job.id]) {
    activeCronJobs[job.id].stop();
  }
  try {
    activeCronJobs[job.id] = cron.schedule(job.schedule, () => {
      console.log(`[Cron] Running job: ${job.name} at ${new Date().toISOString()}`);
      sendNotification(`定时任务执行: ${job.name}`);
    });
    console.log(`[Cron] Started job: ${job.name}`);
  } catch (error) {
    console.error(`[Cron] Failed to start job ${job.name}:`, error);
  }
}

function initializeCronJobs() {
  const jobs = DB.getCollection('cronJobs');
  jobs.forEach(startCronJob);
}

app.get('/api/cron', (req, res) => {
  res.json(DB.getCollection('cronJobs'));
});

app.post('/api/cron', (req, res) => {
  const jobs = DB.getCollection('cronJobs');
  const newJob = { id: Date.now().toString(), status: 'active', ...req.body };
  jobs.push(newJob);
  DB.setCollection('cronJobs', jobs);
  startCronJob(newJob);
  res.status(201).json(newJob);
});

app.put('/api/cron/:id', (req, res) => {
  const jobs = DB.getCollection('cronJobs');
  const index = jobs.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    jobs[index] = { ...jobs[index], ...req.body };
    DB.setCollection('cronJobs', jobs);
    
    // update running instance
    if (activeCronJobs[req.params.id]) {
        activeCronJobs[req.params.id].stop();
        delete activeCronJobs[req.params.id];
    }
    if (jobs[index].status === 'active') {
        startCronJob(jobs[index]);
    }

    res.json(jobs[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/cron/:id', (req, res) => {
  const jobs = DB.getCollection('cronJobs');
  const filtered = jobs.filter(t => t.id !== req.params.id);
  DB.setCollection('cronJobs', filtered);
  
  if (activeCronJobs[req.params.id]) {
    activeCronJobs[req.params.id].stop();
    delete activeCronJobs[req.params.id];
  }

  res.status(204).send();
});

// --- Notifications (SSE) API ---
let clients = [];

app.get('/api/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);
  console.log('[SSE] Client connected. Total:', clients.length);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log('[SSE] Client disconnected. Total:', clients.length);
  });
});

function sendNotification(message) {
  clients.forEach(client => client.write(`data: ${JSON.stringify({ message, time: new Date() })}\n\n`));
}

// --- Docs (Knowledge Base) API ---
const DOCS_DIR = path.join(__dirname, 'data', 'docs');
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

app.get('/api/docs', (req, res) => {
  try {
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md'));
    const metadata = DB.getCollection('docsMetadata') || [];
    res.json(files.map(f => {
      const meta = metadata.find(m => m.filename === f);
      return { name: f, path: f, taskId: meta ? meta.taskId : null };
    }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to list docs' });
  }
});

app.get('/api/docs/:filename', (req, res) => {
  try {
    const content = fs.readFileSync(path.join(DOCS_DIR, req.params.filename), 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.post('/api/docs', (req, res) => {
  try {
    const { filename, content, taskId } = req.body;
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    fs.writeFileSync(path.join(DOCS_DIR, safeName), content, 'utf-8');
    
    const metadata = DB.getCollection('docsMetadata') || [];
    const index = metadata.findIndex(m => m.filename === safeName);
    if (index !== -1) {
      metadata[index].taskId = taskId || null;
    } else {
      metadata.push({ filename: safeName, taskId: taskId || null });
    }
    DB.setCollection('docsMetadata', metadata);

    res.json({ success: true, filename: safeName, taskId: taskId || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save doc' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  initializeCronJobs();
});
