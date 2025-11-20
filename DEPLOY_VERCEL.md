# Guia de Deploy no Vercel - PeçaJá

## 📋 Visão Geral

Este projeto está configurado para deploy no Vercel em **duas partes separadas**:
1. **Frontend** (Next.js 15)
2. **Backend** (Express + MySQL)

---

## 🎯 Parte 1: Deploy do Frontend

### Passos no Vercel Dashboard

1. **Criar Novo Projeto**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New" → "Project"
   - Importe o repositório: `andreiimc99/PecaJa`

2. **Configurar Root Directory**
   - Em "Build and Output Settings"
   - Defina **Root Directory**: `front`
   - Framework Preset: Next.js (detectado automaticamente)

3. **Variáveis de Ambiente**
   
   Adicione em "Environment Variables":
   
   ```env
   # URL do backend (será configurado após deploy do backend)
   NEXT_PUBLIC_API_URL=https://seu-backend.vercel.app
   ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde a build completar

### URL do Frontend
Após o deploy: `https://seu-projeto-front.vercel.app`

---

## 🔧 Parte 2: Deploy do Backend

### Pré-requisitos: Banco de Dados MySQL Remoto

⚠️ **IMPORTANTE**: O Vercel não oferece banco de dados MySQL nativo. Você precisa de um serviço externo.

#### Opções recomendadas:

**A) PlanetScale** (Recomendado - Free Tier disponível)
- Website: [planetscale.com](https://planetscale.com)
- Crie uma database
- Copie a connection string fornecida
- Formato: `mysql://user:password@host/database?sslaccept=strict`

**B) Railway**
- Website: [railway.app](https://railway.app)
- Adicione um MySQL database
- Copie as credenciais de conexão

**C) AWS RDS / Azure Database**
- Opções profissionais pagas

### Passos no Vercel Dashboard

1. **Criar Segundo Projeto**
   - "Add New" → "Project"
   - Importe o mesmo repositório: `andreiimc99/PecaJa`
   - ⚠️ **Nome diferente do frontend**

2. **Configurar Root Directory**
   - Em "Build and Output Settings"
   - Defina **Root Directory**: `backend`
   - Framework Preset: Other

3. **Variáveis de Ambiente** ⭐

   Adicione TODAS estas variáveis:
   
   ```env
   # Banco de Dados MySQL
   DB_HOST=seu-host.planetscale.com
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha_segura
   DB_NAME=nome_do_banco
   
   # Autenticação JWT
   JWT_SECRET=uma_chave_super_secreta_e_longa_aqui_mude_isso
   
   # Cloudinary (upload de imagens)
   CLOUDINARY_CLOUD_NAME=seu_cloud_name
   CLOUDINARY_API_KEY=sua_api_key
   CLOUDINARY_API_SECRET=seu_api_secret
   
   # Migrações (defina como 1 APENAS na primeira execução)
   RUN_MIGRATIONS=0
   
   # Flag Vercel (detectado automaticamente, mas pode definir)
   VERCEL=1
   ```

4. **⚠️ ATENÇÃO: Migrações Iniciais**
   
   Na **primeira** execução:
   - Defina `RUN_MIGRATIONS=1`
   - Faça o deploy
   - Após sucesso, **mude para** `RUN_MIGRATIONS=0` no dashboard
   - Redeploy
   
   Isso cria as tabelas apenas uma vez, evitando overhead em cada cold start.

5. **Deploy**
   - Clique em "Deploy"
   - Aguarde a build

### URL do Backend
Após o deploy: `https://seu-backend.vercel.app`

---

## 🔗 Parte 3: Conectar Frontend e Backend

1. **Copie a URL do Backend**
   - Exemplo: `https://peca-ja-backend.vercel.app`

2. **Atualize Variável do Frontend**
   - Volte ao projeto do frontend no Vercel
   - Vá em "Settings" → "Environment Variables"
   - Edite `NEXT_PUBLIC_API_URL`
   - Cole a URL do backend (sem barra no final)
   - Salve

3. **Redeploy do Frontend**
   - Em "Deployments", clique nos três pontos do deploy mais recente
   - "Redeploy"
   - Aguarde

---

## ✅ Verificação de Saúde

### Testar Conexão do Backend com DB

Acesse no navegador:
```
https://seu-backend.vercel.app/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "dbConnected": true,
  "timestamp": "2025-11-19T..."
}
```

Se `dbConnected: false`, verifique:
- Credenciais do banco no Vercel Dashboard
- Firewall do banco (liberar acesso externo)
- `DB_HOST` e `DB_PORT` corretos

### Testar Frontend

1. Abra `https://seu-projeto-front.vercel.app`
2. Navegue até login/cadastro
3. Tente criar uma conta
4. Se aparecer erro de conexão, revise `NEXT_PUBLIC_API_URL`

---

## 🛠️ Comandos Úteis para Desenvolvimento Local

```bash
# Backend (na pasta backend/)
npm install
node server.js

# Frontend (na pasta front/)
npm install
npm run dev
```

### Arquivo `.env` Local (backend)

Crie `backend/.env` baseado em `backend/.env.example`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=pecaja
JWT_SECRET=dev_secret_key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RUN_MIGRATIONS=1
```

---

## 🚨 Troubleshooting

### Erro: "Nenhuma versão do Next.js detectada"
- Certifique-se de que Root Directory = `front`
- Verifique se `front/package.json` existe
- Não use `vercel.json` customizado

### Erro: Backend não conecta ao DB
- Confirme todas as variáveis `DB_*` estão definidas
- Teste com ferramenta externa (MySQL Workbench, DBeaver)
- Verifique logs no Vercel Dashboard → Functions → Logs

### Erro: CORS
- Backend já está configurado com CORS aberto (`app.use(cors())`)
- Se ainda houver problema, adicione no backend:
  ```javascript
  app.use(cors({ origin: 'https://seu-front.vercel.app' }))
  ```

### Imagens não aparecem
- Confirme que `CLOUDINARY_*` estão corretos
- Verifique no painel Cloudinary se uploads estão sendo feitos
- Logs do backend mostram erros de upload

---

## 📞 Suporte

Documentação Vercel: [vercel.com/docs](https://vercel.com/docs)

PlanetScale Docs: [planetscale.com/docs](https://planetscale.com/docs)

Cloudinary Docs: [cloudinary.com/documentation](https://cloudinary.com/documentation)

---

## 🎉 Próximos Passos

Após deploy bem-sucedido:

1. **Domínio Customizado**
   - Vercel Dashboard → Settings → Domains
   - Adicione seu domínio (ex: `pecaja.com.br`)

2. **Analytics**
   - Ative Vercel Analytics no dashboard
   - Monitore performance e tráfego

3. **CI/CD**
   - Cada push no branch `master` dispara deploy automático
   - Configure branch preview para testar antes de mergear

4. **Backup do Banco**
   - Configure rotinas de backup no seu provider de MySQL
   - Exporte dados regularmente

---

**Criado em:** 19/11/2025  
**Versão do Projeto:** 1.0  
**Commit Atual:** d9a1062
