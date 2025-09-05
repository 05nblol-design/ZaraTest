# 🏭 Zara Quality System

Sistema de controle de qualidade para linha de produção com dashboards específicos para operadores, líderes e gestores.

## 🚀 Funcionalidades

### 👷 Dashboard do Operador
- Registro de testes de qualidade
- Controle de sessões de operação
- Visualização de KPIs básicos
- Interface otimizada para uso em produção

### 👨‍💼 Dashboard do Líder
- Monitoramento de equipes
- Análise de produtividade
- Gestão de alertas
- Relatórios de turno

### 📊 Dashboard do Gestor
- Visão estratégica completa
- KPIs avançados e métricas
- Análise de tendências
- Relatórios executivos
- Sistema de cache para performance

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Banco de Dados**: MongoDB com Mongoose
- **Autenticação**: JWT (JSON Web Tokens)
- **Deploy**: Render.com + MongoDB Atlas
- **Controle de Versão**: Git

## 📋 Pré-requisitos

- Node.js 16+ 
- npm ou yarn
- MongoDB (local) ou MongoDB Atlas (produção)
- Git

## 🔧 Instalação e Configuração

### 1. Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/zara-quality-system.git
cd zara-quality-system
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Servidor
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/zara_quality_system
MONGO_URI=mongodb://localhost:27017/zara_quality_system

# Segurança
JWT_SECRET=sua_chave_jwt_muito_segura_com_pelo_menos_32_caracteres
JWT_EXPIRES_IN=24h

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# CORS
CORS_ORIGIN=http://localhost:3000

# Log
LOG_LEVEL=debug
```

### 4. Configurar MongoDB

**Você tem 3 opções para o banco de dados:**

#### 🏠 Opção A: MongoDB Local (Gratuito - Recomendado para desenvolvimento)

✅ **Vantagens:** Gratuito, controle total, sem limites

1. **Guia completo:** Consulte `MONGODB-LOCAL-SETUP.md`
2. **Verificação rápida:** Execute `node scripts/check-mongodb-local.js`
3. **URI no .env:** `MONGODB_URI=mongodb://localhost:27017/zaraqualitysystem`

#### ☁️ Opção B: MongoDB Atlas (Cloud - Para produção)

✅ **Vantagens:** Alta disponibilidade, backup automático, escalabilidade

1. **Guia completo:** Consulte `MONGODB-ATLAS-SETUP.md`
2. **URI no .env:** `MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/zaraqualitysystem`

#### 🔒 Opção C: MongoDB Local com Autenticação (Mais seguro)

✅ **Vantagens:** Gratuito + segurança adicional

1. **Configuração:** Siga `MONGODB-LOCAL-SETUP.md` (seção Segurança)
2. **URI no .env:** `MONGODB_URI=mongodb://admin:senha@localhost:27017/zaraqualitysystem?authSource=admin`

---

**💡 Recomendação:**
- **Desenvolvimento:** Use Opção A (MongoDB Local)
- **Produção pequena/média:** Use Opção C (Local + Auth)
- **Produção crítica:** Use Opção B (Atlas)

### 5. Inicializar Dados

```bash
# Criar usuário administrador
node scripts/create-admin.js

# Criar usuários de teste (opcional)
node scripts/create-users.js

# Popular dados de exemplo (opcional)
node scripts/populate-test-data.js
```

## 🚀 Executar a Aplicação

### Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:3000`

### Produção

```bash
npm start
```

## 👥 Usuários Padrão

Após executar os scripts de inicialização:

| Usuário | Senha | Papel |
|---------|-------|
| admin | admin123 | Administrador |
| operador1 | op123 | Operador |
| lider1 | lider123 | Líder |
| gestor1 | gestor123 | Gestor |

## 📱 Estrutura do Projeto

```
zara-quality-system/
├── public/                 # Arquivos estáticos
│   ├── css/
│   ├── js/
│   └── images/
├── src/
│   ├── controllers/        # Controladores da API
│   ├── models/            # Modelos do MongoDB
│   ├── routes/            # Rotas da API
│   ├── middleware/        # Middlewares
│   └── utils/             # Utilitários
├── views/                 # Templates HTML
├── scripts/               # Scripts de inicialização
├── uploads/               # Arquivos enviados
├── .env.example          # Exemplo de variáveis de ambiente
├── server.js             # Servidor principal
├── package.json          # Dependências e scripts
└── README.md             # Este arquivo
```

