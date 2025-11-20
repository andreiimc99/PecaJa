// routes/pecaRoutes.js
const express = require("express");
const router = express.Router();
console.log("[ROUTES LOAD] Iniciando carregamento de pecaRoutes");
const db = require("../db"); // Assume que 'db' é uma conexão simples ou pool
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { authenticate, authorize } = require("../middleware/auth");
// Importações para CSV
const { Parser } = require("json2csv");
const csv = require("csv-parser");
const stream = require("stream");

// Configura o Multer para upload em memória
const upload = multer({ storage: multer.memoryStorage() });

// Configuração Cloudinary (se variáveis existirem). Evita falha silenciosa no upload.
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("[CLOUDINARY] Configurado para pecas");
} else {
  console.log(
    "[CLOUDINARY] Variáveis ausentes (CLOUDINARY_*). Upload de imagem de peça ficará desativado."
  );
}

// Rota pública de diagnóstico: busca peça por ID sem exigir token.
// Útil para validar rapidamente se o registro existe e qual DB estamos consultando.
router.get("/public/:id", (req, res) => {
  const pid = parseInt(req.params.id, 10);
  if (Number.isNaN(pid)) return res.status(400).json({ error: "ID inválido" });
  const sqlPeca = "SELECT * FROM pecas WHERE id = ?";
  db.query(sqlPeca, [pid], (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "Peça não encontrada" });

    const peca = rows[0];
    const sqlDes = "SELECT nome FROM desmanches WHERE id = ? LIMIT 1";
    db.query(sqlDes, [peca.desmanche_id], (derr, drows) => {
      if (derr) {
        // Mesmo se falhar ao buscar o nome, devolvemos a peça.
        return res.json({ ...peca, nome_desmanche: null });
      }
      const nome_desmanche = drows && drows[0] ? drows[0].nome : null;
      return res.json({ ...peca, nome_desmanche });
    });
  });
});

