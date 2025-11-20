// backend/routes/loginRoutes.js
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt'); // AJUSTE: Importa o bcrypt

router.post('/', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Preencha email e senha!' });
  }

  // Unifica a busca em ambas as tabelas.
  // IMPORTANTE: para clientes usamos a coluna `role` (pode ser 'cliente' ou 'admin').
  const sql = `
    (SELECT id, nome, email, senha, role FROM clientes WHERE email = ?)
    UNION
    (SELECT id, nome, email, senha, 'desmanche' AS role FROM desmanches WHERE email = ?)
  `;
  
  db.query(sql, [email, email], (err, users) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor.' });
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    
    const user = users[0];
    verificaSenha(user);
  });

  async function verificaSenha(user) {
    try {
      // AJUSTE: Compara a senha enviada com a senha criptografada do banco
      const match = await bcrypt.compare(senha, user.senha);
      if (!match) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
      
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'Erro de configuração do servidor.' });
      }

      const token = jwt.sign(
        { id: user.id, nome: user.nome, role: user.role },
        secret,
        { expiresIn: '8h' }
      );
      res.json({ token, user: { id: user.id, nome: user.nome, role: user.role } });

    } catch (err) {
      console.error("Erro na verificação de senha:", err);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  }
});

module.exports = router;