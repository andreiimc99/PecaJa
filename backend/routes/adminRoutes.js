const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Todas as rotas aqui requerem admin
router.use(authenticate);
router.use(authorize('admin'));

// Lista clientes (paginação simples)
router.get('/users/clientes', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;
  const sql = `SELECT id, nome, email, telefone, foto_url, role FROM clientes ORDER BY id DESC LIMIT ? OFFSET ?`;
  db.query(sql, [limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar clientes' });
    res.json(rows);
  });
});

// Atualiza um cliente (role e outros campos permitidos)
router.put('/users/clientes/:id', (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, role, foto_url } = req.body || {};
  // Monta set dinamicamente
  const fields = [];
  const values = [];
  if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (telefone !== undefined) { fields.push('telefone = ?'); values.push(telefone); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (foto_url !== undefined) { fields.push('foto_url = ?'); values.push(foto_url); }

  if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  const sql = `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar cliente' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    // Grava log administrativo
    try {
      const adminId = req.user && req.user.id ? req.user.id : null;
      const details = JSON.stringify({ updatedFields: fields, by: adminId });
      db.query(
        'INSERT INTO admin_logs (admin_id, action, target_table, target_id, details) VALUES (?,?,?,?,?)',
        [adminId, 'update_cliente', 'clientes', id, details],
        () => {}
      );
    } catch (e) {
      console.warn('[ADMIN LOG] Falha ao gravar log:', e);
    }

    res.json({ message: 'Cliente atualizado' });
  });
});

// Buscar cliente por id
router.get('/users/clientes/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT id, nome, email, telefone, foto_url, role FROM clientes WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar cliente' });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  });
});

// Lista desmanches (simples)
router.get('/users/desmanches', (req, res) => {
  const sql = 'SELECT id, nome, email, horario, foto_url FROM desmanches ORDER BY id DESC LIMIT 200';
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar desmanches' });
    res.json(rows);
  });
});

// Atualiza flag 'destaque' de um desmanche (marcar/desmarcar destaque)
router.patch('/users/desmanches/:id/destaque', (req, res) => {
  const { id } = req.params;
  const destaque = req.body && typeof req.body.destaque !== 'undefined' ? (req.body.destaque ? 1 : 0) : null;
  if (destaque === null) return res.status(400).json({ error: 'Campo destaque é obrigatório (0 ou 1)' });

  const sql = 'UPDATE desmanches SET destaque = ? WHERE id = ?';
  db.query(sql, [destaque, id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar destaque' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Desmanche não encontrado' });

    // Grava log administrativo
    try {
      const adminId = req.user && req.user.id ? req.user.id : null;
      const details = JSON.stringify({ destaque, by: adminId });
      db.query(
        'INSERT INTO admin_logs (admin_id, action, target_table, target_id, details) VALUES (?,?,?,?,?)',
        [adminId, destaque ? 'mark_destaque' : 'unmark_destaque', 'desmanches', id, details],
        () => {}
      );
    } catch (e) {
      console.warn('[ADMIN LOG] Falha ao gravar log:', e);
    }

    res.json({ message: 'Destaque atualizado', destaque });
  });
});

// Lista logs administrativos (filtros e paginação)
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const offset = parseInt(req.query.offset, 10) || 0;
  const { admin_id, action, target_table, date_from, date_to } = req.query || {};

  const where = [];
  const params = [];
  if (admin_id) {
    where.push('admin_id = ?');
    params.push(admin_id);
  }
  if (action) {
    where.push('action = ?');
    params.push(action);
  }
  if (target_table) {
    where.push('target_table = ?');
    params.push(target_table);
  }
  if (date_from) {
    where.push('created_at >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('created_at <= ?');
    params.push(date_to);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT id, admin_id, action, target_table, target_id, details, created_at FROM admin_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar logs administrativos' });
    res.json(rows);
  });
});

module.exports = router;