// Criar peça (rota protegida para desmanches)
router.post(
  "/",
  authenticate,
  authorize("desmanche"),
  upload.single("foto_url"),
  async (req, res) => {
    const {
      nome,
      descricao,
      preco,
      quantidade,
      marca,
      modelo,
      ano,
      tipo,
      quantidade_minima,
    } = req.body || {};
    const desmanche_id = req.user.id;
    let fotoUrlFinal = null;

    if (
      !nome ||
      !descricao ||
      preco == null ||
      quantidade == null ||
      !marca ||
      !modelo ||
      !ano ||
      !tipo
    ) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios!" });
    }

    try {
      // Upload opcional: se não houver credenciais ou arquivo, seguimos sem foto.
      if (req.file) {
        if (cloudinary.config().cloud_name) {
          try {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const resultadoUpload = await cloudinary.uploader.upload(dataURI, {
              folder: "pecas",
              resource_type: "auto",
            });
            fotoUrlFinal = resultadoUpload.secure_url;
          } catch (upErr) {
            console.error("[PECA] Falha upload Cloudinary, seguindo sem foto.", upErr);
            fotoUrlFinal = null;
          }
        } else {
          console.warn("[PECA] Cloudinary não configurado; peça criada sem foto.");
          fotoUrlFinal = null;
        }
      }

      const sql = `
        INSERT INTO pecas (nome, descricao, preco, quantidade, marca, modelo, ano, tipo, foto_url, desmanche_id, quantidade_minima)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(
        sql,
        [
          nome,
          descricao,
          parseFloat(preco),
          parseInt(quantidade),
          marca,
          modelo,
          ano,
          tipo,
          fotoUrlFinal,
          desmanche_id,
          parseInt(quantidade_minima || 1),
        ],
        (err, result) => {
          if (err) {
            console.error("Erro ao criar peça:", err);
            return res.status(500).json({ error: "Erro ao criar peça" });
          }

          // Registra movimentação de ENTRADA
          const pecaId = result.insertId;
          const qtdMov =
            Number.isFinite(parseInt(quantidade)) && parseInt(quantidade) > 0
              ? parseInt(quantidade)
              : 1;
          const sqlMov = `INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada, peca_nome_snapshot) VALUES (?,?,?,?,?)`;
          db.query(
            sqlMov,
            [pecaId, desmanche_id, "entrada", qtdMov, nome],
            (movErr) => {
              if (movErr) {
                console.error(
                  "[CREATE] Falha ao registrar movimentação de entrada:",
                  movErr
                );
              } else {
                console.log("[CREATE] Movimentação de entrada registrada", {
                  peca_id: pecaId,
                  desmanche_id,
                  qtdMov,
                });
              }
              return res.status(201).json({
                message: "Peça criada com sucesso!",
                peca: { id: pecaId, nome, foto_url: fotoUrlFinal },
              });
            }
          );
        }
      );
    } catch (err) {
      console.error("Erro no cadastro da peça:", err);
      res.status(500).json({ error: "Erro ao criar peça (imagem/operação)." });
    }
  }
);

// MÉTRICAS (rota protegida) - permanece antes de rotas com :id
router.get("/metrics", authenticate, authorize("desmanche"), (req, res) => {
  const desmanche_id = req.user.id;
  console.log(
    "[DEBUG] GET /api/pecas/metrics invoked (pre-:id) for desmanche_id=",
    desmanche_id
  );

  const metrics = {};
  const checkColumnSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pecas' AND COLUMN_NAME = 'interesses_count'
  `;
  const sqlLowStock = `SELECT COUNT(*) AS low_stock FROM pecas WHERE desmanche_id = ? AND quantidade <= IFNULL(quantidade_minima,1)`;
  const sqlTop5 = `SELECT id, nome, quantidade FROM pecas WHERE desmanche_id = ? ORDER BY quantidade DESC LIMIT 5`;
  const sqlMov = `SELECT me.id, me.data_movimentacao, COALESCE(p.nome, me.peca_nome_snapshot, CONCAT('Peça #', me.peca_id)) AS nome_produto, me.tipo_movimentacao, me.quantidade_movimentada
                 FROM movimentacoes_estoque me LEFT JOIN pecas p ON me.peca_id = p.id
                 WHERE me.desmanche_id = ?
                 ORDER BY me.data_movimentacao DESC LIMIT 8`;
  const sqlDist = `SELECT tipo, COUNT(*) AS cnt FROM pecas WHERE desmanche_id = ? GROUP BY tipo`;
  const sqlLowList = `SELECT id, nome, quantidade, quantidade_minima FROM pecas WHERE desmanche_id = ? AND quantidade <= IFNULL(quantidade_minima,1) ORDER BY quantidade ASC LIMIT 10`;

  db.query(checkColumnSql, (err, colRes) => {
    if (err) {
      console.error("Erro ao verificar schema de pecas:", err);
      return res
        .status(500)
        .json({ error: "Erro ao calcular métricas (schema)." });
    }

    const hasInteresses = (colRes && colRes[0] && colRes[0].cnt > 0) || false;
    const sqlTotals = hasInteresses
      ? `SELECT COUNT(*) AS total, SUM(IFNULL(interesses_count,0)) AS total_interesses FROM pecas WHERE desmanche_id = ?`
      : `SELECT COUNT(*) AS total FROM pecas WHERE desmanche_id = ?`;

    db.query(sqlTotals, [desmanche_id], (err, totals) => {
      if (err) {
        console.error("Erro metrics totals:", err);
        return res
          .status(500)
          .json({ error: "Erro ao calcular métricas (totals)." });
      }

      metrics.total =
        totals && totals[0] && totals[0].total ? totals[0].total : 0;
      metrics.total_interesses =
        hasInteresses &&
        totals &&
        totals[0] &&
        typeof totals[0].total_interesses !== "undefined"
          ? totals[0].total_interesses
          : 0;

      db.query(sqlLowStock, [desmanche_id], (err, low) => {
        if (err) {
          console.error("Erro metrics lowstock:", err);
          return res
            .status(500)
            .json({ error: "Erro ao calcular métricas (lowstock)." });
        }
        metrics.low_stock = low[0].low_stock || 0;

        db.query(sqlTop5, [desmanche_id], (err, top5) => {
          if (err) {
            console.error("Erro metrics top5:", err);
            return res.status(500).json({ error: "Erro ao buscar top5." });
          }
          metrics.top5 = top5 || [];

          db.query(sqlMov, [desmanche_id], (err, movs) => {
            if (err) {
              console.error("Erro metrics movs:", err);
              return res
                .status(500)
                .json({ error: "Erro ao buscar movimentações." });
            }
            metrics.movimentacoes = movs || [];

            db.query(sqlDist, [desmanche_id], (err, dist) => {
              if (err) {
                console.error("Erro metrics dist:", err);
                return res
                  .status(500)
                  .json({ error: "Erro ao buscar distribuição por tipo." });
              }
              metrics.dist_by_type = dist || [];

              db.query(sqlLowList, [desmanche_id], (err, lowList) => {
                if (err) {
                  console.error("Erro metrics lowList:", err);
                  return res
                    .status(500)
                    .json({ error: "Erro ao buscar lista de estoque baixo." });
                }
                metrics.low_list = lowList || [];
                return res.json(metrics);
              });
            });
          });
        });
      });
    });
  });
});
console.log("[ROUTES INIT] /api/pecas/movimentacao registrado");
// ================================================================
// Rota ping simples para validar montagem do módulo
// Histórico de movimentações (paginação + filtros) — antes de '/:id'
router.get("/historico", authenticate, authorize("desmanche"), (req, res) => {
  const desmanche_id = req.user.id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(req.query.pageSize, 10) || 20)
  );
  const busca = (req.query.busca || "").toString().trim();
  const tipo = (req.query.tipo || "").toString().toLowerCase();
  const de = (req.query.de || "").toString();
  const ate = (req.query.ate || "").toString();
  const exportAll = req.query.export === "1";

  const whereParts = ["me.desmanche_id = ?"];
  const params = [desmanche_id];
  if (busca) {
    whereParts.push(
      "(LOWER(p.nome) LIKE ? OR LOWER(me.tipo_movimentacao) LIKE ?)"
    );
    const like = `%${busca.toLowerCase()}%`;
    params.push(like, like);
  }
  if (["entrada", "saida", "exclusao"].includes(tipo)) {
    whereParts.push("LOWER(me.tipo_movimentacao) = ?");
    params.push(tipo);
  }
  if (de) {
    whereParts.push("DATE(me.data_movimentacao) >= ?");
    params.push(de);
  }
  if (ate) {
    whereParts.push("DATE(me.data_movimentacao) <= ?");
    params.push(ate);
  }
  const whereClause = "WHERE " + whereParts.join(" AND ");

  const sqlCount = `SELECT COUNT(*) AS total FROM movimentacoes_estoque me LEFT JOIN pecas p ON me.peca_id = p.id ${whereClause}`;
  db.query(sqlCount, params, (cerr, crow) => {
    if (cerr) {
      console.error("[HISTORICO] Erro count:", cerr);
      return res.status(500).json({ error: "Erro ao contar histórico." });
    }
    const total = crow && crow[0] ? crow[0].total : 0;
    const offset = (page - 1) * pageSize;
    const limitPart = exportAll ? "" : "LIMIT ? OFFSET ?";
    const sqlMain = `SELECT me.id, me.data_movimentacao, COALESCE(p.nome, me.peca_nome_snapshot, CONCAT('Peça #', me.peca_id)) AS nome_produto, me.tipo_movimentacao, me.quantidade_movimentada
                     FROM movimentacoes_estoque me LEFT JOIN pecas p ON me.peca_id = p.id
                     ${whereClause}
                     ORDER BY me.data_movimentacao DESC ${limitPart}`;
    const mainParams = exportAll ? params : [...params, pageSize, offset];
    db.query(sqlMain, mainParams, (merr, rows) => {
      if (merr) {
        console.error("[HISTORICO] Erro listar:", merr);
        return res.status(500).json({ error: "Erro ao listar histórico." });
      }
      console.log(
        "[HISTORICO] total:",
        total,
        "rowsRet:",
        rows ? rows.length : 0,
        { page, pageSize, exportAll }
      );
      return res.json({
        items: rows || [],
        total,
        page,
        pageSize: exportAll ? rows.length : pageSize,
        export: !!exportAll,
      });
    });
  });
});

