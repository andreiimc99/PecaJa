/**
 * Script para atualizar a senha de um cliente (hash bcrypt + UPDATE).
 * Uso:
 *   node resetPassword.js --email user@exemplo.com --senha NovaSenha123
 *
 * Observações:
 * - Gera hash bcrypt com 10 rounds e atualiza o campo `senha` da tabela `clientes`.
 * - Verifica se o cliente existe antes de atualizar.
 */
const db = require('../db');
const bcrypt = require('bcrypt');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function run() {
  const opts = parseArgs();
  const email = opts.email;
  const senha = opts.senha;

  if (!email || !senha) {
    console.error('Uso: node resetPassword.js --email user@exemplo.com --senha NovaSenha123');
    process.exit(1);
  }

  try {
    // Confirma existência do usuário
    db.query('SELECT id FROM clientes WHERE email = ? LIMIT 1', [email], async (err, rows) => {
      if (err) {
        console.error('Erro ao consultar o banco:', err);
        process.exit(1);
      }
      if (!rows || rows.length === 0) {
        console.error('Usuário não encontrado com o email informado:', email);
        process.exit(2);
      }

      try {
        const hash = await bcrypt.hash(senha, 10);
        db.query('UPDATE clientes SET senha = ? WHERE email = ?', [hash, email], (uErr, result) => {
          if (uErr) {
            console.error('Erro ao atualizar a senha:', uErr);
            process.exit(1);
          }
          console.log('Senha atualizada com sucesso para', email);
          process.exit(0);
        });
      } catch (hErr) {
        console.error('Erro ao gerar hash da senha:', hErr);
        process.exit(1);
      }
    });
  } catch (e) {
    console.error('Erro inesperado:', e);
    process.exit(1);
  }
}

run();
