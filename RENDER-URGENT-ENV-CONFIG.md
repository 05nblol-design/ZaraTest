# 🚨 CONFIGURAÇÃO URGENTE - VARIÁVEIS DE AMBIENTE NO RENDER

## ❌ PROBLEMA IDENTIFICADO

O erro `ENOENT` persiste porque as **variáveis de ambiente críticas** não foram configuradas no dashboard do Render:

- `MONGODB_URI` - **OBRIGATÓRIA** para conexão com banco
- `JWT_SECRET` - **OBRIGATÓRIA** para autenticação

## 🔧 SOLUÇÃO IMEDIATA

### 1. Acesse o Dashboard do Render

1. Vá para: https://render.com
2. Faça login na sua conta
3. Clique no serviço: **zara-quality-system**
4. No menu lateral, clique em: **Environment**

### 2. Adicione as Variáveis Obrigatórias

Clique em **"Add Environment Variable"** e adicione:

#### MONGODB_URI
```
Key: MONGODB_URI
Value: mongodb+srv://05:44092639@cluster0.hvggzox.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0
```

#### JWT_SECRET
```
Key: JWT_SECRET
Value: 2a72b5f4d8cc7698b7a88bab0b1909d1c62280c105d2e0d2dd7f2a1576423f80d5fdfd6555baac4aad8ad9773a9bfe296f4c0c73d8adc097b83553284764bac8
```

### 3. Salvar e Redeploy

1. Clique em **"Save Changes"**
2. O Render fará **redeploy automático**
3. Aguarde 3-5 minutos para conclusão

## ✅ VERIFICAÇÃO

Após o redeploy:

1. Acesse: https://zara-quality-system-2.onrender.com
2. Verifique se a aplicação carrega sem erros
3. Teste o login do sistema

## 🔍 LOGS PARA MONITORAR

No dashboard do Render, vá em **"Logs"** e procure por:

- ✅ `MongoDB conectado com sucesso`
- ✅ `✅ index.html encontrado`
- ✅ `🚀 Servidor rodando na porta`

## ⚠️ SE O ERRO PERSISTIR

Se ainda houver erro `ENOENT` após configurar as variáveis:

1. Verifique se o build do frontend está sendo executado
2. Procure por erros no log: `❌ Falha no build do frontend`
3. Verifique se `dist/index.html` está sendo criado

---

**🚨 AÇÃO IMEDIATA NECESSÁRIA: Configure as variáveis de ambiente AGORA!**