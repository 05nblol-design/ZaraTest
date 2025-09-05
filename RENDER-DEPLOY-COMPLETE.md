# 🚀 Deploy Completo no Render - Zara Quality System

## 📋 Pré-requisitos

- ✅ Conta no GitHub com repositório público
- ✅ MongoDB Atlas configurado (veja `MONGODB-ATLAS-SETUP.md`)
- ✅ Conta no Render (https://render.com)

## 🎯 Arquitetura do Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                        RENDER DEPLOY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   BACKEND       │    │         FRONTEND                │ │
│  │   Web Service   │◄───┤        Static Site              │ │
│  │                 │    │                                 │ │
│  │ Port: 10000     │    │ Build: npm run build            │ │
│  │ Node.js         │    │ Dist: dist/                     │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │  MongoDB Atlas  │                                       │
│  │   (External)    │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Passo 1: Preparar Repositório GitHub

### 1.1 Criar Repositório

1. **Acesse**: https://github.com
2. **Clique em**: "New repository"
3. **Configurações**:
   - **Repository name**: `zara-quality-system`
   - **Description**: `Sistema de Qualidade Zara - Controle de Testes e Operações`
   - **Public** (necessário para plano gratuito do Render)
   - **Initialize with README**: ❌ (já temos)
4. **Clique em**: "Create repository"

### 1.2 Conectar Repositório Local

```bash
# Adicionar remote origin
git remote add origin https://github.com/SEU_USUARIO/zara-quality-system.git

# Fazer push inicial
git branch -M main
git push -u origin main
```

## 🚀 Passo 2: Deploy do Backend (Web Service)

### 2.1 Criar Web Service

1. **Acesse**: https://dashboard.render.com
2. **Clique em**: "New +" → "Web Service"
3. **Connect Repository**: Selecione seu repositório GitHub
4. **Configurações Básicas**:
   - **Name**: `zara-quality-system-2`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: ` ` (vazio - raiz do projeto)
   - **Runtime**: `Node`
   - **Build Command**: `npm ci --only=production`
   - **Start Command**: `npm start`

### 2.2 Configurar Variáveis de Ambiente

**CRÍTICAS** (obrigatórias):
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
MONGO_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=sua_chave_jwt_super_segura_com_pelo_menos_32_caracteres_aleatorios_aqui
```

**CORS e URLs**:
```bash
CORS_ORIGIN=https://zara-quality-system-2.onrender.com
FRONTEND_URL=https://zara-quality-system-2.onrender.com
SOCKET_IO_CORS_ORIGIN=https://zara-quality-system-2.onrender.com
```

**Opcionais** (com valores padrão):
```bash
JWT_EXPIRES_IN=24h
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
CACHE_TTL=300
TZ=America/Sao_Paulo
```

### 2.3 Deploy do Backend

1. **Clique em**: "Create Web Service"
2. **Aguarde o build** (5-10 minutos)
3. **Verifique logs** para erros
4. **Teste**: Acesse `https://zara-quality-system-2.onrender.com`

## 🌐 Passo 3: Deploy do Frontend (Static Site)

### 3.1 Criar Static Site

1. **No Render Dashboard**, clique em "New +" → "Static Site"
2. **Connect Repository**: Mesmo repositório GitHub
3. **Configurações**:
   - **Name**: `zara-quality-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

### 3.2 Variáveis de Ambiente do Frontend

```bash
VITE_API_URL=https://zara-quality-system-2.onrender.com
NODE_ENV=production
```

### 3.3 Deploy do Frontend

1. **Clique em**: "Create Static Site"
2. **Aguarde o build** (3-5 minutos)
3. **Teste**: Acesse a URL gerada pelo Render

## ✅ Passo 4: Verificação e Testes

### 4.1 Testes do Backend

**Health Check**:
```bash
curl https://zara-quality-system-2.onrender.com/api/health
```

**Resposta esperada**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-XX...",
  "database": "connected",
  "version": "1.0.0"
}
```

**Teste de Login**:
```bash
curl -X POST https://zara-quality-system-2.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"123456"}'
```

### 4.2 Testes do Frontend

1. **Acesse a aplicação** via URL do Static Site
2. **Teste login** com credenciais:
   - **Operador**: `operador` / `123456`
   - **Líder**: `lider` / `123456`
   - **Gestor**: `gestor` / `123456`
3. **Verifique funcionalidades**:
   - Dashboard carrega
   - Testes de qualidade funcionam
   - Chat em tempo real
   - Notificações

## 🔧 Passo 5: Configurações Avançadas

### 5.1 Custom Domain (Opcional)

**Para o Backend**:
1. **Settings** → **Custom Domains**
2. **Add**: `api.seudominio.com`
3. **Configure DNS**: CNAME para `zara-quality-system-2.onrender.com`

**Para o Frontend**:
1. **Settings** → **Custom Domains**
2. **Add**: `app.seudominio.com`
3. **Configure DNS**: CNAME para URL do Static Site

### 5.2 SSL/HTTPS

- ✅ **Automático** no Render
- ✅ **Let's Encrypt** gratuito
- ✅ **Renovação automática**

### 5.3 Monitoramento

**Render Dashboard**:
- **Metrics**: CPU, Memory, Response Time
- **Logs**: Real-time e histórico
- **Deploys**: Histórico de builds

**MongoDB Atlas**:
- **Performance**: Queries, Connections
- **Alerts**: Configurar notificações

## 🚨 Troubleshooting

### Backend não inicia

**Erro comum**: `MongoDB connection failed`

**Soluções**:
1. Verifique `MONGODB_URI` nas variáveis de ambiente
2. Confirme whitelist `0.0.0.0/0` no Atlas
3. Teste conexão local primeiro

### Frontend não carrega API

**Erro comum**: `CORS error` ou `Network error`

**Soluções**:
1. Verifique `VITE_API_URL` no frontend
2. Confirme `CORS_ORIGIN` no backend
3. Teste endpoints diretamente

### Build falha

**Erro comum**: `npm install failed`

**Soluções**:
1. Verifique `package.json` e `package-lock.json`
2. Use `npm ci` em vez de `npm install`
3. Limpe cache: Settings → "Clear build cache"

## 📊 Monitoramento de Custos

### Render (Plano Gratuito)
- **Web Service**: 750 horas/mês
- **Static Site**: Ilimitado
- **Bandwidth**: 100GB/mês
- **Build Time**: 500 minutos/mês

### MongoDB Atlas (M0)
- **Storage**: 512MB
- **Connections**: 500 simultâneas
- **Bandwidth**: Ilimitado

## 🎯 URLs Finais

**Aplicação Principal**:
- https://zara-quality-system-2.onrender.com

**API Endpoints**:
- https://zara-quality-system-2.onrender.com/api/health
- https://zara-quality-system-2.onrender.com/api/auth/login
- https://zara-quality-system-2.onrender.com/api/dashboard/stats

**Frontend (se separado)**:
- https://zara-quality-frontend.onrender.com

---

## ✅ Checklist Final

- [ ] MongoDB Atlas configurado
- [ ] Repositório GitHub público
- [ ] Backend deployado no Render
- [ ] Variáveis de ambiente configuradas
- [ ] Frontend funcionando
- [ ] Testes de login realizados
- [ ] APIs respondendo corretamente
- [ ] SSL/HTTPS ativo
- [ ] Monitoramento configurado

**🎉 Deploy concluído com sucesso!**