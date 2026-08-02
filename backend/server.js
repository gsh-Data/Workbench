const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const archiver = require('archiver');
const axios = require('axios');
const https = require('https');
const DB = require('./utils/db');
const cron = require('node-cron');

const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 50,
  rejectUnauthorized: false 
});

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
    dueDate,
    createdAt: new Date().toISOString()
  };
  todos.push(newTodo);
  DB.setCollection('todos', todos);
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const todos = DB.getCollection('todos');
  const index = todos.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    const isNowCompleted = req.body.completed || req.body.status === 'done';
    const completedAt = isNowCompleted ? (todos[index].completedAt || new Date().toISOString()) : null;
    
    todos[index] = { ...todos[index], ...req.body, completedAt };
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

// --- Scratchpad API ---
app.get('/api/scratchpad', (req, res) => {
  const data = DB.getCollection('scratchpad');
  res.json(data[0] || { content: '' });
});

app.post('/api/scratchpad', (req, res) => {
  const { content } = req.body;
  DB.setCollection('scratchpad', [{ content, updatedAt: new Date().toISOString() }]);
  res.json({ success: true });
});

// --- Smart VIP Unblock & Kuwo Fallback Audio Resolver ---
async function getKuwoFallbackAudio(songName, artistName) {
  try {
    const kwSearchUrl = `http://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(songName + ' ' + (artistName || ''))}&pn=0&rn=1&ft=music&encoding=utf8&rformat=json`;
    const kwRes = await axios.get(kwSearchUrl, { timeout: 4000 });
    let kwData = kwRes.data;
    if (typeof kwData === 'string') {
      try {
        kwData = JSON.parse(kwData.replace(/'/g, '"'));
      } catch (e) {}
    }
    if (kwData && kwData.abslist && kwData.abslist.length > 0) {
      const musicId = kwData.abslist[0].MUSICRID.replace('MUSIC_', '');
      const kuwoAudioUrl = `http://antiserver.kuwo.cn/anti.s?format=mp3&rid=MUSIC_${musicId}&type=convert_url`;
      const audioRes = await axios.get(kuwoAudioUrl, { timeout: 4000 });
      if (typeof audioRes.data === 'string' && audioRes.data.startsWith('http')) {
        return audioRes.data;
      } else if (audioRes.data && audioRes.data.url) {
        return audioRes.data.url;
      }
    }
  } catch (e) {
    console.warn('[Music Unblock] Kuwo audio fallback failed for:', songName, e.message);
  }
  return null;
}

// --- Music Search & Playlist APIs with VIP Unblock Fallbacks ---
app.get('/api/music/search', async (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'Keyword required' });

  // 1. Try Meting Multi-Source API
  try {
    const metingUrl = `https://api.i-meto.com/meting/v1?type=search&keyword=${encodeURIComponent(keyword)}`;
    const response = await axios.get(metingUrl, { timeout: 6000 });
    if (Array.isArray(response.data) && response.data.length > 0) {
      const results = response.data.map(item => ({
        id: item.id || item.songid,
        name: item.title || item.name,
        artist: item.author || item.artist,
        album: item.album || '',
        cover: item.pic || item.cover,
        url: item.url,
        lrc: item.lrc
      }));
      return res.json(results);
    }
  } catch (err) {
    console.warn('[Music API] Meting search failed, trying Kuwo / NetEase fallbacks...', err.message);
  }

  // 2. Try Kuwo Direct Free Search (100% Free VIP Unblock)
  try {
    const kwSearchUrl = `http://search.kuwo.cn/r.s?client=kt&all=${encodeURIComponent(keyword)}&pn=0&rn=15&ft=music&encoding=utf8&rformat=json`;
    const kwRes = await axios.get(kwSearchUrl, { timeout: 5000 });
    let kwData = kwRes.data;
    if (typeof kwData === 'string') {
      try {
        kwData = JSON.parse(kwData.replace(/'/g, '"'));
      } catch (e) {}
    }
    if (kwData && kwData.abslist && kwData.abslist.length > 0) {
      const cleanText = (str) => {
        if (!str) return '';
        return str.replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/\\u0026/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
      };

      const songs = kwData.abslist.map(item => {
        const musicId = item.MUSICRID.replace('MUSIC_', '');
        return {
          id: musicId,
          name: cleanText(item.SONGNAME),
          artist: cleanText(item.ARTIST),
          album: cleanText(item.ALBUM || ''),
          cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
          url: `http://antiserver.kuwo.cn/anti.s?format=mp3&rid=MUSIC_${musicId}&type=convert_url`
        };
      });
      return res.json(songs);
    }
  } catch (kwErr) {
    console.warn('[Music API] Kuwo search fallback failed:', kwErr.message);
  }

  // 3. Try NetEase Search Fallback
  try {
    const ncmUrl = `https://music.163.com/api/search/get/web?csrf_token=&hlpretag=&hlposttag=&s=${encodeURIComponent(keyword)}&type=1&offset=0&total=true&limit=20`;
    const ncmRes = await axios.get(ncmUrl, { 
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    if (ncmRes.data && ncmRes.data.result && ncmRes.data.result.songs) {
      const songs = ncmRes.data.result.songs.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artists ? song.artists.map(a => a.name).join(', ') : '未知歌手',
        album: song.album ? song.album.name : '',
        cover: song.album && song.album.picUrl ? song.album.picUrl : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
        duration: song.duration
      }));
      return res.json(songs);
    }
  } catch (fallbackErr) {
    console.error('[Music API] Search fallbacks all failed:', fallbackErr.message);
  }

  res.json([]);
});

app.get('/api/music/playlist', async (req, res) => {
  let id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Playlist ID required' });

  const match = id.match(/id=(\d+)/);
  if (match) id = match[1];

  try {
    const metingUrl = `https://api.i-meto.com/meting/v1?type=playlist&id=${id}`;
    const response = await axios.get(metingUrl, { timeout: 8000 });
    if (Array.isArray(response.data) && response.data.length > 0) {
      const tracks = response.data.map(item => ({
        id: item.id || item.songid,
        name: item.title || item.name,
        artist: item.author || item.artist,
        album: item.album || '',
        cover: item.pic || item.cover,
        url: item.url,
        lrc: item.lrc
      }));
      return res.json(tracks);
    }
  } catch (err) {
    console.warn('[Music API] Playlist Meting fetch failed:', err.message);
  }

  try {
    const ncmUrl = `https://music.163.com/api/playlist/detail?id=${id}`;
    const ncmRes = await axios.get(ncmUrl, { 
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (ncmRes.data && ncmRes.data.result && ncmRes.data.result.tracks) {
      const tracks = ncmRes.data.result.tracks.map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artists ? song.artists.map(a => a.name).join(', ') : '未知歌手',
        album: song.album ? song.album.name : '',
        cover: song.album && song.album.picUrl ? song.album.picUrl : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
      }));
      return res.json(tracks);
    }
  } catch (fallbackErr) {
    console.error('[Music API] Playlist fallback failed:', fallbackErr.message);
  }

  res.json([]);
});