## 🌐 Deploy

### Deploy no Render.com

Siga o guia detalhado em [GUIA-RENDER.md](./GUIA-RENDER.md)

**Resumo rápido:**

1. **Preparar repositório Git**
2. **Configurar MongoDB Atlas**
3. **Criar Web Service no Render**
4. **Configurar variáveis de ambiente**
5. **Deploy automático**

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=chave_super_segura_producao
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

## 📊 Performance

### Otimizações Implementadas

- **Cache de dados**: Sistema de cache para reduzir chamadas à API
- **Lazy loading**: Carregamento sob demanda de componentes
- **Debounce**: Otimização de eventos de input
- **Compressão**: Gzip habilitado
- **Minificação**: CSS e JS otimizados

### Monitoramento

- Logs estruturados com Winston
- Métricas de performance
- Health checks automáticos

## 📱 Responsividade

O sistema é totalmente responsivo com breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🔒 Segurança

- Autenticação JWT
- Validação de entrada
- Sanitização de dados
- CORS configurado
- Rate limiting
- Helmet.js para headers de segurança

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Scripts Disponíveis

```bash
npm start          # Iniciar em produção
npm run dev        # Iniciar em desenvolvimento
npm test           # Executar testes
npm run build      # Build para produção
npm run lint       # Verificar código
npm run format     # Formatar código
```

## 🐛 Solução de Problemas

### Erro de Conexão MongoDB

```bash
# Verificar se MongoDB está rodando
mongod --version

# Testar conexão
mongo mongodb://localhost:27017/zara_quality_system
```

### Erro de Porta em Uso

```bash
# Encontrar processo usando a porta
netstat -ano | findstr :3000

# Matar processo (Windows)
taskkill /PID <PID> /F
```

### Problemas de Dependências

```bash
# Limpar cache npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 📞 Suporte

Para suporte técnico:

- 📧 Email: suporte@zaraqualitysystem.com
- 📱 WhatsApp: +55 11 99999-9999
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/zara-quality-system/issues)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🎯 Roadmap

- [ ] Dashboard mobile nativo
- [ ] Integração com sensores IoT
- [ ] Relatórios avançados com gráficos
- [ ] Sistema de notificações push
- [ ] API REST completa
- [ ] Integração com ERP

---

**Desenvolvido com ❤️ para otimizar a qualidade na produção industrial**

**🚀 Deploy automático configurado - Faça push e veja online!**

## Visão Geral

Este é um sistema MVP (Minimum Viable Product) para controle de qualidade da Zara, desenvolvido com HTML, CSS e JavaScript. O sistema permite o gerenciamento de testes de qualidade de embalagens e manutenção de equipamentos, com diferentes níveis de acesso para operadores, líderes e gestores.

## Funcionalidades

### Perfil de Operador
- **Registrar Teste de Qualidade**
  - Selecionar Lote/Número de Caixa/Produto (manual)
  - Preencher parâmetros da embalagem
  - Realizar teste na banheira e registrar resultado
  - Anexar fotos/vídeos
  - Gerar alertas automáticos para testes atrasados

- **Registrar Troca de Teflon**
  - Selecionar máquina
  - Registrar data da troca
  - Cálculo automático da validade do Teflon (5 dias)
  - Gerar alertas próximo do vencimento

### Perfil de Líder
- **Dashboard / Alertas**
  - Visualizar testes atrasados
  - Monitorar Teflons próximos do vencimento
  - Acompanhar lotes com falha
  - Visualizar ranking de operadores/equipamentos

- **Relatórios exportáveis**
  - Gerar relatórios em PDF/Excel

### Perfil de Gestor
- **Dashboard Avançado**
  - Visualizar KPIs e gráficos estratégicos
  - Analisar falhas recorrentes por produto/máquina
  - Monitorar tempo médio de execução de testes
  - Receber alertas críticos

- **Relatórios Inteligentes**
  - Visualizar percentual de lotes aprovados/reprovados
  - Acessar histórico completo de cada lote (rastreabilidade)

- **Auditoria / Exportação**
  - Gerar PDFs com fotos/vídeos
  - Criar comprovantes digitais para certificação/cliente

## Credenciais de Acesso (Demo)

- **Operador**
  - Usuário: operador
  - Senha: 123456

- **Líder**
  - Usuário: lider
  - Senha: 123456

- **Gestor**
  - Usuário: gestor
  - Senha: 123456

## Instalação Local

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd ZaraTest

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## Deploy no Render

### 1. Preparar MongoDB Atlas

1. Criar conta no [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Criar um cluster gratuito
3. Criar um usuário de banco de dados
4. Obter a string de conexão

### 2. Deploy no Render

1. Fazer fork/push do código para GitHub
2. Conectar repositório no [Render](https://render.com)
3. Criar um novo Web Service
4. Configurar as seguintes variáveis de ambiente:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zaraqualitysystem
JWT_SECRET=sua_chave_jwt_super_segura_com_mais_de_32_caracteres
PORT=10000
LOG_LEVEL=info
```

