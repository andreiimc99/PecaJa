// backend/auth.js
const jwt = require("jsonwebtoken");
const path = require("path");
// Garante carregamento do .env no diretório do backend
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("⚠️  Atenção: variável JWT_SECRET não definida em .env");
}

/**
 * Middleware que valida um JWT enviado no header Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  // Modo de desenvolvimento: permite desabilitar autenticação por completo
  // definindo DISABLE_AUTH=true no .env ou na env da sessão. Pode também
  // passar um header `x-dev-user` com JSON contendo { id, nome, role } para
  // simular diferentes usuários.
  if (process.env.DISABLE_AUTH === "true") {
    const devHeader = req.headers["x-dev-user"];
    if (devHeader) {
      try {
        req.user = typeof devHeader === 'string' ? JSON.parse(devHeader) : devHeader;
      } catch (e) {
        console.warn('[DEV AUTH] Header x-dev-user inválido, usando usuário padrão');
      }
    }
    if (!req.user) {
      req.user = { id: 1, nome: 'dev-admin', role: 'admin' };
    }
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não enviado." });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Assumindo que o payload do token contém informações do usuário, incluindo a 'role'
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido." });
  }
}

/**
 * Middleware que verifica a permissão (role) do usuário.
 * @param {string} role - A permissão necessária para acessar a rota ('cliente' ou 'desmanche').
 */
function authorize(role) {
  return (req, res, next) => {
    // Se o modo DEV estiver ativo, libera automaticamente (facilita testes locais)
    if (process.env.DISABLE_AUTH === "true") return next();

    // A função 'authenticate' já foi executada e colocou o payload do token em req.user
    if (!req.user) {
      return res.status(403).json({ error: "Acesso negado. Permissões insuficientes." });
    }

    // Permite acesso se o usuário tiver a role requerida OU for 'admin' (super-usuário)
    if (req.user.role !== role && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Acesso negado. Permissões insuficientes." });
    }
    next();
  };
}

// Exporta ambas as funções para serem usadas nas rotas
module.exports = { authenticate, authorize };
