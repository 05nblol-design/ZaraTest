# 🚀 Instruções de Deploy - Zara Quality System

## ✅ Sistema Atualizado para Produção

O sistema foi configurado para rodar no servidor `https://zara-quality-system-2.onrender.com`.

## 📋 Configurações Realizadas

### Frontend
- ✅ URL da API atualizada para: `https://zara-quality-system-2.onrender.com`
- ✅ Arquivo `.env` configurado para produção
- ✅ `render.yaml` otimizado para deploy estático

### Backend
- ✅ Configurações CORS atualizadas para a URL de produção
- ✅ `render.yaml` configurado com todas as variáveis necessárias
- ✅ Arquivo `.env.production` criado como template

## 🎯 Próximos Passos para Deploy

### 1. Configurar MongoDB Atlas

1. **Acesse**: https://cloud.mongodb.com
2. **Crie um cluster gratuito (M0)**
3. **Configure usuário**:
   - Username: `zarauser`
   - Password: [gere uma senha segura]
4. **Configure rede**: Adicione `0.0.0.0/0`
5. **Obtenha a string de conexão**:
   ```
   mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
   ```

### 2. Deploy no Render

#### Backend (Web Service)
1. **Acesse**: https://render.com
2. **Novo Web Service** conectado ao repositório
3. **Configurações**:
   - Name: `zara-quality-system-2`
   - Environment: `Node`
   - Build Command: `npm ci --only=production`
   - Start Command: `npm start`

4. **Variáveis de Ambiente** (CRÍTICAS):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
   MONGO_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
   JWT_SECRET=sua_chave_jwt_super_segura_com_pelo_menos_32_caracteres
   CORS_ORIGIN=https://zara-quality-system-2.onrender.com
   FRONTEND_URL=https://zara-quality-system-2.onrender.com
   ```

#### Frontend (Static Site)
1. **Novo Static Site** conectado ao repositório
2. **Configurações**:
   - Name: `zara-quality-frontend`
   - Root Directory: `client`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`

3. **Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://zara-quality-system-2.onrender.com
   NODE_ENV=production
   ```

### 3. Verificação Pós-Deploy

#### Teste do Backend
- Acesse: `https://zara-quality-system-2.onrender.com`
- Deve carregar a aplicação completa

#### Teste das APIs
- Health Check: `https://zara-quality-system-2.onrender.com/api/health`
- Login: `https://zara-quality-system-2.onrender.com/api/auth/login`

#### Credenciais de Teste
Após o deploy, use estas credenciais:
- **Operador**: `operador` / `123456`
- **Líder**: `lider` / `123456`
- **Gestor**: `gestor` / `123456`

## 🔧 Arquivos Configurados

### Backend
- `render.yaml` - Configuração completa do Render
- `.env.production` - Template de variáveis de produção
- `server.js` - Configurado para produção e desenvolvimento

### Frontend
- `client/.env` - URL da API atualizada
- `client/render.yaml` - Configuração do site estático
- `client/vite.config.js` - Build otimizado

## 🚨 Pontos Importantes

1. **MongoDB Atlas é OBRIGATÓRIO** - O sistema não funcionará sem ele
2. **JWT_SECRET deve ter pelo menos 32 caracteres**
3. **Todas as URLs devem apontar para `zara-quality-system-2.onrender.com`**
4. **O frontend está configurado como site estático separado**

## 📞 Suporte

### URLs de Acesso
- **Aplicação**: https://zara-quality-system-2.onrender.com
- **API**: https://zara-quality-system-2.onrender.com/api
- **Health Check**: https://zara-quality-system-2.onrender.com/api/health

### Monitoramento
- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com

## ✅ Status

- ✅ Frontend configurado para produção
- ✅ Backend configurado para produção  
- ✅ CORS atualizado para URL correta
- ✅ Arquivos de deploy criados
- ✅ Documentação atualizada
- 🔄 **Pronto para deploy no Render**

---

**🎉 O sistema está 100% preparado para rodar em `https://zara-quality-system-2.onrender.com`!**