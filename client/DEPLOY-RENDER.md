# Deploy do Frontend React no Render

## Pré-requisitos
- Conta no Render (https://render.com)
- Repositório Git com o código do frontend
- Arquivo `render.yaml` configurado (já criado)

## Passos para Deploy

### 1. Preparar o Repositório
```bash
# Adicionar arquivos ao Git
git add .
git commit -m "feat: Configurar frontend para deploy no Render"
git push origin main
```

### 2. Criar Serviço no Render
1. Acesse https://render.com e faça login
2. Clique em "New +" → "Static Site"
3. Conecte seu repositório GitHub/GitLab
4. Configure:
   - **Name**: `zara-quality-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 3. Configurações Avançadas
- **Auto-Deploy**: Habilitado (deploy automático a cada push)
- **Environment Variables**:
  - `VITE_API_URL`: `https://zara-quality-system-2.onrender.com` (URL do backend)

### 4. Configuração de Rotas (SPA)
O arquivo `render.yaml` já está configurado para:
- Redirecionar todas as rotas para `index.html` (necessário para React Router)
- Servir arquivos estáticos da pasta `dist`

## Estrutura de Arquivos Criados
```
client/
├── render.yaml          # Configuração do Render
├── vite.config.js       # Configuração otimizada do Vite
├── package.json         # Scripts de build já configurados
├── .env                 # Variáveis de ambiente (desenvolvimento)
├── .env.example         # Exemplo de variáveis de ambiente
└── dist/               # Pasta de build (gerada automaticamente)
```

## URLs de Acesso
- **Local**: http://localhost:5173 (desenvolvimento)
- **Render**: https://zara-quality-frontend.onrender.com (após deploy)

## Comandos Úteis
```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

## Notas Importantes
- O build foi testado e está funcionando corretamente
- A configuração do Vite está otimizada para produção
- O servidor de desenvolvimento aceita conexões de qualquer IP (0.0.0.0)
- Os chunks são separados para melhor performance (vendor, router, ui)
- **IMPORTANTE**: Configure a variável `VITE_API_URL` no Render para conectar com o backend

## Configuração de Variáveis de Ambiente

### Desenvolvimento Local
O arquivo `.env` já está configurado com:
```
VITE_API_URL=http://localhost:3000
```

### Produção no Render
No painel do Render, adicione a variável:
- **Key**: `VITE_API_URL`
- **Value**: `https://zara-quality-system-2.onrender.com`