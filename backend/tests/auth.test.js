const { authorize, authenticate } = require('../middleware/auth');

describe('Auth middleware', () => {
  describe('authorize(role)', () => {
    test('permite quando user é admin', () => {
      const req = { user: { id: 1, role: 'admin' } };
      const res = {};
      let called = false;
      const next = () => { called = true; };
      const mw = authorize('desmanche');
      mw(req, res, next);
      expect(called).toBe(true);
    });

    test('permite quando user tem a role requerida', () => {
      const req = { user: { id: 2, role: 'desmanche' } };
      const res = {};
      let called = false;
      const next = () => { called = true; };
      const mw = authorize('desmanche');
      mw(req, res, next);
      expect(called).toBe(true);
    });

    test('nega quando role diferente e não admin', () => {
      const req = { user: { id: 3, role: 'cliente' } };
      const statusCalls = [];
      const res = {
        status: (code) => {
          statusCalls.push(code);
          return {
            json: (obj) => ({ code, body: obj }),
          };
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const mw = authorize('desmanche');
      mw(req, res, next);
      expect(nextCalled).toBe(false);
      expect(statusCalls[0]).toBe(403);
    });
  });

  describe('authenticate (dev bypass)', () => {
    const OLD = process.env.DISABLE_AUTH;
    afterEach(() => {
      process.env.DISABLE_AUTH = OLD;
    });

    test('quando DISABLE_AUTH=true usa x-dev-user header', () => {
      process.env.DISABLE_AUTH = 'true';
      const req = { headers: { 'x-dev-user': JSON.stringify({ id: 7, nome: 'Dev', role: 'admin' }) } };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      authenticate(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
    });

    test('quando DISABLE_AUTH=true sem header usa usuario padrão', () => {
      process.env.DISABLE_AUTH = 'true';
      const req = { headers: {} };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      authenticate(req, res, next);
      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
    });
  });
});
