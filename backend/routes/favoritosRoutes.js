const express = require("express");
const router = express.Router();

// 1. CORREÇÃO: Importa a função 'authenticate' diretamente do middleware.
const { authenticate } = require("../middleware/auth");

// 2. Importe o controller que terá a lógica
const favoritosController = require("../controllers/favoritosController");

// 3. CORREÇÃO: Aplica o middleware 'authenticate' corretamente.
// Isso garante que apenas usuários logados possam acessar estas rotas.
router.use(authenticate);

// Log simples para cada requisição às rotas de favoritos (após autenticação)
router.use((req, _res, next) => {
  const uid = req.user ? req.user.id : "anon";
  console.log(`[FAVORITOS] ${req.method} ${req.originalUrl} user=${uid}`);
  next();
});

// --- DEFINIÇÃO DAS ROTAS ---

// Rota para ADICIONAR uma peça aos favoritos
// POST /api/favoritos
router.post("/", favoritosController.adicionarFavorito);

// Rota para REMOVER uma peça dos favoritos
// DELETE /api/favoritos/:pecaId
router.delete("/:pecaId", favoritosController.removerFavorito);

// Rota para LISTAR todas as peças favoritas do usuário logado
// GET /api/favoritos
router.get("/", favoritosController.listarFavoritos);

// Rota para VERIFICAR se uma peça específica JÁ É favorita
// GET /api/favoritos/status/:pecaId
router.get("/status/:pecaId", favoritosController.verificarStatusFavorito);

module.exports = router;