router.get("/ping", (req, res) => {
  res.json({
    ok: true,
    msg: "pecaRoutes ativo",
    time: new Date().toISOString(),
  });
});

// Ajuste manual de estoque (entrada/saida) para uma peça específica
router.post("/:id/ajuste", authenticate, authorize("desmanche"), (req, res) => {
  const { id } = req.params;
  const desmanche_id = req.user.id;
  let { tipo, quantidade } = req.body || {};

  tipo = (tipo || "").toString().toLowerCase();
  quantidade = parseInt(quantidade, 10);

  if (!["entrada", "saida"].includes(tipo)) {
    return res
      .status(400)
      .json({ error: "Tipo inválido. Use 'entrada' ou 'saida'." });
  }
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return res
      .status(400)
      .json({ error: "Quantidade deve ser um inteiro positivo." });
  }

  const verificaSql =
    "SELECT desmanche_id, quantidade, nome FROM pecas WHERE id = ?";
  db.query(verificaSql, [id], (verr, vrows) => {
    if (verr) {
      console.error("[AJUSTE] erro ao verificar peça:", verr);
      return res.status(500).json({ error: "Erro ao verificar peça." });
    }
    if (!vrows || vrows.length === 0) {
      return res.status(404).json({ error: "Peça não encontrada." });
    }
    if (vrows[0].desmanche_id !== desmanche_id) {
      return res.status(403).json({ error: "Acesso negado à peça." });
    }

    const atual = parseInt(vrows[0].quantidade || 0, 10);
    const novo =
      tipo === "entrada" ? atual + quantidade : Math.max(0, atual - quantidade);

    const updSql = "UPDATE pecas SET quantidade = ? WHERE id = ?";
    db.query(updSql, [novo, id], (uerr) => {
      if (uerr) {
        console.error("[AJUSTE] erro ao atualizar quantidade:", uerr);
        return res.status(500).json({ error: "Erro ao atualizar estoque." });
      }

      const movSql =
        "INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada, peca_nome_snapshot) VALUES (?,?,?,?,?)";
      db.query(
        movSql,
        [id, desmanche_id, tipo, quantidade, vrows[0].nome || null],
        (merr, mres) => {
          if (merr) {
            console.error("[AJUSTE] falha ao registrar movimentação:", merr);
            // Mantemos o ajuste de estoque; apenas informamos que não registrou movimento
            return res
              .status(200)
              .json({
                message:
                  "Estoque atualizado, mas não foi possível registrar o histórico.",
                quantidade_atual: novo,
              });
          }
          console.log("[AJUSTE] Movimentação registrada", {
            peca_id: id,
            desmanche_id,
            tipo,
            quantidade,
            novo,
          });
          return res.json({
            message: "Estoque ajustado com sucesso!",
            quantidade_atual: novo,
            movimentacao_id: mres.insertId,
          });
        }
      );
    });
  });
});

