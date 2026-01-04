import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SHARED_DIR = path.join(PUBLIC_DIR, '_shared');
const STICKERS_DIR = path.join(PUBLIC_DIR, 'stickers');
const METADATA_FILE = path.join(SHARED_DIR, 'metadata.json');
const STICKERS_META_FILE = path.join(STICKERS_DIR, 'stickers.json');

const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 8081;
const MANAGE_PASSWORD = process.env.MANAGE_PASSWORD || 'admin123';
const GALLERY_TTL_HOURS = process.env.GALLERY_TTL_HOURS ? Number(process.env.GALLERY_TTL_HOURS) : 24;

// In-memory session store
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Rate limiting
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(fp) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

// Generate 10-character URL-friendly ID
function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// Timing-safe password comparison
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still do a compare to prevent timing attacks
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function validateSession(token) {
  if (!token) return false;
  const expires = sessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function getAuthToken(req) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  // Check cookie
  const cookies = req.headers['cookie'];
  if (cookies) {
    const match = cookies.match(/manage_session=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.socket?.remoteAddress || 
         'unknown';
}

function sendJSON(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    ...headers,
  });
  res.end(body);
}

function send404(res) {
  sendJSON(res, 404, { error: 'Not found' });
}

function sendUnauthorized(res) {
  sendJSON(res, 401, { error: 'Unauthorized' });
}

