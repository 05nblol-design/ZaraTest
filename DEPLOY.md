# Guia de Deploy no Render

## Pré-requisitos

1. **MongoDB Atlas configurado**
   - Cluster criado
   - Usuário de banco de dados criado
   - String de conexão obtida
   - IP 0.0.0.0/0 liberado (ou IPs do Render)

2. **Repositório Git**
   - Código commitado no GitHub/GitLab
   - Branch main/master atualizada

## Passos para Deploy

### 1. Criar Web Service no Render

1. Acesse [render.com](https://render.com)
2. Faça login/cadastro
3. Clique em "New" → "Web Service"
4. Conecte seu repositório GitHub/GitLab
5. Selecione o repositório do projeto

### 2. Configurações do Service

- **Name**: `zara-quality-system`
- **Environment**: `Node`
- **Region**: `Oregon (US West)` ou mais próximo
- **Branch**: `main` ou `master`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3. Variáveis de Ambiente

Adicione as seguintes variáveis no painel do Render:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority
JWT_SECRET=sua_chave_jwt_super_segura_com_mais_de_32_caracteres_aqui
PORT=10000
LOG_LEVEL=info
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

**⚠️ IMPORTANTE**: Substitua os valores pelos seus dados reais:
- `username` e `password`: credenciais do MongoDB Atlas
- `cluster`: nome do seu cluster
- `JWT_SECRET`: gere uma chave segura de pelo menos 32 caracteres

### 4. Configurações Avançadas (Opcional)

- **Auto-Deploy**: Habilitado (deploy automático a cada push)
- **Health Check Path**: `/`
- **Disk**: Adicionar se precisar de armazenamento persistente para uploads

### 5. Deploy

1. Clique em "Create Web Service"
2. Aguarde o build e deploy (5-10 minutos)
3. Acesse a URL fornecida pelo Render

### 6. Pós-Deploy

1. **Testar a aplicação**:
   - Acesse a URL do Render
   - Teste o login com credenciais padrão
   - Verifique se todas as funcionalidades estão funcionando

2. **Criar usuários** (se necessário):
   - Use o script `create-users.js` via terminal do Render
   - Ou crie manualmente via interface

3. **Monitoramento**:
   - Verifique logs no painel do Render
   - Configure alertas se necessário

## Credenciais Padrão

Após o deploy, use estas credenciais para testar:

- **Operador**: `operador` / `operador123`
- **Líder**: `lider` / `lider123`
- **Gestor**: `gestor` / `gestor123`

## Troubleshooting

### Erro de Conexão com MongoDB
- Verifique se a string `MONGODB_URI` está correta
- Confirme se o IP do Render está liberado no MongoDB Atlas
- Teste a conexão localmente primeiro

### Erro 503 Service Unavailable
- Verifique os logs no painel do Render
- Confirme se todas as variáveis de ambiente estão definidas
- Verifique se o comando de start está correto

### Aplicação não carrega
- Verifique se a porta está configurada corretamente
- Confirme se o `NODE_ENV=production` está definido
- Verifique logs de erro no painel

## URLs Importantes

- **Render Dashboard**: https://dashboard.render.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Documentação Render**: https://render.com/docs

## Comandos Úteis

```bash
# Verificar status local
npm start

# Testar build
npm install

# Verificar variáveis
echo $NODE_ENV
```

## Custos

- **Render Free Tier**: Gratuito com limitações
  - 750 horas/mês
  - Sleep após 15min de inatividade
  - Build time limitado

- **Render Starter**: $7/mês
  - Sem sleep
  - Mais recursos
  - Melhor performance

## Backup e Manutenção

1. **Backup do MongoDB**: Configure backup automático no Atlas
2. **Monitoramento**: Use ferramentas do Render para monitorar performance
3. **Updates**: Mantenha dependências atualizadas
4. **Logs**: Monitore logs regularmente para identificar problemas