// Rota para EXPORTAR peças do desmanche logado como CSV (e Template)
router.get("/exportar", authenticate, authorize("desmanche"), (req, res) => {
  const desmanche_id = req.user.id;
  const { template } = req.query;

  // Define os campos obrigatórios para o template/exportação (sem foto_url)
  const fields = [
    "id",
    "nome",
    "descricao",
    "preco",
    "quantidade",
    "quantidade_minima",
    "marca",
    "modelo",
    "ano",
    "tipo",
  ];
  const json2csvParser = new Parser({ fields });

  // Se a requisição pedir explicitamente um template (sem dados)
  if (template === "true") {
    const csvHeaderOnly = json2csvParser.parse([]); // Gera apenas o cabeçalho vazio
    res.header("Content-Type", "text/csv");
    res.attachment(`template_pecas_vazias.csv`);
    return res.send(csvHeaderOnly);
  }

  // --- Lógica de Exportação REAL (com dados) ---
  const sql = `
        SELECT
            id, nome, descricao, preco, quantidade, quantidade_minima, 
            marca, modelo, ano, tipo
        FROM
            pecas
        WHERE
            desmanche_id = ?
    `;

  db.query(sql, [desmanche_id], (err, results) => {
    if (err) {
      console.error("Erro ao exportar peças:", err);
      return res
        .status(500)
        .json({ error: "Erro ao buscar peças para exportação." });
    }

    if (results.length === 0) {
      // Se não houver peças para exportar, retorna apenas o cabeçalho
      const csvHeaderOnly = json2csvParser.parse([]);
      res.header("Content-Type", "text/csv");
      res.attachment(`estoque_pecas_vazio.csv`);
      return res.send(csvHeaderOnly);
    }

    try {
      const csvData = json2csvParser.parse(results);

      // Configura os cabeçalhos para download
      res.header("Content-Type", "text/csv");
      res.attachment(`estoque_pecas_${desmanche_id}_${Date.now()}.csv`);
      return res.send(csvData);
    } catch (parserErr) {
      console.error("Erro ao gerar CSV:", parserErr);
      return res
        .status(500)
        .json({ error: "Erro ao processar a exportação CSV." });
    }
  });
});

