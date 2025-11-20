// Script de teste rápido para verificar a resposta da API
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

console.log(`🧪 Testando endpoint: ${apiUrl}/api/public/desmanches-vitrine\n`);

fetch(`${apiUrl}/api/public/desmanches-vitrine`)
  .then((response) => {
    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then((data) => {
    console.log("\n📦 Resposta recebida:");
    console.log(JSON.stringify(data, null, 2));

    if (data.rows && Array.isArray(data.rows)) {
      console.log(`\n✅ ${data.rows.length} desmanche(s) retornado(s):`);
      data.rows.forEach((d) => {
        console.log(`   - ${d.nome} (ID: ${d.id})`);
      });
    } else {
      console.log("\n⚠️  Formato inesperado de resposta!");
    }
  })
  .catch((error) => {
    console.error("\n❌ Erro ao buscar desmanches:", error.message);
    console.log(
      "\n💡 Certifique-se de que o backend está rodando em http://localhost:3001"
    );
  });
