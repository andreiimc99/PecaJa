// Script para verificar e popular campo destaque nos desmanches
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const db = require("../db");

console.log("🔍 Verificando desmanches no banco...\n");

// Primeiro, verificar se a coluna destaque existe
const checkColumn = `
  SELECT COUNT(*) AS cnt 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'desmanches' 
    AND COLUMN_NAME = 'destaque'
`;

db.query(checkColumn, (err, result) => {
  if (err) {
    console.error("❌ Erro ao verificar coluna destaque:", err);
    process.exit(1);
  }

  const colunaExiste = result[0].cnt > 0;

  if (!colunaExiste) {
    console.log("⚠️  Coluna 'destaque' não existe. Criando...");
    const addColumn =
      "ALTER TABLE desmanches ADD COLUMN destaque TINYINT(1) NOT NULL DEFAULT 0 AFTER role";

    db.query(addColumn, (addErr) => {
      if (addErr) {
        console.error("❌ Erro ao adicionar coluna destaque:", addErr);
        process.exit(1);
      }
      console.log("✅ Coluna 'destaque' criada com sucesso!\n");
      verificarDesmanches();
    });
  } else {
    console.log("✅ Coluna 'destaque' já existe.\n");
    verificarDesmanches();
  }
});

function verificarDesmanches() {
  // Verificar todos os desmanches
  const sqlTodos = "SELECT id, nome, destaque FROM desmanches ORDER BY id";

  db.query(sqlTodos, (err, desmanches) => {
    if (err) {
      console.error("❌ Erro ao buscar desmanches:", err);
      process.exit(1);
    }

    console.log(`📊 Total de desmanches cadastrados: ${desmanches.length}`);

    if (desmanches.length === 0) {
      console.log("\n⚠️  Nenhum desmanche cadastrado no banco!");
      console.log(
        "   Por favor, cadastre desmanches antes de testá-los na vitrine."
      );
      db.end();
      process.exit(0);
    }

    console.log("\n📋 Lista de desmanches:");
    desmanches.forEach((d) => {
      const statusDestaque = d.destaque
        ? "⭐ EM DESTAQUE"
        : "  (não destacado)";
      console.log(`   ID ${d.id}: ${d.nome} ${statusDestaque}`);
    });

    // Contar quantos estão em destaque
    const emDestaque = desmanches.filter((d) => d.destaque === 1);
    console.log(`\n⭐ Desmanches em destaque: ${emDestaque.length}`);

    if (emDestaque.length === 0) {
      console.log("\n💡 Quer marcar TODOS os desmanches como destaque? (s/n)");
      console.log("   Você pode marcar manualmente depois no painel admin.");
      console.log(
        "\n   Marcando todos como destaque automaticamente em 3 segundos..."
      );

      setTimeout(() => {
        marcarTodosDestaque();
      }, 3000);
    } else {
      console.log("\n✅ Já existem desmanches em destaque!");
      console.log("   Eles devem aparecer na página principal.");
      testarEndpoint();
    }
  });
}

function marcarTodosDestaque() {
  const updateSql = "UPDATE desmanches SET destaque = 1";

  db.query(updateSql, (err, result) => {
    if (err) {
      console.error("❌ Erro ao atualizar desmanches:", err);
      process.exit(1);
    }

    console.log(
      `\n✅ ${result.affectedRows} desmanche(s) marcado(s) como destaque!`
    );
    testarEndpoint();
  });
}

function testarEndpoint() {
  console.log("\n🧪 Testando endpoint /api/public/desmanches-vitrine...");

  const sqlVitrine = `
    SELECT id, nome, horario, foto_url, destaque 
    FROM desmanches 
    WHERE destaque = 1 
    ORDER BY id DESC 
    LIMIT 3
  `;

  db.query(sqlVitrine, (err, rows) => {
    if (err) {
      console.error("❌ Erro ao testar query da vitrine:", err);
      db.end();
      process.exit(1);
    }

    console.log(`\n✅ Query retornou ${rows.length} desmanche(s):`);
    rows.forEach((d) => {
      console.log(`   - ${d.nome} (ID: ${d.id})`);
      console.log(`     Horário: ${d.horario || "Não informado"}`);
      console.log(`     Foto: ${d.foto_url || "Sem foto"}`);
    });

    console.log(
      "\n🎉 Tudo pronto! Os desmanches devem aparecer na página principal."
    );
    console.log("   Certifique-se de que:");
    console.log("   1. O backend está rodando (node server.js)");
    console.log("   2. O frontend está rodando (npm run dev)");
    console.log(
      "   3. NEXT_PUBLIC_API_URL está configurado no .env.local do front"
    );

    db.end();
    process.exit(0);
  });
}
