# 🚀 Guia Passo a Passo - Deploy no Render.com

## ❓ Web Service vs Website

**IMPORTANTE**: Sua aplicação Node.js deve ser deployada como **"Web Service"**, NÃO como "Static Site".

- **Web Service** = Aplicações dinâmicas (Node.js, Python, etc.)
- **Static Site** = Sites estáticos (HTML, CSS, JS apenas)

## 📋 Pré-requisitos

1. ✅ Código no GitHub/GitLab
2. ✅ MongoDB Atlas configurado
3. ✅ Conta no Render.com (gratuita)

## 🎯 Passo a Passo Completo

### 1. 📤 Preparar Repositório GitHub

```bash
# Se ainda não fez:
git init
git add .
git commit -m "Preparar para deploy"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

### 2. 🗄️ Configurar MongoDB Atlas

1. **Acesse**: https://www.mongodb.com/atlas
2. **Crie conta gratuita**
3. **Crie cluster**:
   - Escolha "M0 Sandbox" (gratuito)
   - Região mais próxima
4. **Configurar acesso**:
   - Database Access → Add New User
   - Username: `admin`
   - Password: `senha123` (anote!)
5. **Configurar rede**:
   - Network Access → Add IP Address
   - **0.0.0.0/0** (permitir de qualquer lugar)
6. **Obter string de conexão**:
   - Connect → Connect your application
   - Copiar string: `mongodb+srv://admin:senha123@cluster0.xxxxx.mongodb.net/zaraqualitysystem`
   - **IMPORTANTE**: Esta string será usada como MONGODB_URI no Render

### 3. 🌐 Deploy no Render.com

#### 3.1 Criar Conta
1. **Acesse**: https://render.com
2. **Sign Up** com GitHub
3. **Autorize** Render a acessar repositórios

#### 3.2 Criar Web Service
1. **Dashboard** → **"New +"** → **"Web Service"**
2. **Conectar repositório**:
   - Escolha seu repositório do GitHub
   - Clique **"Connect"**

#### 3.3 Configurar Serviço

**Configurações básicas:**
```
Name: zara-quality-system
Environment: Node
Region: Oregon (US West) ou Frankfurt (Europe)
Branch: main
```

**Build & Deploy:**
```
Build Command: npm install
Start Command: npm start
```

**Pricing:**
```
Instance Type: Free
```

#### 3.4 Configurar Variáveis de Ambiente

**Na seção "Environment Variables"**, adicione:

```
NODE_ENV = production
MONGODB_URI = mongodb+srv://admin:senha123@cluster0.xxxxx.mongodb.net/zaraqualitysystem
JWT_SECRET = minha_chave_super_secreta_com_32_caracteres_minimo_2024
PORT = 3000
```

**⚠️ IMPORTANTE**: Substitua:
- `senha123` pela sua senha do MongoDB
- `cluster0.xxxxx` pela sua string real
- `minha_chave_super_secreta...` por uma chave única

#### 3.5 Finalizar Deploy

1. **Clique "Create Web Service"**
2. **Aguarde o build** (5-10 minutos)
3. **Acompanhe logs** na tela

### 4. ✅ Verificar Deploy

#### 4.1 Logs de Sucesso
Procure por estas mensagens nos logs:
```
==> Build successful 🎉
==> Deploying...
🚀 Servidor rodando na porta 3000
✅ Aplicação em produção
✅ MongoDB conectado com sucesso
```

#### 4.2 Acessar Aplicação
- **URL será gerada automaticamente**
- Formato: `https://zara-quality-system-xxxx.onrender.com`
- **Clique no link** para testar

### 5. 🔧 Troubleshooting

#### ❌ Build Failed
**Erro comum**: `npm install failed`
**Solução**: Verificar `package.json` no repositório

#### ❌ Application Error
**Erro comum**: Variáveis de ambiente
**Solução**: 
1. Verificar todas as variáveis
2. Testar string MongoDB no MongoDB Compass
3. Verificar logs: "View Logs"

#### ❌ Cannot connect to MongoDB
**Soluções**:
1. Verificar IP 0.0.0.0/0 liberado no Atlas
2. Verificar usuário/senha
3. Testar conexão local primeiro

### 6. 🎉 Pós-Deploy

#### 6.1 Configurações Adicionais
- **Custom Domain**: Settings → Custom Domains
- **SSL**: Automático (incluído)
- **Logs**: View Logs (tempo real)

#### 6.2 Monitoramento
- **Metrics**: CPU, Memory, Response Time
- **Logs**: Erros e atividade

#### 6.3 Sistema de Chat (Novo!)
O sistema agora inclui:
- **Chat flutuante** para operadores, líderes e gestores
- **Usuários online** com status em tempo real
- **Mensagens** com diferentes tipos (broadcast, alerta, info)
- **Interface responsiva** para mobile

**Configurações do Chat no Render**:
- `CHAT_ENABLED=true`
- `CHAT_MAX_MESSAGES=100`
- `CHAT_MESSAGE_TTL=86400` (24 horas)
- `CORS_ORIGIN=https://zara-quality-system-2.onrender.com`
- **Alerts**: Email notifications

#### 6.3 Atualizações
- **Push para GitHub** → **Deploy automático**
- **Manual Deploy**: Settings → Manual Deploy

## 📱 Exemplo de URL Final

Sua aplicação ficará disponível em:
```
https://zara-quality-system-abc123.onrender.com
```

## 🔄 Comandos Úteis

```bash
# Atualizar aplicação
git add .
git commit -m "Atualização"
git push origin main
# Deploy automático no Render!

# Ver logs localmente
npm run pm2:logs

# Testar produção local
NODE_ENV=production npm start
```

## 💡 Dicas Importantes

1. **Free Tier**: Aplicação "dorme" após 15min sem uso
2. **Cold Start**: Primeiro acesso pode demorar 30s
3. **Logs**: Sempre verifique em caso de erro
4. **Backup**: Mantenha `.env.example` atualizado
5. **Segurança**: Nunca commite `.env` real

## 🆘 Suporte

Se algo der errado:
1. **Verificar logs** no Render
2. **Testar localmente** primeiro
3. **Verificar variáveis** de ambiente
4. **Consultar documentação** Render.com

---

**✅ Após seguir este guia, sua aplicação estará online 24/7!**

**🔗 Acesse pelo link gerado e compartilhe com sua equipe!**