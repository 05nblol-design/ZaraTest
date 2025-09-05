# 🍃 MongoDB Atlas - Configuração para Produção

## 📋 Passo a Passo Completo

### 1. Criar Conta no MongoDB Atlas

1. **Acesse**: https://cloud.mongodb.com
2. **Clique em**: "Try Free"
3. **Preencha os dados**:
   - Email
   - Senha (mínimo 8 caracteres)
   - Nome e sobrenome
4. **Aceite os termos** e clique em "Create your Atlas account"
5. **Verifique seu email** e confirme a conta

### 2. Criar Cluster Gratuito

1. **Após login**, clique em "Build a Database"
2. **Escolha**: "M0 Sandbox" (FREE)
3. **Configurações**:
   - **Provider**: AWS (recomendado)
   - **Region**: us-east-1 (Virginia) - mais próximo do Render
   - **Cluster Name**: `Cluster0` (padrão)
4. **Clique em**: "Create Cluster"

### 3. Configurar Segurança

#### 3.1 Criar Usuário do Banco

1. **Na tela "Security Quickstart"**:
   - **Username**: `zarauser`
   - **Password**: Gere uma senha segura (anote!)
   - **Clique em**: "Create User"

#### 3.2 Configurar Acesso de Rede

1. **Na seção "Where would you like to connect from?"**:
   - **Clique em**: "Add My Current IP Address"
   - **Para Render, adicione**: `0.0.0.0/0` (permite qualquer IP)
   - **Clique em**: "Add Entry"
2. **Clique em**: "Finish and Close"

### 4. Obter String de Conexão

1. **No Dashboard**, clique em "Connect" no seu cluster
2. **Escolha**: "Connect your application"
3. **Driver**: Node.js
4. **Version**: 4.1 or later
5. **Copie a string de conexão**:
   ```
   mongodb+srv://zarauser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

### 5. Personalizar String de Conexão

**Substitua**:
- `<password>` pela senha do usuário `zarauser`
- Adicione o nome do banco: `/zaraqualitysystem`

**String final**:
```
mongodb+srv://zarauser:SUA_SENHA_AQUI@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
```

## 🔧 Configuração no Render

### Variáveis de Ambiente Necessárias

```bash
# String principal do MongoDB
MONGODB_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0

# String de fallback (mesma coisa)
MONGO_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
```

## ✅ Verificação da Configuração

### Teste Local (Opcional)

1. **Crie um arquivo** `.env.test`:
   ```bash
   MONGODB_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
   NODE_ENV=production
   ```

2. **Teste a conexão**:
   ```bash
   node -e "require('dotenv').config({path: '.env.test'}); require('./config/database.js');"
   ```

### Verificar no Atlas

1. **No MongoDB Atlas**, vá em "Database" → "Browse Collections"
2. **Após o primeiro deploy**, você deve ver:
   - Database: `zaraqualitysystem`
   - Collections: `users`, `machines`, `qualitytests`, etc.

## 🚨 Pontos Importantes

### Segurança
- ✅ **NUNCA** commite a senha no Git
- ✅ Use senhas fortes (mínimo 12 caracteres)
- ✅ Configure IP whitelist corretamente

### Performance
- ✅ Use a região mais próxima do Render (us-east-1)
- ✅ Configure connection pooling adequadamente
- ✅ Monitor uso de recursos no Atlas

### Backup
- ✅ Atlas faz backup automático no plano gratuito
- ✅ Retenção de 2 dias no plano M0

## 🔍 Troubleshooting

### Erro: "Authentication failed"
- Verifique usuário e senha
- Confirme que o usuário tem permissões no banco

### Erro: "Connection timeout"
- Verifique whitelist de IPs
- Adicione `0.0.0.0/0` para Render

### Erro: "Database not found"
- O banco será criado automaticamente na primeira conexão
- Verifique o nome do banco na string de conexão

## 📊 Monitoramento

### No Atlas Dashboard
- **Metrics**: CPU, Memory, Connections
- **Real Time**: Operações em tempo real
- **Profiler**: Queries lentas

### Limites do Plano Gratuito (M0)
- **Storage**: 512 MB
- **RAM**: Compartilhada
- **Connections**: 500 simultâneas
- **Bandwidth**: Sem limite

---

## 🎯 Próximo Passo

Após configurar o MongoDB Atlas:
1. ✅ Anote a string de conexão
2. ✅ Configure no Render
3. ✅ Faça o deploy
4. ✅ Teste a aplicação

**🔗 Links Úteis**:
- [MongoDB Atlas](https://cloud.mongodb.com)
- [Documentação Atlas](https://docs.atlas.mongodb.com)
- [Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)