async function readMetadata() {
  try {
    if (await exists(METADATA_FILE)) {
      const data = await fs.readFile(METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading metadata:', e.message);
  }
  return [];
}

async function writeMetadata(metadata) {
  await ensureDir(SHARED_DIR);
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

async function readStickersMetadata() {
  try {
    if (await exists(STICKERS_META_FILE)) {
      const data = await fs.readFile(STICKERS_META_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Error reading stickers metadata:', e.message);
  }
  return [];
}

async function writeStickersMetadata(stickers) {
  await ensureDir(STICKERS_DIR);
  await fs.writeFile(STICKERS_META_FILE, JSON.stringify(stickers, null, 2));
}

async function parseBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Request body too large');
    }
  }
  return body ? JSON.parse(body) : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = url.pathname;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end();
    return;
  }

  const clientIP = getClientIP(req);

  try {
    // ===== PUBLIC ROUTES =====

    // Health check
    if (method === 'GET' && pathname === '/api/health') {
      sendJSON(res, 200, { ok: true, timestamp: new Date().toISOString() });
      return;
    }

    // GET /api/share/create - diagnostic
    if (method === 'GET' && pathname === '/api/share/create') {
      sendJSON(res, 200, { ok: true, route: '/api/share/create' });
      return;
    }

    // POST /api/share/create - upload photo
    if (method === 'POST' && pathname === '/api/share/create') {
      if (isRateLimited(clientIP)) {
        sendJSON(res, 429, { error: 'Rate limit exceeded' });
        return;
      }

      const parsed = await parseBody(req);
      const dataUrl = parsed?.dataUrl;
      const template = parsed?.template || 'default';
      const transform = parsed?.transform || null;

      if (!dataUrl || typeof dataUrl !== 'string') {
        sendJSON(res, 400, { error: 'Missing dataUrl' });
        return;
      }

      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/);
      if (!match) {
        sendJSON(res, 400, { error: 'Invalid data URL' });
        return;
      }

      const ext = match[2] === 'png' ? 'png' : 'jpg';
      const base64 = match[3];
      const buffer = Buffer.from(base64, 'base64');

      await ensureDir(SHARED_DIR);
      const id = generateId();
      const filename = `${id}.${ext}`;
      const filePath = path.join(SHARED_DIR, filename);
      await fs.writeFile(filePath, buffer);

      // Update metadata
      const metadata = await readMetadata();
      metadata.push({
        id,
        filename,
        createdAt: new Date().toISOString(),
        size: buffer.length,
        template,
        transform,
      });
      await writeMetadata(metadata);

      console.log(`Saved shared file: ${filePath} (${buffer.length} bytes)`);
      sendJSON(res, 200, { id });
      return;
    }

    // GET /p/:id - serve image
    if (method === 'GET' && pathname.startsWith('/p/')) {
      const id = pathname.slice(3).replace(/[^a-zA-Z0-9]/g, '');
      if (!id || id.length !== 10) {
        send404(res);
        return;
      }

      const pngPath = path.join(SHARED_DIR, `${id}.png`);
      const jpgPath = path.join(SHARED_DIR, `${id}.jpg`);

      try {
        if (await exists(pngPath)) {
          const data = await fs.readFile(pngPath);
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': data.length,
            'Cache-Control': 'public, max-age=31536000',
          });
          res.end(data);
          return;
        }
        if (await exists(jpgPath)) {
          const data = await fs.readFile(jpgPath);
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': data.length,
            'Cache-Control': 'public, max-age=31536000',
          });
          res.end(data);
          return;
        }
        send404(res);
        return;
      } catch (err) {
        console.error('serve /p error', err);
        sendJSON(res, 500, { error: 'Server error' });
        return;
      }
    }

    // GET /api/p/:id/meta - get metadata for a specific photo
    if (method === 'GET' && pathname.match(/^\/api\/p\/[a-zA-Z0-9]+\/meta$/)) {
      const id = pathname.split('/')[3];
      const metadata = await readMetadata();
      const entry = metadata.find(m => m.id === id);
      if (!entry) {
        send404(res);
        return;
      }
      sendJSON(res, 200, entry);
      return;
    }

    // GET /api/stickers/list - public sticker list
    if (method === 'GET' && pathname === '/api/stickers/list') {
      const stickers = await readStickersMetadata();
      const visible = stickers.filter(s => s.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
      sendJSON(res, 200, { stickers: visible });
      return;
    }

    // ===== ADMIN ROUTES =====

    // POST /api/manage/login
    if (method === 'POST' && pathname === '/api/manage/login') {
      const parsed = await parseBody(req);
      const password = parsed?.password;

      if (!password || !secureCompare(password, MANAGE_PASSWORD)) {
        sendJSON(res, 401, { error: 'Invalid password' });
        return;
      }

      const token = createSession();
      sendJSON(res, 200, { token }, {
        'Set-Cookie': `manage_session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax`,
      });
      return;
    }

    // POST /api/manage/logout
    if (method === 'POST' && pathname === '/api/manage/logout') {
      const token = getAuthToken(req);
      if (token) {
        sessions.delete(token);
      }
      sendJSON(res, 200, { ok: true }, {
        'Set-Cookie': 'manage_session=; HttpOnly; Path=/; Max-Age=0',
      });
      return;
    }

    // GET /api/manage/verify - verify session
    if (method === 'GET' && pathname === '/api/manage/verify') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }
      sendJSON(res, 200, { valid: true });
      return;
    }

    // GET /api/manage/gallery - get recent 20 photos (admin only)
    if (method === 'GET' && pathname === '/api/manage/gallery') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const metadata = await readMetadata();
      const sorted = metadata
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);

      sendJSON(res, 200, { photos: sorted, total: metadata.length });
      return;
    }

    // POST /api/manage/gallery/delete
    if (method === 'POST' && pathname === '/api/manage/gallery/delete') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const parsed = await parseBody(req);
      const id = parsed?.id;

      if (!id) {
        sendJSON(res, 400, { error: 'Missing id' });
        return;
      }

      const metadata = await readMetadata();
      const entry = metadata.find(m => m.id === id);
      if (!entry) {
        sendJSON(res, 404, { error: 'Photo not found' });
        return;
      }

      // Delete file
      const filePath = path.join(SHARED_DIR, entry.filename);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('Could not delete file:', e.message);
      }

      // Update metadata
      const updated = metadata.filter(m => m.id !== id);
      await writeMetadata(updated);

      sendJSON(res, 200, { ok: true });
      return;
    }

    // POST /api/manage/cleanup - manual cleanup
    if (method === 'POST' && pathname === '/api/manage/cleanup') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const removed = await cleanupOldFiles();
      sendJSON(res, 200, { removed });
      return;
    }

    // GET /api/manage/stickers/list
    if (method === 'GET' && pathname === '/api/manage/stickers/list') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const stickers = await readStickersMetadata();
      sendJSON(res, 200, { stickers: stickers.sort((a, b) => (a.order || 0) - (b.order || 0)) });
      return;
    }

    // POST /api/manage/stickers/upload
    if (method === 'POST' && pathname === '/api/manage/stickers/upload') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const parsed = await parseBody(req);
      const dataUrl = parsed?.dataUrl;
      const label = parsed?.label || 'Sticker';

      if (!dataUrl) {
        sendJSON(res, 400, { error: 'Missing dataUrl' });
        return;
      }

      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
      if (!match) {
        sendJSON(res, 400, { error: 'Invalid image data' });
        return;
      }

      const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
      const base64 = match[3];
      const buffer = Buffer.from(base64, 'base64');

      await ensureDir(STICKERS_DIR);
      const id = generateId();
      const filename = `${id}.${ext}`;
      const filePath = path.join(STICKERS_DIR, filename);
      await fs.writeFile(filePath, buffer);

      const stickers = await readStickersMetadata();
      const maxOrder = stickers.reduce((max, s) => Math.max(max, s.order || 0), -1);
      stickers.push({
        id,
        filename,
        label,
        visible: true,
        order: maxOrder + 1,
      });
      await writeStickersMetadata(stickers);

      sendJSON(res, 200, { id, filename });
      return;
    }

    // POST /api/manage/stickers/reorder
    if (method === 'POST' && pathname === '/api/manage/stickers/reorder') {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const parsed = await parseBody(req);
      const ids = parsed?.ids;

      if (!Array.isArray(ids)) {
        sendJSON(res, 400, { error: 'Missing ids array' });
        return;
      }

      const stickers = await readStickersMetadata();
      const updated = ids.map((id, index) => {
        const sticker = stickers.find(s => s.id === id);
        if (sticker) {
          return { ...sticker, order: index };
        }
        return null;
      }).filter(Boolean);

      // Add any stickers not in the new order
      stickers.forEach(s => {
        if (!ids.includes(s.id)) {
          updated.push({ ...s, order: updated.length });
        }
      });

      await writeStickersMetadata(updated);
      sendJSON(res, 200, { ok: true });
      return;
    }

    // DELETE /api/manage/stickers/:id
    if (method === 'DELETE' && pathname.startsWith('/api/manage/stickers/')) {
      const token = getAuthToken(req);
      if (!validateSession(token)) {
        sendUnauthorized(res);
        return;
      }

      const id = pathname.split('/').pop();
      const stickers = await readStickersMetadata();
      const sticker = stickers.find(s => s.id === id);

      if (!sticker) {
        sendJSON(res, 404, { error: 'Sticker not found' });
        return;
      }

      // Delete file
      const filePath = path.join(STICKERS_DIR, sticker.filename);
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.warn('Could not delete sticker file:', e.message);
      }

      // Update metadata
      const updated = stickers.filter(s => s.id !== id);
      await writeStickersMetadata(updated);

      sendJSON(res, 200, { ok: true });
      return;
    }

    // Fallback
    send404(res);
  } catch (err) {
    console.error('server error', err);
    sendJSON(res, 500, { error: 'Server error' });
  }
});

