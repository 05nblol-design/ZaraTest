# 🔧 Configuração de Variáveis de Ambiente no Render

## ❌ Problema Identificado

O erro HTTP 500 no Render está sendo causado pela **falta de variáveis de ambiente obrigatórias**.

O sistema requer as seguintes variáveis em produção:
- `MONGODB_URI` - String de conexão com MongoDB Atlas
- `JWT_SECRET` - Chave secreta para tokens JWT
- `NODE_ENV` - Deve ser "production"

## 🚀 Solução: Configurar Variáveis no Render

### 1. Acessar o Dashboard do Render
1. Vá para [render.com](https://render.com)
2. Faça login na sua conta
3. Clique no seu serviço `zara-quality-system`

### 2. Configurar Environment Variables
1. No painel do serviço, clique em **"Environment"** no menu lateral
2. Clique em **"Add Environment Variable"**
3. Adicione as seguintes variáveis:

#### Variáveis Obrigatórias:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://SEU_USUARIO:SUA_SENHA@cluster.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_com_pelo_menos_32_caracteres_diferentes
```

#### Variáveis Opcionais (Recomendadas):
```
PORT=10000
CORS_ORIGIN=https://zara-quality-system-2.onrender.com
SOCKET_CORS_ORIGIN=https://zara-quality-system-2.onrender.com
FRONTEND_URL=https://zara-quality-system-2.onrender.com
LOG_LEVEL=warn
COMPRESSION_ENABLED=true
METRICS_ENABLED=true
```

### 3. Configurar MongoDB Atlas

#### Se você ainda não tem MongoDB Atlas:
1. Acesse [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Crie uma conta gratuita
3. Crie um cluster gratuito (M0)
4. Configure um usuário de banco de dados
5. Adicione `0.0.0.0/0` nas Network Access (para permitir conexões do Render)
6. Copie a string de conexão

#### String de Conexão MongoDB:
```
mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority
```

**Substitua:**
- `<username>` - Seu usuário do MongoDB
- `<password>` - Sua senha do MongoDB
- `<cluster-name>` - Nome do seu cluster
- `<database-name>` - `zaraqualitysystem`

### 4. Gerar JWT_SECRET Seguro

Use um dos métodos abaixo para gerar uma chave segura:

```bash
# Método 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Método 2: OpenSSL
openssl rand -hex 64

# Método 3: Online (use sites confiáveis)
# https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx
```

### 5. Salvar e Fazer Redeploy

1. Após adicionar todas as variáveis, clique em **"Save Changes"**
2. O Render fará automaticamente um novo deploy
3. Aguarde o deploy completar (pode levar alguns minutos)

## 🔍 Verificação

Após o deploy:
1. Acesse `https://zara-quality-system-2.onrender.com/health`
2. Deve retornar status 200 com informações do sistema
3. Acesse `https://zara-quality-system-2.onrender.com/`
4. Deve carregar a aplicação React

## ⚠️ Importante

- **Nunca** commite variáveis de ambiente no código
- Use senhas fortes para MongoDB e JWT_SECRET
- Mantenha as credenciais seguras
- O MongoDB Atlas gratuito tem limite de 512MB

## 🆘 Solução de Problemas

### Se ainda houver erro 500:
1. Verifique os logs no Render Dashboard
2. Confirme se todas as variáveis estão corretas
3. Teste a conexão MongoDB Atlas separadamente
4. Verifique se o IP do Render está liberado no MongoDB Atlas

### Logs do Render:
1. No dashboard do serviço, clique em **"Logs"**
2. Procure por mensagens de erro específicas
3. Verifique se há erros de conexão com MongoDB