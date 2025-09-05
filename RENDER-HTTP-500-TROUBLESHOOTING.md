# 🚨 RENDER HTTP 500 - TROUBLESHOOTING URGENTE

## Problema Atual
**Erro**: `Failed to load resource: the server responded with a status of 500`

## Causa Principal
O erro HTTP 500 no Render é causado pela **FALTA DAS VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS**.

## ✅ SOLUÇÃO IMEDIATA - CONFIGURAR VARIÁVEIS NO RENDER

### 1. Acesse o Dashboard do Render
1. Vá para: https://dashboard.render.com
2. Faça login na sua conta
3. Clique no seu serviço `zara-quality-system`

### 2. Configure as Variáveis de Ambiente
1. No painel do serviço, clique em **"Environment"** (lado esquerdo)
2. Clique em **"Add Environment Variable"**
3. Adicione EXATAMENTE estas variáveis:

```
MONGODB_URI=mongodb+srv://05:SUA_SENHA_AQUI@cluster0.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
JWT_SECRET=2a72b5f4d8cc7698b7a88bab0b1909d1c62280c105d2e0d2dd7f2a1576423f80d5fdfd6555baac4aad8ad9773a9bfe296f4c0c73d8adc097b83553284764bac8
NODE_ENV=production
```

### 3. Substitua a Senha do MongoDB
- Na variável `MONGODB_URI`, substitua `SUA_SENHA_AQUI` pela senha real do usuário `05` do MongoDB Atlas
- **NUNCA** deixe `SUA_SENHA_AQUI` - isso causará erro de conexão

### 4. Salve e Redeploy
1. Clique em **"Save Changes"**
2. O Render fará redeploy automático
3. Aguarde 2-3 minutos para o deploy completar

## 🔍 VERIFICAÇÕES ADICIONAIS

### MongoDB Atlas - Network Access
1. Acesse: https://cloud.mongodb.com
2. Vá em **Network Access** → **IP Access List**
3. Certifique-se que `0.0.0.0/0` está adicionado
4. Se não estiver, clique **"Add IP Address"** → **"Allow Access from Anywhere"**

### Verificar Logs do Render
1. No dashboard do Render, clique em **"Logs"**
2. Procure por erros como:
   - `MongooseError: Operation failed`
   - `JWT_SECRET is not defined`
   - `NODE_ENV is not defined`

## 🚨 CHECKLIST DE EMERGÊNCIA

- [ ] Variável `MONGODB_URI` configurada no Render
- [ ] Variável `JWT_SECRET` configurada no Render  
- [ ] Variável `NODE_ENV=production` configurada no Render
- [ ] Senha do MongoDB substituída corretamente
- [ ] IP `0.0.0.0/0` adicionado no MongoDB Atlas
- [ ] Redeploy automático completado
- [ ] Logs do Render verificados

## 📞 SE O PROBLEMA PERSISTIR

1. **Force Manual Redeploy**:
   - No dashboard do Render → **"Manual Deploy"** → **"Deploy Latest Commit"**

2. **Verifique String de Conexão**:
   - Teste a conexão MongoDB localmente
   - Confirme usuário e senha no Atlas

3. **Logs Detalhados**:
   - Verifique logs completos no Render
   - Procure por stack traces específicos

## ⚡ RESULTADO ESPERADO
Após configurar as variáveis de ambiente:
- ✅ Erro HTTP 500 resolvido
- ✅ Aplicação carrega normalmente
- ✅ Conexão com MongoDB estabelecida
- ✅ Sistema de autenticação funcionando

---
**⏰ TEMPO ESTIMADO**: 5-10 minutos para configuração + 2-3 minutos para redeploy