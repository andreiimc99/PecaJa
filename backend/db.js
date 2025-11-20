const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Erro ao conectar no banco de dados:", err);
        return;
      }
      console.log("Conectado ao banco de dados MySQL (pool)! 🚀");
      if (connection) connection.release();
    });
  }
  return pool;
}

module.exports = getPool();
