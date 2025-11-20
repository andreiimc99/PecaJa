const express = require('express');
const router = express.Router();
const db = require('../db');

// Rota pública para retornar desmanches em destaque (vitrine)
// Retorna somente os desmanches com destaque = 1, paginados (limit e page)
router.get('/desmanches-vitrine', (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 3); // mínimo 1, padrão 3
  const page = Math.max(0, parseInt(req.query.page, 10) || 0);
  const offset = page * limit;

  const countSql = `SELECT COUNT(*) AS total FROM desmanches WHERE destaque = 1`;
  db.query(countSql, (cErr, cRows) => {
    if (cErr) {
      console.error('[PUBLIC] Erro ao contar desmanches-destaque:', cErr);
      return res.status(500).json({ error: 'Erro ao buscar desmanches' });
    }
    const total = (cRows && cRows[0] && cRows[0].total) || 0;
    const pageCount = Math.max(0, Math.ceil(total / limit));

    const sql = `SELECT id, nome, horario, foto_url, destaque FROM desmanches WHERE destaque = 1 ORDER BY id DESC LIMIT ? OFFSET ?`;
    db.query(sql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('[PUBLIC] Erro ao buscar desmanches-vitrine:', err);
        return res.status(500).json({ error: 'Erro ao buscar desmanches' });
      }
      res.json({ rows: rows || [], total, page, pageCount });
    });
  });
});

module.exports = router;
