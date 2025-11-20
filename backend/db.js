const mysql = require("mysql2");
const path = require("path");
// Garante que carregamos o .env do diretório do backend
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Usa um pool de conexões. Isso permite usar `db.promise().getConnection()`
// e obter conexões para transações sem problemas.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Testa obter/soltar uma conexão do pool ao iniciar
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Erro ao conectar no banco de dados:", err);
    return;
  }
  console.log("Conectado ao banco de dados MySQL (pool)! 🚀");
  if (connection) connection.release();
});

module.exports = pool;
