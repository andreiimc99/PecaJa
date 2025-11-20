// Importa a conexão com o banco de dados do seu arquivo db.js
const db = require("../db"); // <-- 1. CAMINHO CORRIGIDO

// --- FUNÇÕES DO CONTROLLER ---

// Lógica para ADICIONAR um favorito
exports.adicionarFavorito = async (req, res) => {
  // O ID do usuário vem do middleware de autenticação (req.user)
  const usuarioId = req.user.id;
  // O ID da peça vem do corpo da requisição do frontend
  const { pecaId } = req.body;

  if (!pecaId) {
    return res.status(400).json({ error: "O ID da peça é obrigatório." });
  }

  try {
    // 2. SINTAXE SQL AJUSTADA PARA MYSQL (usa '?')
    const query = `
      INSERT INTO favoritos (usuario_id, peca_id) 
      VALUES (?, ?);
    `;
    const values = [usuarioId, pecaId];

    // Usa a interface de promises do mysql2
    await db.promise().query(query, values);

    res
      .status(201)
      .json({ message: "Peça adicionada aos favoritos com sucesso!" });
  } catch (error) {
    // 3. CÓDIGO DE ERRO AJUSTADO PARA MYSQL
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Esta peça já está nos seus favoritos." });
    }
    console.error("Erro ao adicionar favorito:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Lógica para REMOVER um favorito
exports.removerFavorito = async (req, res) => {
  const usuarioId = req.user.id;
  const { pecaId } = req.params;

  try {
    const query = `
      DELETE FROM favoritos 
      WHERE usuario_id = ? AND peca_id = ?;
    `;
    const values = [usuarioId, pecaId];

    const [result] = await db.promise().query(query, values);

    // 4. TRATAMENTO DE RESULTADO AJUSTADO PARA MYSQL
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Favorito não encontrado para este usuário." });
    }

    res
      .status(200)
      .json({ message: "Peça removida dos favoritos com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover favorito:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Lógica para LISTAR os favoritos
exports.listarFavoritos = async (req, res) => {
  const usuarioId = req.user.id;

  try {
    const query = `
            SELECT p.*, d.nome AS nome_desmanche
            FROM pecas p
            INNER JOIN favoritos f ON p.id = f.peca_id
            LEFT JOIN desmanches d ON p.desmanche_id = d.id
            WHERE f.usuario_id = ?;
        `;
    const values = [usuarioId];

    const [rows] = await db.promise().query(query, values);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao listar favoritos:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

// Lógica para VERIFICAR o status de um favorito
exports.verificarStatusFavorito = async (req, res) => {
  const usuarioId = req.user.id;
  const { pecaId } = req.params;

  try {
    const query = `
            SELECT COUNT(*) AS count FROM favoritos
            WHERE usuario_id = ? AND peca_id = ?;
        `;
    const values = [usuarioId, pecaId];

    const [rows] = await db.promise().query(query, values);

    const isFavorited = rows[0].count > 0;

    res.status(200).json({ isFavorited });
  } catch (error) {
    console.error("Erro ao verificar status de favorito:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};