app.get('/api/music/lyric', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Song ID required' });

  try {
    const lrcUrl = `https://api.i-meto.com/meting/v1?type=lyric&id=${id}`;
    const response = await axios.get(lrcUrl, { timeout: 5000 });
    if (typeof response.data === 'string') {
      return res.json({ lyric: response.data });
    } else if (response.data && response.data.lyric) {
      return res.json({ lyric: response.data.lyric });
    }
  } catch (err) {
    console.warn('[Music API] Lyric fetch failed:', err.message);
  }

  res.json({ lyric: '' });
});

// --- AI Engine (Local Ollama / LocalAI & ByteDance Doubao) ---
function getAiConfig() {
  const aiConfig = DB.getCollection('aiConfig') || [];
  const cfg = aiConfig[0] || {};
  return {
    provider: cfg.provider || 'local', // 'local' | 'doubao'
    apiKey: cfg.apiKey || process.env.DOUBAO_API_KEY || '',
    endpointId: cfg.endpointId || '',
    localUrl: cfg.localUrl || 'http://127.0.0.1:11434',
    localModel: cfg.localModel || 'deepseek-r1:32b'
  };
}

app.get('/api/ai/config', (req, res) => {
  const cfg = getAiConfig();
  res.json({
    provider: cfg.provider,
    hasKey: !!cfg.apiKey || cfg.provider === 'local',
    maskedKey: cfg.apiKey ? `${cfg.apiKey.slice(0, 4)}...${cfg.apiKey.slice(-4)}` : '',
    endpointId: cfg.endpointId,
    localUrl: cfg.localUrl,
    localModel: cfg.localModel
  });
});