### 3. Configurações do Render

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node
- **Plan**: Free (ou pago conforme necessidade)

### 4. Após Deploy

1. Acessar a URL fornecida pelo Render
2. Criar usuários iniciais usando os scripts:
   - `npm run create-users` (cria operador, líder, gestor)
   - Credenciais padrão: usuário/senha123

## Como Executar

1. Clone ou baixe este repositório
2. Abra o arquivo `index.html` em um navegador web moderno
3. Utilize as credenciais acima para acessar os diferentes perfis

## Testes Automáticos

O sistema inclui testes automáticos da API que são executados automaticamente quando o servidor é iniciado em modo de desenvolvimento.

### Executar testes manualmente:
```bash
npm test
```

### O que os testes verificam:
- ✅ Login de usuário
- ✅ Carregamento de máquinas
- ✅ Criação de teste de qualidade
- ✅ Funcionamento do cronômetro
- ✅ Registro de troca de teflon

### Desabilitar testes automáticos:
Para desabilitar os testes automáticos no startup, defina a variável de ambiente:
```bash
set NODE_ENV=production
npm start
```

## Tecnologias Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Font Awesome (para ícones)

## Deploy no Render

### Configuração Automática

O projeto está configurado para deploy automático no Render.com através do arquivo `render.yaml`.

### Variáveis de Ambiente Obrigatórias

Defina as seguintes variáveis no painel do Render:

```bash
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=ZaraQualitySystem

# Segurança JWT (mínimo 32 caracteres)
JWT_SECRET=sua_chave_jwt_super_segura_para_producao_com_minimo_32_caracteres_aleatorios
```

### Variáveis Opcionais

```bash
# CORS (definir após deploy)
ALLOWED_ORIGINS=https://seu-app.onrender.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoramento
SENTRY_DSN=sua_dsn_do_sentry_para_monitoramento_de_erros
```

### Script de Deploy

Execute o script de pré-deploy para verificações:

```bash
node deploy.js
```

### Recursos do Render Configurados

- **Runtime**: Node.js
- **Região**: Oregon (menor latência)
- **Disco**: 2GB para uploads
- **Scaling**: 1-3 instâncias
- **Headers de Segurança**: Configurados automaticamente
- **Health Check**: Endpoint `/`
- **Build Otimizado**: `npm ci --only=production`

### Monitoramento

- Logs disponíveis no painel do Render
- Health checks automáticos
- Alertas de deploy via email
- Métricas de performance integradas

## Observações

Este é um MVP (Minimum Viable Product) desenvolvido para demonstração. Em um ambiente de produção, seria necessário implementar:

- Backend com banco de dados para persistência ✅ (Implementado)
- Autenticação segura ✅ (JWT implementado)
- Validações mais robustas ✅ (Implementado)
- Testes automatizados ✅ (Implementado)
- Responsividade aprimorada para dispositivos móveis ✅ (Implementado)
- Monitoramento e logging avançado 🔄 (Em progresso)
- Cache e otimizações de performance 🔄 (Em progresso)