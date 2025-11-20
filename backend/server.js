// Ajustado para uso local e em Vercel (serverless)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");
const app = require("./app");

const PORT = process.env.PORT || 3001;

function ensureClienteFotoColumn() {
  const sql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'foto_url'`;
  db.query(sql, (err, rows) => {
    if (err)
      return console.error(
        "[MIGRATION] Falha ao verificar coluna foto_url:",
        err
      );
    const exists = rows && rows[0] && rows[0].cnt > 0;
    if (exists)
      return console.log("[MIGRATION] Coluna foto_url já existe em clientes.");
    const alter = "ALTER TABLE clientes ADD COLUMN foto_url VARCHAR(500) NULL";
    db.query(alter, (aErr) => {
      if (aErr)
        console.error("[MIGRATION] Erro ao adicionar coluna foto_url:", aErr);
      else
        console.log(
          "[MIGRATION] Coluna foto_url adicionada à tabela clientes."
        );
    });
  });
}

function ensureClienteRoleColumn() {
  const sql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'role'`;
  db.query(sql, (err, rows) => {
    if (err)
      return console.error(
        "[MIGRATION] Falha ao verificar coluna role em clientes:",
        err
      );
    const exists = rows && rows[0] && rows[0].cnt > 0;
    if (exists)
      return console.log("[MIGRATION] Coluna role já existe em clientes.");
    const alter =
      "ALTER TABLE clientes ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'cliente'";
    db.query(alter, (aErr) => {
      if (aErr)
        console.error(
          "[MIGRATION] Erro ao adicionar coluna role em clientes:",
          aErr
        );
      else
        console.log(
          "[MIGRATION] Coluna role adicionada à tabela clientes com default 'cliente'."
        );
    });
  });
}

function ensureAdminLogsTable() {
  const sql = `CREATE TABLE IF NOT EXISTS admin_logs (id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT NOT NULL, action VARCHAR(100) NOT NULL, target_table VARCHAR(100) NULL, target_id INT NULL, details TEXT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_admin_id (admin_id), INDEX idx_target (target_table, target_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  db.query(sql, (err) => {
    if (err)
      console.error("[MIGRATION] Erro ao garantir tabela admin_logs:", err);
    else console.log("[MIGRATION] Tabela admin_logs verificada/criada.");
  });
}

// Em ambiente serverless (Vercel) não chamamos listen(); exportamos o app.
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} 🚀`);
    ensureClienteFotoColumn();
    ensureClienteRoleColumn();
    try {
      ensureAdminLogsTable();
    } catch (e) {
      console.warn("[INIT] Falha ao garantir admin_logs:", e);
    }
  });
} else {
  module.exports = app;
}
