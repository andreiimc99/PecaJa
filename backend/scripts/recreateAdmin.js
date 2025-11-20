#!/usr/bin/env node
// backend/scripts/recreateAdmin.js
// Remove qualquer usuário com o email informado e cria um novo usuário admin com a senha fornecida (hash bcrypt)

const db = require("../db");
const bcrypt = require("bcrypt");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1];
}

const email = getArg("--email") || "admin@admin.com";
const senha = getArg("--senha") || "123445";

async function main() {
  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    const conn = await db.promise().getConnection();
    try {
      await conn.beginTransaction();

      console.log(`Removendo usuários com email='${email}' (se existirem)...`);
      await conn.query("DELETE FROM clientes WHERE email = ?", [email]);

      // Verifica se a coluna foto_url existe para montar o INSERT corretamente
      const [colRows] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'foto_url'`
      );
      const hasFoto = colRows && colRows[0] && colRows[0].cnt > 0;

      const nome = "Admin";
      const sobrenome = "Técnico";
      const CPF = "00000000000";
      const telefone = "+5511999999999";
      const role = "admin";

      let sql, params;
      if (hasFoto) {
        sql = `INSERT INTO clientes (nome, sobrenome, CPF, email, senha, telefone, role, foto_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        params = [nome, sobrenome, CPF, email, senhaHash, telefone, role, null];
      } else {
        sql = `INSERT INTO clientes (nome, sobrenome, CPF, email, senha, telefone, role) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        params = [nome, sobrenome, CPF, email, senhaHash, telefone, role];
      }

      const [result] = await conn.query(sql, params);
      await conn.commit();

      console.log(`Usuário criado com sucesso. id=${result.insertId} email=${email}`);
    } catch (err) {
      await conn.rollback();
      console.error("Erro durante transação:", err);
      process.exitCode = 1;
    } finally {
      if (conn) conn.release();
    }
  } catch (err) {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  }
}

main();
