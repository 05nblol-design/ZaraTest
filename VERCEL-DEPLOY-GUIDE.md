# 🚀 Guia de Deploy no Vercel - Sistema de Qualidade Zara

## 📋 Pré-requisitos

- [x] Conta no GitHub (já configurada)
- [x] Repositório no GitHub (https://github.com/05nblol-design/ZaraTest.git)
- [ ] Conta no Vercel (criar em https://vercel.com)
- [x] MongoDB Atlas configurado

## 🔧 Configuração do Projeto

### 1. Arquivos Criados/Modificados

- ✅ `vercel.json` - Configuração do Vercel
- ✅ `package.json` - Scripts atualizados
- ✅ `.env.vercel` - Variáveis de ambiente

### 2. Estrutura do Projeto

```
ZaraTest/
├── server.js          # Backend (API)
├── client/            # Frontend (React)
│   ├── src/
│   ├── dist/          # Build do frontend
│   └── package.json
├── vercel.json        # Configuração Vercel
└── package.json       # Scripts principais
```

## 🚀 Deploy no Vercel

### Passo 1: Criar Conta no Vercel

1. Acesse https://vercel.com
2. Clique em "Sign Up"
3. Conecte com sua conta GitHub
4. Autorize o Vercel a acessar seus repositórios

### Passo 2: Importar Projeto

1. No dashboard do Vercel, clique em "New Project"
2. Selecione "Import Git Repository"
3. Escolha o repositório `05nblol-design/ZaraTest`
4. Clique em "Import"

### Passo 3: Configurar Build

**Framework Preset:** Other
**Root Directory:** `./` (raiz do projeto)
**Build Command:** `npm run vercel-build`
**Output Directory:** `client/dist`
**Install Command:** `npm install`

### Passo 4: Configurar Variáveis de Ambiente

1. Na página de configuração do projeto, vá para "Environment Variables"
2. Adicione as seguintes variáveis:

```env
MONGODB_URI=mongodb+srv://05:44092639@cluster0.hvggzox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=sua_chave_jwt_super_secreta_aqui
NODE_ENV=production
PORT=3000
```

**⚠️ IMPORTANTE:** Para gerar o JWT_SECRET, use:
```bash
openssl rand -base64 32
```
Ou use um gerador online de chaves JWT.

### Passo 5: Deploy

1. Clique em "Deploy"
2. Aguarde o build completar
3. Acesse a URL fornecida pelo Vercel

## 🔍 Verificação do Deploy

### URLs de Teste

- **Frontend:** `https://seu-projeto.vercel.app`
- **API Health:** `https://seu-projeto.vercel.app/api/health`
- **API Auth:** `https://seu-projeto.vercel.app/api/auth/login`

### Logs e Debug

1. No dashboard do Vercel, vá para "Functions"
2. Clique em "View Function Logs"
3. Monitore erros e performance

## 🔧 Configurações Avançadas

### Domínio Personalizado

1. Vá para "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Configure DNS conforme instruções

### Monitoramento

1. Ative "Analytics" nas configurações
2. Configure "Speed Insights"
3. Monitore performance e erros

## 🚨 Troubleshooting

### Erro de Build

- Verifique logs na aba "Functions"
- Confirme se todas as dependências estão no `package.json`
- Verifique se o `vercel.json` está correto

### Erro de Conexão MongoDB

- Confirme se `MONGODB_URI` está configurada
- Verifique se o IP do Vercel está liberado no MongoDB Atlas
- Teste a conexão localmente

### Erro 404 nas Rotas

- Verifique configuração de rotas no `vercel.json`
- Confirme se o frontend está sendo servido corretamente

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **GitHub Issues:** https://github.com/05nblol-design/ZaraTest/issues

---

**✅ Projeto pronto para deploy no Vercel!**