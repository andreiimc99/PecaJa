/**
 * Script para criar um usuário admin na tabela `clientes`.
 * Uso:
 *   node createAdmin.js [--nome "Nome"] [--sobrenome "Sobrenome"] [--cpf "00000000000"] [--email "admin@admin.com"] [--senha "123456"] [--telefone "+5511999999999"]
 *
 * Por segurança, este script evita inserir duplicatas (verifica CPF/email) e
 * sempre grava a senha como hash bcrypt.
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
  const nome = opts.nome || 'Admin';
  const sobrenome = opts.sobrenome || 'Técnico';
  const CPF = opts.cpf || opts.CPF || '00000000000';
  const email = opts.email || 'admin@admin.com';
  const senha = opts.senha || '123456';
  const telefone = opts.telefone || null;
  const foto_url = opts.foto_url || null;

  if (!email || !senha) {
    console.error('Email e senha são obrigatórios.');
    process.exit(1);
  }

  try {
    // Verifica duplicidade por email ou CPF
    const dupSql = 'SELECT id FROM clientes WHERE email = ? OR CPF = ? LIMIT 1';
    db.query(dupSql, [email, CPF], async (err, rows) => {
      if (err) {
        console.error('Erro ao verificar duplicidade:', err);
        process.exit(1);
      }
      if (rows && rows.length > 0) {
        console.error('Já existe um cliente com esse email ou CPF. Aborting.');
        process.exit(2);
      }

      try {
        const hash = await bcrypt.hash(senha, 10);
        // Monta colunas de insert. A tabela 'clientes' no projeto exige nome, sobrenome, CPF, email, senha.
        const cols = ['nome','sobrenome','CPF','email','senha','telefone','role'];
        const vals = [nome, sobrenome, CPF, email, hash, telefone, 'admin'];

        // Se a coluna foto_url existe, adiciona NULL se fornecido
        const checkFotoSql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'foto_url'`;
        db.query(checkFotoSql, (cErr, cRows) => {
          if (cErr) {
            console.warn('Não foi possível checar coluna foto_url, prosseguindo sem ela.', cErr);
          }
          const hasFoto = cRows && cRows[0] && cRows[0].cnt > 0;
          let sql;
          let params;
          if (hasFoto) {
            sql = `INSERT INTO clientes (${cols.concat('foto_url').join(',')}) VALUES (?,?,?,?,?,?,?,?)`;
            params = vals.concat([foto_url]);
          } else {
            sql = `INSERT INTO clientes (${cols.join(',')}) VALUES (?,?,?,?,?,?,?)`;
            params = vals;
          }

          db.query(sql, params, (iErr, result) => {
            if (iErr) {
              console.error('Erro ao inserir cliente admin:', iErr);
              process.exit(1);
            }
            console.log('Admin criado com sucesso. id=', result.insertId, ' email=', email);
            process.exit(0);
          });
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