// Cleanup old files based on TTL
async function cleanupOldFiles() {
  try {
    const cutoff = Date.now() - GALLERY_TTL_HOURS * 60 * 60 * 1000;
    const metadata = await readMetadata();
    const toRemove = [];
    const toKeep = [];

    for (const entry of metadata) {
      const createdAt = new Date(entry.createdAt).getTime();
      if (createdAt < cutoff) {
        toRemove.push(entry);
      } else {
        toKeep.push(entry);
      }
    }

    for (const entry of toRemove) {
      const filePath = path.join(SHARED_DIR, entry.filename);
      try {
        await fs.unlink(filePath);
        console.log(`Removed old file: ${filePath}`);
      } catch (e) {
        console.warn('cleanup file error', filePath, e?.message);
      }
    }

    if (toRemove.length > 0) {
      await writeMetadata(toKeep);
      console.log(`Cleanup complete: removed ${toRemove.length} files older than ${GALLERY_TTL_HOURS} hours`);
    }

    return toRemove.length;
  } catch (err) {
    console.error('cleanupOldFiles error', err);
    return 0;
  }
}

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expires] of sessions) {
    if (now > expires) {
      sessions.delete(token);
    }
  }
}, 60 * 1000);

server.listen(API_PORT, () => {
  console.log(`Photobooth API server listening on http://0.0.0.0:${API_PORT}`);
  console.log(`Environment: MANAGE_PASSWORD=${MANAGE_PASSWORD ? '[set]' : '[default]'}, GALLERY_TTL_HOURS=${GALLERY_TTL_HOURS}`);
});

// Initialize and run cleanup
(async () => {
  await ensureDir(SHARED_DIR);
  await ensureDir(STICKERS_DIR);
  await cleanupOldFiles();

  // Periodic cleanup
  setInterval(() => {
    cleanupOldFiles().catch(e => console.error('periodic cleanup error', e));
  }, 60 * 60 * 1000); // Every hour
})();
