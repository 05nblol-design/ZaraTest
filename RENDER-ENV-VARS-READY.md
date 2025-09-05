# 🚀 Variáveis de Ambiente - PRONTAS PARA O RENDER

## ✅ Configuração Completa

### 📋 Copie e Cole no Dashboard do Render

**Acesse**: [render.com](https://render.com) → Seu Serviço → **Environment**

#### Variáveis Obrigatórias:

```bash
# 1. Banco de Dados MongoDB Atlas
MONGODB_URI=mongodb+srv://05:44092639@cluster0.hvggzox.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0

# 2. Chave Secreta JWT (Gerada automaticamente)
JWT_SECRET=2a72b5f4d8cc7698b7a88bab0b1909d1c62280c105d2e0d2dd7f2a1576423f80d5fdfd6555baac4aad8ad9773a9bfe296f4c0c73d8adc097b83553284764bac8

# 3. Ambiente de Produção
NODE_ENV=production
```

#### Variáveis Opcionais (Recomendadas):

```bash
# Configurações do Servidor
PORT=10000
LOG_LEVEL=warn

# URLs e CORS
CORS_ORIGIN=https://zara-quality-system-2.onrender.com
SOCKET_CORS_ORIGIN=https://zara-quality-system-2.onrender.com
FRONTEND_URL=https://zara-quality-system-2.onrender.com

# Performance
COMPRESSION_ENABLED=true
METRICS_ENABLED=true
```

## 🔧 Como Configurar no Render

### Passo a Passo:

1. **Acesse o Dashboard**:
   - Vá para [render.com](https://render.com)
   - Faça login na sua conta
   - Clique no serviço `zara-quality-system`

2. **Adicionar Variáveis**:
   - No menu lateral, clique em **"Environment"**
   - Clique em **"Add Environment Variable"**
   - Adicione uma por vez:

   **Variável 1:**
   - Key: `MONGODB_URI`
   - Value: `mongodb+srv://05:44092639@cluster0.hvggzox.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0`

   **Variável 2:**
   - Key: `JWT_SECRET`
   - Value: `2a72b5f4d8cc7698b7a88bab0b1909d1c62280c105d2e0d2dd7f2a1576423f80d5fdfd6555baac4aad8ad9773a9bfe296f4c0c73d8adc097b83553284764bac8`

   **Variável 3:**
   - Key: `NODE_ENV`
   - Value: `production`

3. **Salvar e Deploy**:
   - Clique em **"Save Changes"**
   - O Render fará automaticamente um redeploy
   - Aguarde o deploy completar (5-10 minutos)

## ✅ Verificação

### Após o Deploy:

1. **Acesse sua aplicação**: https://zara-quality-system-2.onrender.com
2. **Verifique se não há mais erro 500**
3. **Teste o login** (se disponível)
4. **Monitore os logs** no dashboard do Render

### Se ainda houver problemas:

1. **Verifique os logs** no Render Dashboard
2. **Confirme** que todas as 3 variáveis foram salvas
3. **Force um redeploy** manual se necessário

## 🔒 Segurança

- ✅ **JWT_SECRET**: Gerado com 128 caracteres hexadecimais seguros
- ✅ **MONGODB_URI**: Inclui autenticação e SSL automático
- ✅ **Variáveis**: Configuradas apenas no Render (não no código)

## 🎯 Resultado Esperado

Após configurar essas variáveis:
- ❌ **Antes**: Erro HTTP 500
- ✅ **Depois**: Aplicação funcionando normalmente
- ✅ **MongoDB**: Conectado ao Atlas
- ✅ **JWT**: Tokens seguros funcionando
- ✅ **Frontend**: Servindo corretamente

---

**🚀 Pronto! Sua aplicação estará funcionando no Render após essas configurações.**