app.post('/api/ai/config', (req, res) => {
  const { provider = 'local', apiKey = '', endpointId = '', localUrl = 'http://127.0.0.1:11434', localModel = 'qwen2.5:latest' } = req.body;
  
  if (provider === 'doubao' && !apiKey) {
    return res.status(400).json({ error: '配置豆包大模型时 API Key 必填' });
  }

  DB.setCollection('aiConfig', [{ 
    provider, 
    apiKey: apiKey.trim(), 
    endpointId: (endpointId || '').trim(),
    localUrl: (localUrl || 'http://127.0.0.1:11434').trim(),
    localModel: (localModel || 'qwen2.5:latest').trim(),
    updatedAt: new Date().toISOString() 
  }]);
  res.json({ success: true });
});

// Check local Ollama status and list installed models
app.get('/api/ai/local-models', async (req, res) => {
  const cfg = getAiConfig();
  const baseUrl = cfg.localUrl || 'http://127.0.0.1:11434';
  try {
    const resp = await axios.get(`${baseUrl}/api/tags`, { timeout: 3000 });
    const models = (resp.data?.models || []).map(m => m.name);
    res.json({ running: true, models, baseUrl });
  } catch (err) {
    res.json({ running: false, models: [], baseUrl, error: '无法连接到本地 Ollama 服务' });
  }
});

async function callAiService(payload, isStream = false) {
  const cfg = getAiConfig();

  if (cfg.provider === 'local') {
    // Call Local Ollama / LocalAI (OpenAI Protocol)
    const baseUrl = (cfg.localUrl || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const targetModel = payload.model && payload.model !== 'doubao-pro-32k' ? payload.model : (cfg.localModel || 'qwen2.5:latest');
    const localPayload = {
      ...payload,
      model: targetModel
    };

    return await axios.post(
      `${baseUrl}/v1/chat/completions`,
      localPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: isStream ? 'stream' : 'json',
        timeout: isStream ? 120000 : 60000
      }
    );
  } else {
    // Call Doubao API
    if (!cfg.apiKey) {
      throw new Error('请先配置 豆包 API Key');
    }

    const modelTarget = cfg.endpointId || payload.model || 'doubao-pro-32k';
    const doubaoPayload = {
      ...payload,
      model: modelTarget
    };

    return await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      doubaoPayload,
      {
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        httpsAgent,
        proxy: false,
        responseType: isStream ? 'stream' : 'json',
        timeout: isStream ? 90000 : 45000
      }
    );
  }
}

// AI Chat Completion (Streaming SSE & Non-Streaming)
app.post('/api/ai/chat', async (req, res) => {
  const cfg = getAiConfig();
  if (cfg.provider === 'doubao' && !cfg.apiKey) {
    return res.status(401).json({ error: '请先配置 豆包 API Key' });
  }

  const { messages, model, stream = true } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  const payload = {
    model: model,
    messages: messages,
    stream: !!stream
  };

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const dsResponse = await callAiService(payload, true);

      dsResponse.data.on('data', chunk => {
        res.write(chunk);
      });

      dsResponse.data.on('end', () => {
        res.end();
      });

      dsResponse.data.on('error', err => {
        console.error('[AI Stream Error]', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      });
    } else {
      const dsResponse = await callAiService(payload, false);
      res.json(dsResponse.data);
    }
  } catch (error) {
    console.error('[AI API Error]', error.response?.status, error.message);
    const status = error.response?.status;
    let errorMsg = 'AI API 调用失败';

    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      errorMsg = '⚠️ 无法连接到本地 AI 模型服务 (Ollama)，请检查本地 Ollama 是否已启动。';
    } else if (status === 402) {
      errorMsg = '⚠️ 账号余额不足 (HTTP 402 Insufficient Balance)。请检查充值或更换 Key。';
    } else if (status === 401) {
      errorMsg = '⚠️ API Key 填错或失效 (HTTP 401 Invalid Key)。请重新配置。';
    } else if (status === 429) {
      errorMsg = '⚠️ 触发 API 频率限流 (HTTP 429 Rate Limit)。请稍后再试。';
    } else if (error.response?.data?.error?.message) {
      errorMsg = error.response.data.error.message;
    } else if (error.message) {
      errorMsg = error.message;
    }

    res.status(status || 500).json({ error: errorMsg });
  }
});

