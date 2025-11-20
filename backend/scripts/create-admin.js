#!/usr/bin/env node
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const db = require("../db");
const bcrypt = require("bcrypt");

function getArg(name, def = undefined) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

(async () => {
  const email = getArg("email");
  const nome = getArg("nome");
  const senha = getArg("senha");
  const tipo = (getArg("tipo", "cliente") || "cliente").toLowerCase();
  if (!email || !nome || !senha) {
    console.error(
      "Uso: node scripts/create-admin.js --email <email> --nome <nome> --senha <senha> [--tipo cliente|desmanche]"
    );
    process.exit(1);
  }
  if (tipo !== "cliente" && tipo !== "desmanche") {
    console.error("Tipo inválido. Use 'cliente' ou 'desmanche'.");
    process.exit(1);
  }

  const conn = db.promise();
  try {
    const [existCli] = await conn.query(
      "SELECT id FROM clientes WHERE email = ?",
      [email]
    );
    const [existDes] = await conn.query(
      "SELECT id FROM desmanches WHERE email = ?",
      [email]
    );
    if (existCli.length || existDes.length) {
      console.log("Já existe um usuário com este email:");
      if (existCli.length) console.log("- clientes.id:", existCli[0].id);
      if (existDes.length) console.log("- desmanches.id:", existDes[0].id);
      process.exit(0);
    }

    const hash = await bcrypt.hash(senha, 10);
    let table = tipo === "cliente" ? "clientes" : "desmanches";
    const [result] = await conn.query(
      `INSERT INTO ${table} (nome, email, senha) VALUES (?, ?, ?)`,
      [nome, email, hash]
    );
    console.log(`Usuário criado em ${table} com id:`, result.insertId);
    console.log(
      "\nIMPORTANTE: para ter acesso ADMIN, defina no .env do backend uma das variáveis a seguir e reinicie o servidor:\n  ADMIN_EMAIL=",
      email,
      "\n  ou\n  ADMIN_ID=",
      result.insertId
    );
  } catch (e) {
    console.error("Falha ao criar usuário:", e);
    process.exit(1);
  } finally {
    db.end?.();
  }
})();
