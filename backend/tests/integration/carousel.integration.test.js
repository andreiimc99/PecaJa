// Integration tests for carousel endpoints using supertest
const request = require('supertest');

// Mock db and cloudinary and auth middleware before requiring the app
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    // use x-dev-user header to populate req.user
    const dev = req.headers['x-dev-user'];
    if (!dev) return res.status(401).json({ error: 'Token não enviado.' });
    try {
      req.user = typeof dev === 'string' ? JSON.parse(dev) : dev;
    } catch (e) {
      req.user = dev;
    }
    return next();
  },
  authorize: (role) => (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: 'Acesso negado' });
    if (req.user.role !== role && req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    return next();
  }
}));

jest.mock('../../db', () => ({
  query: (sql, params, cb) => {
    // normalize args
    if (typeof params === 'function') {
      cb = params; params = [];
    }
    // simple handlers by SQL content
    if (sql && sql.includes('IFNULL(MAX(ordem)')) {
      return cb(null, [{ next_ordem: 1 }]);
    }
    if (sql && sql.startsWith('INSERT INTO carousel_banners')) {
      return cb(null, { insertId: 123 });
    }
    if (sql && sql.startsWith('SELECT id, image_url, title, target_url FROM carousel_banners')) {
      // public list
      return cb(null, [{ id: 1, image_url: 'https://example.com/1.jpg', title: 't', target_url: '/' }]);
    }
    if (sql && sql.startsWith('SELECT id, image_url, title, target_url, ordem, ativo, created_at FROM carousel_banners')) {
      // admin list
      return cb(null, [{ id: 1, image_url: 'https://example.com/1.jpg', title: 't', target_url: '/', ordem: 1, ativo: 1, created_at: new Date() }]);
    }
    if (sql && sql.startsWith('DELETE FROM carousel_banners')) {
      return cb(null, { affectedRows: 1 });
    }
    if (sql && sql.startsWith('UPDATE carousel_banners SET ativo')) {
      return cb(null);
    }
    // fallback: empty result
    return cb(null, []);
  }
}));

jest.mock('cloudinary', () => ({
  config: jest.fn(),
  v2: { config: jest.fn(), uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'https://example.com/uploaded.jpg' }) } }
}));

const app = require('../../app');
const path = require('path');

describe('Carousel integration (admin protection)', () => {
  test('GET /api/carousel (public) returns banners', async () => {
    const res = await request(app).get('/api/carousel');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/carousel/admin is allowed for admin', async () => {
    const res = await request(app).get('/api/carousel/admin').set('x-dev-user', JSON.stringify({ id: 1, role: 'admin' }));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/carousel/admin is forbidden for desmanche', async () => {
    const res = await request(app).get('/api/carousel/admin').set('x-dev-user', JSON.stringify({ id: 2, role: 'desmanche' }));
    expect(res.status).toBe(403);
  });

  test('POST /api/carousel allowed for admin, creates banner', async () => {
    const res = await request(app)
      .post('/api/carousel')
      .set('x-dev-user', JSON.stringify({ id: 1, role: 'admin' }))
      .attach('image', path.join(__dirname, '../fixtures/test.png'))
      .field('title', 'ok')
      .field('target_url', '/');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('image_url');
  });

  test('POST /api/carousel forbidden for desmanche', async () => {
    // don't attach a file here to avoid streaming/multer side-effects; authorization runs first
    const res = await request(app)
      .post('/api/carousel')
      .set('x-dev-user', JSON.stringify({ id: 2, role: 'desmanche' }))
      .send({});
    expect(res.status).toBe(403);
  });
});