// Rota para IMPORTAR peças (CSV Upload) - LÓGICA DE TRANSAÇÃO APLICADA
router.post(
  "/importar",
  authenticate,
  authorize("desmanche"),
  upload.single("arquivo_csv"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }

    const desmanche_id = req.user.id;
    const resultados = [];
    let uploadFinalizado = false;

    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(csv())
      .on("data", (data) => {
        // Remove qualquer coluna de foto que possa ter sido adicionada
        if (data.foto_url !== undefined) delete data.foto_url;
        resultados.push(data);
      })
      .on("end", async () => {
        if (uploadFinalizado) return;
        uploadFinalizado = true;

        if (resultados.length === 0) {
          return res
            .status(400)
            .json({ error: "O arquivo CSV está vazio ou ilegível." });
        }

        // ATENÇÃO: INÍCIO DA LÓGICA DE INSERÇÃO/ATUALIZAÇÃO
        let connection;
        try {
          let updatesCount = 0;
          let insertsCount = 0;

          // Tenta obter uma conexão com suporte a promises e transações
          // Assume que db.promise() retorna um pool de conexões com o Promise Wrapper
          connection = db.promise ? await db.promise().getConnection() : db;
          if (connection.beginTransaction) await connection.beginTransaction();

          for (const peca of resultados) {
            const dadosComuns = [
              peca.nome,
              peca.descricao,
              parseFloat(peca.preco || 0),
              parseInt(peca.quantidade || 0),
              parseInt(peca.quantidade_minima || 1),
              peca.marca,
              peca.modelo,
              peca.ano,
              peca.tipo,
            ];

            if (peca.id && peca.id.trim() !== "") {
              // Rota 1: ATUALIZAÇÃO (ID está presente)
              const sqlUpdate = `
                            UPDATE pecas 
                            SET nome=?, descricao=?, preco=?, quantidade=?, quantidade_minima=?,
                                marca=?, modelo=?, ano=?, tipo=?
                            WHERE id = ? AND desmanche_id = ?
                        `;
              // Executa UPDATE: [Dados Comuns] + [ID da Peça] + [ID do Desmanche]
              await connection.query(sqlUpdate, [
                ...dadosComuns,
                peca.id.trim(),
                desmanche_id,
              ]);
              updatesCount++;
            } else {
              // Rota 2: INSERÇÃO (ID está vazio)
              const sqlInsert = `
                            INSERT INTO pecas 
                            (nome, descricao, preco, quantidade, quantidade_minima, marca, modelo, ano, tipo, desmanche_id, foto_url)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                        `;
              // Executa INSERT: [Dados Comuns] + [ID do Desmanche]
              const [insRes] = await connection.query(sqlInsert, [
                ...dadosComuns,
                desmanche_id,
              ]);

              // Após inserir a peça, registra movimentação de ENTRADA no histórico
              try {
                const insertedId = insRes && insRes.insertId;
                const q = parseInt(peca.quantidade || 0);
                const qtdMov = q > 0 ? q : 1;
                const inserirMov = `INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada, peca_nome_snapshot) VALUES (?,?,?,?,?)`;
                await connection.query(inserirMov, [
                  insertedId,
                  desmanche_id,
                  "entrada",
                  qtdMov,
                  peca.nome || null,
                ]);
              } catch (movErr) {
                console.error(
                  "[IMPORT] Falha ao registrar movimentação de entrada:",
                  movErr
                );
                // segue o processamento para não abortar a importação inteira
              }

              insertsCount++;
            }
          }

          // Finaliza a transação com sucesso
          if (connection.commit) await connection.commit();

          res.status(200).json({
            message: `Importação concluída: ${insertsCount} novas peças criadas, ${updatesCount} peças atualizadas.`,
          });
        } catch (dbErr) {
          // Em caso de erro, tenta fazer o rollback da transação
          if (connection && connection.rollback) await connection.rollback();
          console.error(
            "Erro de processamento em lote no banco de dados:",
            dbErr
          );
          res.status(500).json({
            error:
              "Erro interno ao salvar dados no banco. Nenhuma alteração foi salva.",
          });
        } finally {
          // Libera a conexão para o pool
          if (connection && connection.release) connection.release();
        }
      })
      .on("error", (err) => {
        if (uploadFinalizado) return;
        uploadFinalizado = true;
        console.error("Erro ao processar CSV:", err);
        res.status(500).json({
          error: "Erro ao processar o arquivo CSV. Verifique o formato.",
        });
      });
  }
);

