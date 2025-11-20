// backend/routes/desmancheRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticate, authorize } = require("../middleware/auth");

// ... (configuração do Cloudinary e Multer permanece a mesma) ...
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
const upload = multer({ storage: multer.memoryStorage() });

// Rota para o desmanche buscar os PRÓPRIOS dados completos
router.get("/meu-perfil", authenticate, authorize("desmanche"), (req, res) => {
  const idDoUsuarioLogado = req.user.id;
  const sql = `
    SELECT id, nome, email, cnpj, telefone, endereco, horario, descricao, foto_url
    FROM desmanches WHERE id = ?
  `;
  db.query(sql, [idDoUsuarioLogado], (err, results) => {
    if (err) {
      console.error("Erro ao buscar perfil do desmanche:", err);
      return res.status(500).json({ error: "Erro ao buscar perfil" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Perfil não encontrado" });
    }
    res.json(results[0]);
  });
});

// Rota para buscar o perfil PÚBLICO de um desmanche - AJUSTADA PARA INCLUIR ESTOQUE
router.get("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  // Passo 1: Buscar os dados do perfil do desmanche.
  const perfilSql = `
    SELECT id, nome, email, telefone, endereco, horario, descricao, foto_url
    FROM desmanches WHERE id = ?
  `;
  db.query(perfilSql, [id], (err, perfilResults) => {
    if (err) {
      console.error("Erro ao buscar desmanche:", err);
      return res.status(500).json({ error: "Erro ao buscar desmanche" });
    }
    if (perfilResults.length === 0) {
      return res.status(404).json({ error: "Desmanche não encontrado" });
    }

    const perfil = perfilResults[0];

    // Passo 2: Buscar as peças (estoque) que pertencem a esse desmanche.
    // Esta lógica é baseada na sua rota GET em 'pecaRoutes.js'.
    const estoqueSql =
      "SELECT id, nome, descricao, preco, foto_url FROM pecas WHERE desmanche_id = ?";
    db.query(estoqueSql, [id], (err, estoqueResults) => {
      if (err) {
        console.error("Erro ao buscar estoque do desmanche:", err);
        return res.status(500).json({ error: "Erro ao buscar estoque" });
      }

      // Passo 3: Juntar o perfil e o estoque em uma única resposta.
      const respostaCompleta = {
        ...perfil, // Copia todos os dados do perfil
        estoque: estoqueResults, // Adiciona a chave 'estoque' com a lista de peças
      };

      res.json(respostaCompleta);
    });
  });
});

// ... (o restante do arquivo 'desmancheRoutes.js' permanece exatamente o mesmo) ...

// Rota de CADASTRO de desmanche
router.post("/", async (req, res) => {
  const { nome, cnpj, email, senha, telefone, endereco, horario, descricao } =
    req.body;
  if (!nome || !cnpj || !email || !senha) {
    return res
      .status(400)
      .json({ error: "Preencha Razão Social, CNPJ, e-mail e senha!" });
  }
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const sql = `
      INSERT INTO desmanches (nome, cnpj, email, senha, telefone, endereco, horario, descricao, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'desmanche')
    `;
    db.query(
      sql,
      [
        nome,
        cnpj,
        email,
        senhaHash,
        telefone || null,
        endereco || null,
        horario || null,
        descricao || null,
      ],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY")
            return res
              .status(409)
              .json({ error: "CNPJ ou E-mail já cadastrado." });
          throw err;
        }
        res
          .status(201)
          .json({
            message: "Desmanche criado com sucesso!",
            id: result.insertId,
          });
      }
    );
  } catch (err) {
    console.error("Erro ao criptografar senha:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota de ATUALIZAÇÃO de perfil
router.put(
  "/:id",
  authenticate,
  authorize("desmanche"),
  upload.single("foto_url"),
  async (req, res) => {
    const { id } = req.params;
    if (req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { nome, email, telefone, endereco, horario, descricao } = req.body;
    let fotoUrlFinal = req.body.foto_url_existente || null;

    try {
      if (req.file) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const resultadoUpload = await cloudinary.uploader.upload(dataURI, {
          folder: "perfis_desmanche",
          resource_type: "auto",
        });
        fotoUrlFinal = resultadoUpload.secure_url;
      }

      const sql = `
      UPDATE desmanches
      SET nome = ?, email = ?, telefone = ?, endereco = ?, horario = ?, descricao = ?, foto_url = ?
      WHERE id = ?
    `;
      db.query(
        sql,
        [nome, email, telefone, endereco, horario, descricao, fotoUrlFinal, id],
        (err) => {
          if (err) throw err;
          res.json({
            message: "Desmanche atualizado com sucesso!",
            novaFotoUrl: fotoUrlFinal,
          });
        }
      );
    } catch (err) {
      console.error("Erro no upload da imagem ou atualização:", err);
      return res.status(500).json({ error: "Erro ao processar a imagem." });
    }
  }
);

// Rota para DELETAR o perfil
router.delete("/:id", authenticate, authorize("desmanche"), (req, res) => {
  const { id } = req.params;
  if (req.user.id !== parseInt(id, 10)) {
    return res.status(403).json({ error: "Acesso negado." });
  }
  db.query("DELETE FROM desmanches WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Erro ao deletar desmanche:", err);
      return res.status(500).json({ error: "Erro ao deletar desmanche" });
    }
    res.json({ message: "Desmanche deletado com sucesso!" });
  });
});

module.exports = router;