// AI Task Decomposition (待办任务结构化拆解)
app.post('/api/ai/decompose-task', async (req, res) => {
  const cfg = getAiConfig();
  if (cfg.provider === 'doubao' && !cfg.apiKey) {
    return res.status(401).json({ error: '请先配置 豆包 API Key' });
  }

  const { taskText } = req.body;
  if (!taskText) return res.status(400).json({ error: 'Task description required' });

  const promptMessages = [
    {
      role: 'system',
      content: '你是一个高效的项目敏捷拆解专家。请将用户输入的复杂任务拆解为 3 至 6 个具体的、可落地的独立子任务步骤。请直接返回 JSON 格式，格式必须为：{"subtasks": ["子任务1", "子任务2", "子任务3"]}'
    },
    {
      role: 'user',
      content: `请帮我拆解任务：${taskText}`
    }
  ];

  try {
    const dsResponse = await callAiService({
      model: cfg.localModel || 'qwen2.5:latest',
      messages: promptMessages,
      response_format: { type: 'json_object' }
    }, false);

    const content = dsResponse.data.choices[0]?.message?.content;
    let parsed = { subtasks: [] };
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const matches = content.match(/"([^"]+)"/g);
      if (matches) parsed.subtasks = matches.map(m => m.replace(/"/g, ''));
    }
    res.json(parsed);
  } catch (error) {
    console.error('[AI Decompose Error]', error.response?.status, error.message);
    const status = error.response?.status;
    let errorMsg = '任务拆解失败';
    if (error.code === 'ECONNREFUSED') errorMsg = '⚠️ 本地 Ollama 未启动，请先运行本地模型。';
    res.status(status || 500).json({ error: errorMsg });
  }
});

// AI Document Summarization (知识库文档智能提炼)
app.post('/api/ai/summarize-doc', async (req, res) => {
  const cfg = getAiConfig();
  if (cfg.provider === 'doubao' && !cfg.apiKey) {
    return res.status(401).json({ error: '请先配置 豆包 API Key' });
  }

  const { docContent, docTitle } = req.body;
  if (!docContent) return res.status(400).json({ error: 'Doc content required' });

  const promptMessages = [
    {
      role: 'system',
      content: '你是一个高级知识库助手。请对用户提供的 Markdown 文档进行智能总结提炼。输出要求：1. 核心简报（100字以内）；2. 核心要点 (Bullet Points, 3-5条)；3. 推荐关联标签 (3个)。直接输出简洁精美的 Markdown 结果。'
    },
    {
      role: 'user',
      content: `文档标题：${docTitle || '未命名文档'}\n\n文档内容：\n${docContent.slice(0, 4000)}`
    }
  ];

  try {
    const dsResponse = await callAiService({
      model: cfg.localModel || 'qwen2.5:latest',
      messages: promptMessages
    }, false);

    const summary = dsResponse.data.choices[0]?.message?.content || '';
    res.json({ summary });
  } catch (error) {
    console.error('[AI Summarize Error]', error.response?.status, error.message);
    const status = error.response?.status;
    let errorMsg = '文档总结失败';
    if (error.code === 'ECONNREFUSED') errorMsg = '⚠️ 本地 Ollama 未启动，请先运行本地模型。';
    res.status(status || 500).json({ error: errorMsg });
  }
});

// --- CronJobs API ---
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

// --- Docs (Knowledge Base) API & Export ---
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

app.get('/api/docs/export', (req, res) => {
  try {
    const dateStr = new Date().toISOString().split('T')[0];
    const zipName = `knowledge-base-${dateStr}.zip`;

    res.attachment(zipName);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('ZIP export error:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);
    archive.directory(DOCS_DIR, 'docs');
    archive.finalize();
  } catch (error) {
    res.status(500).json({ error: 'Failed to export zip' });
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
      metadata[index].updatedAt = new Date().toISOString();
    } else {
      metadata.push({ filename: safeName, taskId: taskId || null, updatedAt: new Date().toISOString() });
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
