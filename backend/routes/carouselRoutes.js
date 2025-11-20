const express = require("express");
const router = express.Router();
const db = require("../db");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticate, authorize } = require("../middleware/auth");

// Configurações
const upload = multer({ storage: multer.memoryStorage() });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Migração simples da tabela de banners
function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS carousel_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_url VARCHAR(500) NOT NULL,
      title VARCHAR(120) NULL,
      target_url VARCHAR(500) NULL,
      ordem INT NOT NULL DEFAULT 0,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  db.query(sql, (err) => {
    if (err) console.error("[CAROUSEL] Erro ao garantir tabela:", err);
    else console.log("[CAROUSEL] Tabela carousel_banners OK");
  });
}
ensureTable();

// Lista pública de banners ativos ordenados
router.get("/", (req, res) => {
  const sql =
    "SELECT id, image_url, title, target_url FROM carousel_banners WHERE ativo = 1 ORDER BY ordem ASC, id DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao listar banners" });
    res.json(rows);
  });
});

// Lista administrativa (tudo), requer autenticação de administrador
router.get("/admin", authenticate, authorize("admin"), (req, res) => {
  const sql =
    "SELECT id, image_url, title, target_url, ordem, ativo, created_at FROM carousel_banners ORDER BY ordem ASC, id DESC";
  db.query(sql, (err, rows) => {
    if (err)
      return res.status(500).json({ error: "Erro ao listar banners (admin)" });
    res.json(rows);
  });
});

// Criar banner (somente admin)
router.post(
  "/",
  authenticate,
  authorize("admin"),
  upload.single("image"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Imagem obrigatória." });
    const { title, target_url } = req.body || {};
    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const up = await cloudinary.uploader.upload(dataURI, {
        folder: "carousel_banners",
        resource_type: "auto",
      });
      const imageUrl = up.secure_url;

      // ordem = max(ordem)+1
      db.query(
        "SELECT IFNULL(MAX(ordem),0)+1 AS next_ordem FROM carousel_banners",
        (oErr, oRows) => {
          const ordem = !oErr && oRows[0] ? oRows[0].next_ordem : 0;
          const insertSql =
            "INSERT INTO carousel_banners (image_url, title, target_url, ordem) VALUES (?,?,?,?)";
          db.query(
            insertSql,
            [imageUrl, title || null, target_url || null, ordem],
            (iErr, result) => {
              if (iErr) {
                console.error("[CAROUSEL] Erro ao inserir banner:", iErr);
                return res
                  .status(500)
                  .json({ error: "Falha ao salvar banner." });
              }
              // Grava log administrativo
              try {
                const adminId = req.user && req.user.id ? req.user.id : null;
                const details = JSON.stringify({ title, target_url, ordem, image_url: imageUrl });
                db.query(
                  'INSERT INTO admin_logs (admin_id, action, target_table, target_id, details) VALUES (?,?,?,?,?)',
                  [adminId, 'create_carousel_banner', 'carousel_banners', result.insertId, details],
                  () => {}
                );
              } catch (e) {
                console.warn('[ADMIN LOG] Falha ao gravar log de banner:', e);
              }

              res.status(201).json({
                id: result.insertId,
                image_url: imageUrl,
                title: title || null,
                target_url: target_url || null,
                ordem,
              });
            }
          );
        }
      );
    } catch (e) {
      console.error("[CAROUSEL] Upload falhou:", e);
      res.status(500).json({ error: "Erro no upload da imagem." });
    }
  }
);

// Remover banner (somente admin)
router.delete("/:id", authenticate, authorize("admin"), (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM carousel_banners WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Erro ao remover banner" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Banner não encontrado" });
    // Log
    try {
      const adminId = req.user && req.user.id ? req.user.id : null;
      db.query('INSERT INTO admin_logs (admin_id, action, target_table, target_id) VALUES (?,?,?,?)', [adminId, 'delete_carousel_banner', 'carousel_banners', id], () => {});
    } catch (e) {
      console.warn('[ADMIN LOG] Falha ao gravar log de exclusão de banner:', e);
    }
    res.json({ message: "Banner removido." });
  });
});

// Toggle ativo (somente admin)
router.patch(
  "/:id/toggle",
  authenticate,
  authorize("admin"),
  (req, res) => {
    const { id } = req.params;
    db.query(
      "UPDATE carousel_banners SET ativo = IF(ativo=1,0,1) WHERE id = ?",
      [id],
      (err) => {
        if (err)
          return res.status(500).json({ error: "Erro ao alternar banner" });
        try {
          const adminId = req.user && req.user.id ? req.user.id : null;
          db.query('INSERT INTO admin_logs (admin_id, action, target_table, target_id) VALUES (?,?,?,?)', [adminId, 'toggle_carousel_banner', 'carousel_banners', id], () => {});
        } catch (e) {
          console.warn('[ADMIN LOG] Falha ao gravar log toggle banner:', e);
        }
        res.json({ message: "Banner alternado." });
      }
    );
  }
);

module.exports = router;
