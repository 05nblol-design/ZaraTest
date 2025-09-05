# Configuração MongoDB para Render

## 📋 Pré-requisitos

1. **Conta MongoDB Atlas** (gratuita)
2. **Conta Render** (gratuita)
3. **Repositório Git** configurado

## 🚀 Passo a Passo

### 1. Configurar MongoDB Atlas

1. Acesse [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crie uma conta gratuita ou faça login
3. Crie um novo cluster (M0 Sandbox - gratuito)
4. Configure o usuário do banco de dados:
   - Username: `zarauser`
   - Password: `[gere uma senha segura]`
5. Configure o acesso de rede:
   - Adicione `0.0.0.0/0` (permitir de qualquer lugar)
   - Ou adicione os IPs do Render se disponível

### 2. Obter String de Conexão

1. No Atlas, clique em "Connect"
2. Escolha "Connect your application"
3. Selecione "Node.js" e versão "4.1 or later"
4. Copie a string de conexão:
   ```
   mongodb+srv://zarauser:<password>@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
   ```
5. Substitua `<password>` pela senha real do usuário

### 3. Configurar Variáveis no Render

1. Acesse o painel do Render
2. Vá para seu serviço "zara-quality-system"
3. Clique em "Environment"
4. Adicione as seguintes variáveis:

```bash
# MongoDB Principal
MONGODB_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority

# MongoDB Fallback
MONGO_URI=mongodb+srv://zarauser:SUA_SENHA@cluster0.xxxxx.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority

# JWT Secret (gere uma chave de 32+ caracteres)
JWT_SECRET=sua_chave_jwt_super_secreta_com_32_caracteres_ou_mais
```

### 4. Configurações Adicionais (Opcionais)

```bash
# Configurações de Performance
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000
```

## 🔧 Verificação

### Testar Conexão Local

1. Crie um arquivo `.env` baseado no `.env.example`
2. Adicione sua string de conexão MongoDB
3. Execute:
   ```bash
   npm start
   ```
4. Verifique os logs para confirmar conexão

### Monitorar no Render

1. Acesse "Logs" no painel do Render
2. Procure por mensagens como:
   ```
   MongoDB conectado com sucesso
   ```

## 🛡️ Segurança

### Boas Práticas

1. **Nunca commite credenciais** no código
2. **Use variáveis de ambiente** para todas as configurações sensíveis
3. **Rotacione senhas** periodicamente
4. **Configure IP whitelist** quando possível
5. **Monitore acessos** no MongoDB Atlas

### Configurações de Rede

- **Desenvolvimento**: `127.0.0.1` (localhost)
- **Produção**: `0.0.0.0/0` ou IPs específicos do Render

## 📊 Monitoramento

### MongoDB Atlas
- Acesse "Monitoring" no painel
- Verifique métricas de conexão
- Configure alertas se necessário

### Render
- Monitore logs de aplicação
- Configure health checks
- Verifique métricas de performance

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de autenticação**
   - Verifique username/password
   - Confirme que o usuário tem permissões

2. **Timeout de conexão**
   - Verifique configurações de rede
   - Confirme whitelist de IPs

3. **Limite de conexões**
   - Ajuste `maxPoolSize` se necessário
   - Monitore uso no Atlas

### Logs Úteis

```bash
# No Render, procure por:
"MongoDB conectado com sucesso"
"Erro ao conectar ao MongoDB"
"MongoDB desconectado"
```

## 📝 Checklist de Deploy

- [ ] MongoDB Atlas configurado
- [ ] Usuário do banco criado
- [ ] String de conexão obtida
- [ ] Variáveis de ambiente configuradas no Render
- [ ] Deploy realizado
- [ ] Logs verificados
- [ ] Aplicação funcionando

## 🔗 Links Úteis

- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Render Documentation](https://render.com/docs)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Node.js MongoDB Driver](https://mongodb.github.io/node-mongodb-native/)