// Listar peças (opcionalmente filtradas por desmanche_id)
router.get("/", authenticate, (req, res) => {
  const { desmanche_id } = req.query;
  let sql;
  const params = [];

  if (desmanche_id) {
    // Quando filtrado por desmanche, já retornamos a contagem de favoritos por peça
    sql = `
      SELECT
        p.*, 
        d.nome AS nome_desmanche,
        IFNULL(f.total_favoritos, 0) AS total_favoritos
      FROM pecas p
      INNER JOIN desmanches d ON p.desmanche_id = d.id
      LEFT JOIN (
        SELECT peca_id, COUNT(*) AS total_favoritos
        FROM favoritos
        GROUP BY peca_id
      ) f ON f.peca_id = p.id
      WHERE p.desmanche_id = ?
    `;
    params.push(desmanche_id);
  } else {
    // Sem filtro, mantemos a consulta original (sem contagem para não onerar em massa)
    sql = `
      SELECT
        p.*, 
        d.nome AS nome_desmanche
      FROM pecas p
      INNER JOIN desmanches d ON p.desmanche_id = d.id
    `;
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Erro ao buscar peças:", err);
      return res.status(500).json({ error: "Erro ao buscar peças" });
    }
    res.status(200).json(results);
  });
});

// Rota para fornecer métricas/dashboards para o desmanche
// Observação: precisa estar ANTES das rotas com parâmetro ":id" para não ser capturada por elas.
/* DUPLICATA METRICS BLOQUEADA
router.get("/metrics", authenticate, authorize("desmanche"), (req, res) => {
  const desmanche_id = req.user.id;
  console.log(
    "[DEBUG] GET /api/pecas/metrics invoked (pre-:id) for desmanche_id=",
    desmanche_id
    const verificaDonoSql = "SELECT desmanche_id, quantidade FROM pecas WHERE id = ?";
    db.query(verificaDonoSql, [id], (err, results) => {
  const metrics = {};
  // Primeiro verifica se a coluna `interesses_count` existe na tabela `pecas`.
  const checkColumnSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pecas' AND COLUMN_NAME = 'interesses_count'
  `;
  const sqlLowStock = `SELECT COUNT(*) AS low_stock FROM pecas WHERE desmanche_id = ? AND quantidade <= IFNULL(quantidade_minima,1)`;
  const sqlTop5 = `SELECT id, nome, quantidade FROM pecas WHERE desmanche_id = ? ORDER BY quantidade DESC LIMIT 5`;
  const sqlMov = `SELECT me.id, me.data_movimentacao, p.nome AS nome_produto, me.tipo_movimentacao, me.quantidade_movimentada
                 FROM movimentacoes_estoque me JOIN pecas p ON me.peca_id = p.id
                 WHERE me.desmanche_id = ?

      const quantidadeAtual = parseInt(results[0].quantidade || 0);

      // 1) Registra movimentação de saída com a quantidade atual (se >0, senão 1)
      const qtdMov = quantidadeAtual > 0 ? quantidadeAtual : 1;
      const inserirMov = `INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada) VALUES (?,?,?,?)`;
      db.query(
        inserirMov,
        [id, desmanche_id_token, "saida", qtdMov],
        (movErr) => {
          if (movErr) {
            console.error("[DEL] Falha ao registrar movimentação de exclusão:", movErr);
            // segue com a exclusão para não travar o fluxo do usuário
          }
          const sql = "DELETE FROM pecas WHERE id = ?";
          db.query(sql, [id], (delErr) => {
            if (delErr) {
              console.error("Erro ao deletar peça:", delErr);
              return res.status(500).json({ error: "Erro ao deletar peça" });
            }
            res.json({ message: "Peça deletada com sucesso!" });
          });
        }
      );
        .json({ error: "Erro ao calcular métricas (schema)." });
    }

    const hasInteresses = (colRes && colRes[0] && colRes[0].cnt > 0) || false;
    const sqlTotals = hasInteresses
      ? `SELECT COUNT(*) AS total, SUM(IFNULL(interesses_count,0)) AS total_interesses FROM pecas WHERE desmanche_id = ?`
      : `SELECT COUNT(*) AS total FROM pecas WHERE desmanche_id = ?`;

    db.query(sqlTotals, [desmanche_id], (err, totals) => {
      if (err) {
        console.error("Erro metrics totals:", err);
        return res
          .status(500)
          .json({ error: "Erro ao calcular métricas (totals)." });
      }

      metrics.total =
        totals && totals[0] && totals[0].total ? totals[0].total : 0;
      metrics.total_interesses =
        hasInteresses &&
        totals &&
        totals[0] &&
        typeof totals[0].total_interesses !== "undefined"
          ? totals[0].total_interesses
          : 0;

      db.query(sqlLowStock, [desmanche_id], (err, low) => {
        if (err) {
          console.error("Erro metrics lowstock:", err);
          return res
            .status(500)
            .json({ error: "Erro ao calcular métricas (lowstock)." });
        }
        metrics.low_stock = low[0].low_stock || 0;

        db.query(sqlTop5, [desmanche_id], (err, top5) => {
          if (err) {
            console.error("Erro metrics top5:", err);
            return res.status(500).json({ error: "Erro ao buscar top5." });
          }
          metrics.top5 = top5 || [];

          db.query(sqlMov, [desmanche_id], (err, movs) => {
            if (err) {
              console.error("Erro metrics movs:", err);
              return res
                .status(500)
                .json({ error: "Erro ao buscar movimentações." });
            }
            metrics.movimentacoes = movs || [];

            db.query(sqlDist, [desmanche_id], (err, dist) => {
              if (err) {
                console.error("Erro metrics dist:", err);
                return res
                  .status(500)
                  .json({ error: "Erro ao buscar distribuição por tipo." });
              }
              metrics.dist_by_type = dist || [];

              db.query(sqlLowList, [desmanche_id], (err, lowList) => {
                if (err) {
                  console.error("Erro metrics lowList:", err);
                  return res
                    .status(500)
                    .json({ error: "Erro ao buscar lista de estoque baixo." });
                }
                metrics.low_list = lowList || [];
                return res.json(metrics);
              });
            });
          });
        // (duplicata antiga de /metrics foi removida)
        });
      });
    });
  });
*/

