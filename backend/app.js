const express = require("express");
const cors = require("cors");
const path = require("path");
// Carrega .env específico do backend (independente do CWD)
require("dotenv").config({ path: path.join(__dirname, ".env") });

const db = require("./db");
const clienteRoutes = require("./routes/clienteRoutes");
const desmancheRoutes = require("./routes/desmancheRoutes");
const loginRoutes = require("./routes/loginRoutes");
const pecaRoutes = require("./routes/pecaRoutes");
const favoritosRoutes = require("./routes/favoritosRoutes");
const carouselRoutes = require("./routes/carouselRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");

const { authenticate } = require("./middleware/auth");

const app = express();

// Servir arquivos estáticos de exemplo (pasta public) para o frontend de teste
app.use(express.static(path.join(__dirname, "public")));

// Middlewares globais
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rota de teste
app.get("/", (req, res) => {
  res.send("API PeçaJá rodando! 🚀");
});

// Rota de health para verificar conexão com o banco no Vercel
app.get('/api/health', (req, res) => {
  const stats = {
    dbHostDefined: !!process.env.DB_HOST,
    dbNameDefined: !!process.env.DB_NAME,
    nodeEnv: process.env.NODE_ENV || null
  };
  // Teste simples de query
  db.query('SELECT 1 AS ok', (err, rows) => {
    if (err) {
      return res.status(500).json({ ok: false, error: err.message, ...stats });
    }
    res.json({ ok: true, result: rows && rows[0], ...stats });
  });
});

// Reusar as mesmas funções de migração/garantia de tabelas do server.js original
function ensureFavoritosTable() {
  const sql = `CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id INT NOT NULL,
    peca_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, peca_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  db.query(sql, (err) => {
    if (err) console.error("[INIT] Erro ao criar tabela favoritos:", err);
    else console.log("[INIT] Tabela 'favoritos' verificada/criada.");
  });
}
ensureFavoritosTable();

function ensureMovimentacoesEstoqueTable() {
  const sql = `CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INT NOT NULL AUTO_INCREMENT,
    peca_id INT NOT NULL,
    desmanche_id INT NOT NULL,
    tipo_movimentacao VARCHAR(20) NOT NULL,
    quantidade_movimentada INT NOT NULL,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_mov_desmanche (desmanche_id),
    INDEX idx_mov_peca (peca_id),
    INDEX idx_mov_data (data_movimentacao)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
  db.query(sql, (err) => {
    if (err) console.error("[INIT] Erro ao criar tabela movimentacoes_estoque:", err);
    else console.log("[INIT] Tabela 'movimentacoes_estoque' verificada/criada.");
  });
}
ensureMovimentacoesEstoqueTable();

function ensureMovimentacoesExtras() {
  const checkCol = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'movimentacoes_estoque' AND COLUMN_NAME = 'peca_nome_snapshot'`;
  db.query(checkCol, (err, rows) => {
    if (err) {
      console.error("[INIT] Falha ao verificar coluna peca_nome_snapshot:", err);
    } else if (rows && rows[0] && rows[0].cnt === 0) {
      const alter = "ALTER TABLE movimentacoes_estoque ADD COLUMN peca_nome_snapshot VARCHAR(255) NULL AFTER quantidade_movimentada";
      db.query(alter, (aErr) => {
        if (aErr) console.error("[INIT] Erro ao adicionar coluna peca_nome_snapshot:", aErr);
        else console.log("[INIT] Coluna peca_nome_snapshot adicionada a movimentacoes_estoque.");
      });
    } else {
      console.log("[INIT] Coluna peca_nome_snapshot já existe.");
    }
  });
}
ensureMovimentacoesExtras();

// Garantir coluna 'destaque' na tabela desmanches (para marcar em destaque na vitrine)
function ensureDesmancheDestaqueColumn() {
  const checkCol = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'desmanches' AND COLUMN_NAME = 'destaque'`;
  db.query(checkCol, (err, rows) => {
    if (err) {
      console.error("[INIT] Falha ao verificar coluna destaque em desmanches:", err);
    } else if (rows && rows[0] && rows[0].cnt === 0) {
      const alter = "ALTER TABLE desmanches ADD COLUMN destaque TINYINT(1) NOT NULL DEFAULT 0 AFTER role";
      db.query(alter, (aErr) => {
        if (aErr) console.error("[INIT] Erro ao adicionar coluna destaque:", aErr);
        else console.log("[INIT] Coluna 'destaque' adicionada a desmanches.");
      });
    } else {
      console.log("[INIT] Coluna 'destaque' já existe em desmanches.");
    }
  });
}
ensureDesmancheDestaqueColumn();

// Rotas de autenticação e login
app.use("/api/login", loginRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/desmanches", desmancheRoutes);
app.use("/api/pecas", pecaRoutes);
app.use("/api/favoritos", authenticate, favoritosRoutes);
app.use("/api/carousel", carouselRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Middleware global de tratamento de erros para evitar página HTML
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  if (res.headersSent) return next(err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || "Erro interno" });
});

module.exports = app;
