// backend/routes/clienteRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt"); // AJUSTE: Importa o bcrypt para segurança da senha
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// AJUSTE: Importa os middlewares para serem usados seletivamente
const { authenticate, authorize } = require("../middleware/auth");

// Configuração de upload (memória) e Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Log básico de requisições neste router (método, url e content-type)
router.use((req, _res, next) => {
  console.log(
    `[CLIENTES] ${req.method} ${req.originalUrl} content-type=${
      req.headers["content-type"] || "-"
    } user=${req.user?.id || "-"} `
  );
  next();
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ROTA DE CADASTRO (POST /) - Pública, com suporte opcional a imagem de perfil
// Campo do arquivo: 'foto_url'
router.post("/", upload.single("foto_url"), async (req, res) => {
  const { nome, sobrenome, CPF, email, senha, telefone } = req.body || {};
  if (!nome || !sobrenome || !CPF || !email || !senha) {
    return res
      .status(400)
      .json({ error: "Preencha todos os campos obrigatórios!" });
  }

  try {
    // AJUSTE: Criptografa a senha antes de salvar no banco
    const senhaHash = await bcrypt.hash(senha, 10);

    // Verifica se a coluna foto_url existe em 'clientes'
    const checkColumnSql = `
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'foto_url'
    `;
    const [colRows] = await db.promise().query(checkColumnSql);
    const hasFotoColumn = colRows && colRows[0] && colRows[0].cnt > 0;

    // Faz upload da imagem, se enviada
    let fotoUrlFinal = null;
    if (req.file) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const up = await cloudinary.uploader.upload(dataURI, {
          folder: "perfis_clientes",
          resource_type: "auto",
        });
        fotoUrlFinal = up.secure_url;
      } catch (upErr) {
        console.error("Erro no upload da foto do cliente:", upErr);
        // Não falha o cadastro por causa da foto; segue sem foto
        fotoUrlFinal = null;
      }
    }

    // Monta SQL conforme presença da coluna foto_url
    const sqlBaseCols = [
      "nome",
      "sobrenome",
      "CPF",
      "email",
      "senha",
      "telefone",
      "role",
    ];
    const sqlBaseVals = [
      nome,
      sobrenome,
      CPF,
      email,
      senhaHash,
      telefone || null,
      "cliente",
    ];
    let sql;
    let params;
    if (hasFotoColumn) {
      sql = `INSERT INTO clientes (${sqlBaseCols
        .concat("foto_url")
        .join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      params = [...sqlBaseVals, fotoUrlFinal];
    } else {
      sql = `INSERT INTO clientes (${sqlBaseCols.join(
        ", "
      )}) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      params = sqlBaseVals;
    }

    db.query(sql, params, (err, result) => {
      if (err) {
        // Trata erro de email ou CPF duplicado
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ error: "CPF ou E-mail já cadastrado." });
        }
        console.error("Erro ao criar cliente:", err);
        return res.status(500).json({ error: "Erro ao criar cliente" });
      }
      res.status(201).json({
        message: "Cliente criado com sucesso!",
        cliente: {
          id: result.insertId,
          nome,
          sobrenome,
          CPF,
          email,
          telefone,
          foto_url: fotoUrlFinal || null,
        },
      });
    });
  } catch (err) {
    console.error("Erro ao criptografar senha:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Buscar cliente pelo ID - Rota Protegida
// AJUSTE: Adicionados middlewares para garantir que só o próprio cliente logado acesse seus dados.
router.get("/:id", authenticate, authorize("cliente"), async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== parseInt(id, 10)) {
    return res
      .status(403)
      .json({ error: "Acesso negado. Você só pode ver seu próprio perfil." });
  }

  // Primeiro tenta com foto_url; se a coluna não existir, faz fallback sem ela
  const sqlWithFoto =
    "SELECT id, nome, sobrenome, CPF, email, telefone, foto_url FROM clientes WHERE id = ?";
  try {
    const [rows] = await db.promise().query(sqlWithFoto, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    return res.json(rows[0]);
  } catch (err) {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      // Fallback sem a coluna
      return db.query(
        "SELECT id, nome, sobrenome, CPF, email, telefone FROM clientes WHERE id = ?",
        [id],
        (e2, results) => {
          if (e2)
            return res.status(500).json({ error: "Erro ao buscar cliente" });
          if (!results.length)
            return res.status(404).json({ error: "Cliente não encontrado" });
          return res.json(results[0]);
        }
      );
    }
    console.error("Erro ao buscar cliente:", err);
    return res.status(500).json({ error: "Erro ao buscar cliente" });
  }
});

// Atualizar cliente - Rota Protegida
// AJUSTE: Adicionados middlewares para proteger a rota.
router.put(
  "/:id",
  authenticate,
  authorize("cliente"),
  upload.single("foto_url"),
  async (req, res) => {
    const { id } = req.params;

    if (req.user.id !== parseInt(id, 10)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { nome, sobrenome, CPF, email, telefone } = req.body || {};

    if (!nome || !sobrenome || !CPF || !email) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    // Descobre se a coluna foto_url existe
    let hasFotoColumn = false;
    try {
      const [colRows] = await db.promise().query(`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' AND COLUMN_NAME = 'foto_url'
    `);
      hasFotoColumn = colRows && colRows[0] && colRows[0].cnt > 0;
    } catch {}

    // Se veio arquivo, envia ao Cloudinary
    let fotoUrlFinal = null;
    if (req.file) {
      try {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const up = await cloudinary.uploader.upload(dataURI, {
          folder: "perfis_clientes",
          resource_type: "auto",
        });
        fotoUrlFinal = up.secure_url;
      } catch (upErr) {
        console.error("Erro ao fazer upload da foto do cliente:", upErr);
        // segue sem alterar a foto
        fotoUrlFinal = null;
      }
    }

    try {
      if (hasFotoColumn && fotoUrlFinal) {
        const sql = `
        UPDATE clientes
        SET nome = ?, sobrenome = ?, CPF = ?, email = ?, telefone = ?, foto_url = ?
        WHERE id = ?
      `;
        await db
          .promise()
          .query(sql, [
            nome,
            sobrenome,
            CPF,
            email,
            telefone || null,
            fotoUrlFinal,
            id,
          ]);
        return res.json({
          message: "Cliente atualizado com sucesso!",
          novaFotoUrl: fotoUrlFinal,
        });
      } else {
        const sql = `
        UPDATE clientes
        SET nome = ?, sobrenome = ?, CPF = ?, email = ?, telefone = ?
        WHERE id = ?
      `;
        await db
          .promise()
          .query(sql, [nome, sobrenome, CPF, email, telefone || null, id]);
        return res.json({ message: "Cliente atualizado com sucesso!" });
      }
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);
      return res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  }
);

// Outras rotas como GET all e DELETE foram omitidas para manter o foco na correção,
// mas elas também deveriam ter middlewares de proteção adequados (ex: para um admin).

module.exports = router;