// ===== Rotas por ID (fora de qualquer handler, após /metrics) =====
// Buscar peça por ID
router.get("/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const pid = parseInt(id, 10);
  if (Number.isNaN(pid)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  console.log(`[PECAS] GET /api/pecas/${pid}`);

  const sqlPeca = `SELECT * FROM pecas WHERE id = ?`;
  db.query(sqlPeca, [pid], (err, pecaRows) => {
    if (err) {
      console.error("[PECAS] erro ao buscar peça (direct):", err);
      return res.status(500).json({ error: "Erro ao buscar peça" });
    }
    if (!pecaRows || pecaRows.length === 0) {
      console.warn("[PECAS] peça não encontrada para id=", pid);
      return res.status(404).json({ error: "Peça não encontrada" });
    }

    const peca = pecaRows[0];
    const sqlDes = `SELECT nome FROM desmanches WHERE id = ? LIMIT 1`;
    db.query(sqlDes, [peca.desmanche_id], (dErr, dRows) => {
      if (dErr) {
        console.error("[PECAS] erro ao buscar desmanche da peça:", dErr);
        return res.json({ ...peca, nome_desmanche: null });
      }
      const nome_desmanche = dRows && dRows[0] ? dRows[0].nome : null;
      return res.json({ ...peca, nome_desmanche });
    });
  });
});

