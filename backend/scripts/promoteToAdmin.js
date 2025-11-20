// Script simples para promover um cliente existente para role 'admin'
// Uso: node promoteToAdmin.js <cliente_id>
const db = require('../db');

const id = process.argv[2];
if (!id) {
  console.error('Usage: node promoteToAdmin.js <cliente_id>');
  process.exit(1);
}

const sql = "UPDATE clientes SET role = 'admin' WHERE id = ?";
db.query(sql, [id], (err, result) => {
  if (err) {
    console.error('Erro ao promover cliente:', err);
    process.exit(1);
  }
  if (result.affectedRows === 0) {
    console.error('Cliente não encontrado.');
    process.exit(2);
  }
  console.log('Cliente promovido a admin com sucesso (id=', id, ').');
  process.exit(0);
});