// Atualizar peça (rota protegida para desmanche proprietário)
router.put(
  "/:id",
  authenticate,
  authorize("desmanche"),
  upload.single("foto_url"),
  async (req, res) => {
    const { id } = req.params;
    const desmanche_id_token = req.user.id;

    const {
      nome,
      descricao,
      preco,
      quantidade,
      quantidade_minima,
      marca,
      modelo,
      ano,
      tipo,
    } = req.body || {};

    const verificaDonoSql =
      "SELECT desmanche_id, foto_url, quantidade AS quantidade_atual, nome FROM pecas WHERE id = ?";
    db.query(verificaDonoSql, [id], async (err, results) => {
      if (err) {
        console.error("Erro ao verificar proprietário:", err);
        return res.status(500).json({ error: "Erro ao atualizar peça" });
      }
      if (
        results.length === 0 ||
        results[0].desmanche_id !== desmanche_id_token
      ) {
        return res.status(403).json({
          error: "Acesso negado. Você só pode atualizar suas próprias peças.",
        });
      }

      let fotoUrlFinal = results[0].foto_url || null;

      try {
        if (req.file) {
          const b64 = Buffer.from(req.file.buffer).toString("base64");
          const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
          const resultadoUpload = await cloudinary.uploader.upload(dataURI, {
            folder: "pecas",
            resource_type: "auto",
          });
          fotoUrlFinal = resultadoUpload.secure_url;
        }

        const sql = `
        UPDATE pecas
        SET nome = ?, descricao = ?, preco = ?, quantidade = ?, quantidade_minima = ?,
            marca = ?, modelo = ?, ano = ?, tipo = ?, foto_url = ?
        WHERE id = ?
      `;

        db.query(
          sql,
          [
            nome,
            descricao,
            preco,
            quantidade,
            quantidade_minima,
            marca,
            modelo,
            ano,
            tipo,
            fotoUrlFinal,
            id,
          ],
          (err) => {
            if (err) {
              console.error("Erro ao atualizar peça:", err);
              return res.status(500).json({ error: "Erro ao atualizar peça" });
            }
            // Se a quantidade mudou, registra movimentação de ajuste (entrada/saida)
            const qtdNova = parseInt(quantidade, 10);
            const qtdAnt = parseInt(results[0].quantidade_atual || 0, 10);
            if (Number.isFinite(qtdNova) && qtdNova !== qtdAnt) {
              const diff = qtdNova - qtdAnt;
              const tipoMov = diff > 0 ? "entrada" : "saida";
              const qtdMov = Math.abs(diff);
              const movSql = `INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada, peca_nome_snapshot) VALUES (?,?,?,?,?)`;
              db.query(
                movSql,
                [
                  id,
                  desmanche_id_token,
                  tipoMov,
                  qtdMov,
                  nome || results[0].nome || null,
                ],
                (movErr) => {
                  if (movErr) {
                    console.error(
                      "[UPDATE] Falha ao registrar movimentação por alteração de quantidade:",
                      movErr
                    );
                  } else {
                    console.log(
                      "[UPDATE] Movimentação registrada por alteração de quantidade",
                      {
                        peca_id: id,
                        tipoMov,
                        qtdMov,
                        de: qtdAnt,
                        para: qtdNova,
                      }
                    );
                  }
                  return res.json({ message: "Peça atualizada com sucesso!" });
                }
              );
            } else {
              return res.json({ message: "Peça atualizada com sucesso!" });
            }
          }
        );
      } catch (uploadErr) {
        console.error("Erro ao processar upload na atualização:", uploadErr);
        return res
          .status(500)
          .json({ error: "Erro ao processar imagem da peça." });
      }
    });
  }
);

// Deletar peça (rota protegida para desmanche proprietário) — registra saída
// Deletar peça (registra tipo exclusivo 'exclusao' para diferenciar de saída de ajuste)
router.delete("/:id", authenticate, authorize("desmanche"), (req, res) => {
  const { id } = req.params;
  const desmanche_id_token = req.user.id;

  const verificaDonoSql =
    "SELECT desmanche_id, quantidade, nome FROM pecas WHERE id = ?";
  db.query(verificaDonoSql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao verificar proprietário:", err);
      return res.status(500).json({ error: "Erro ao deletar peça" });
    }
    if (
      results.length === 0 ||
      results[0].desmanche_id !== desmanche_id_token
    ) {
      return res.status(403).json({
        error: "Acesso negado. Você só pode deletar suas próprias peças.",
      });
    }

    const quantidadeAtual = parseInt(results[0].quantidade || 0);
    const qtdMov = quantidadeAtual > 0 ? quantidadeAtual : 1;
    const inserirMov = `INSERT INTO movimentacoes_estoque (peca_id, desmanche_id, tipo_movimentacao, quantidade_movimentada, peca_nome_snapshot) VALUES (?,?,?,?,?)`;
    db.query(
      inserirMov,
      [id, desmanche_id_token, "exclusao", qtdMov, results[0].nome || null],
      (movErr) => {
        if (movErr) {
          console.error(
            "[DEL] Falha ao registrar movimentação de exclusão:",
            movErr
          );
        } else {
          console.log("[DEL] Movimentação de exclusão registrada", {
            peca_id: id,
            desmanche_id: desmanche_id_token,
            qtdMov,
          });
        }

        const sql = "DELETE FROM pecas WHERE id = ?";
        db.query(sql, [id], (delErr) => {
          if (delErr) {
            console.error("Erro ao deletar peça:", delErr);
            return res.status(500).json({ error: "Erro ao deletar peça" });
          }
          res.json({ message: "Peça deletada com sucesso!" });
        });
      }
    );
  });
});

// Dump das rotas registradas para diagnóstico
try {
  const dump = router.stack
    .filter((l) => l.route)
    .map((l) => {
      const methods = Object.keys(l.route.methods)
        .filter((m) => l.route.methods[m])
        .map((m) => m.toUpperCase())
        .join(",");
      return `${methods} ${l.route.path}`;
    });
  console.log("[ROUTES INIT] Rotas pecaRoutes:", dump);
} catch (e) {
  console.warn("[ROUTES INIT] Falha ao listar rotas de pecaRoutes:", e);
}

module.exports = router;
