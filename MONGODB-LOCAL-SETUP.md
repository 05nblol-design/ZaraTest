# Configuração MongoDB Local - Sistema Zara Quality

## Visão Geral

Sim, você pode usar MongoDB local ao invés do MongoDB Atlas! O sistema já está configurado para suportar ambas as opções. Este guia mostra como configurar e usar MongoDB local.

## Vantagens do MongoDB Local

✅ **Gratuito** - Sem custos de hospedagem
✅ **Controle Total** - Você gerencia tudo localmente
✅ **Sem Limites** - Não há restrições de armazenamento ou conexões
✅ **Privacidade** - Dados ficam no seu servidor
✅ **Performance** - Latência menor em ambiente local

## Pré-requisitos

- Windows Server ou Windows 10/11
- Pelo menos 4GB de RAM disponível
- 10GB de espaço em disco
- Acesso administrativo

## Passo 1: Instalar MongoDB Community Server

### Download e Instalação

1. **Baixar MongoDB:**
   - Acesse: https://www.mongodb.com/try/download/community
   - Selecione: `Windows x64`
   - Versão: `7.0.x` (mais recente)
   - Package: `msi`

2. **Instalar:**
   ```bash
   # Execute o arquivo .msi baixado
   # Escolha "Complete" installation
   # Marque "Install MongoDB as a Service"
   # Marque "Install MongoDB Compass" (opcional - interface gráfica)
   ```

3. **Verificar Instalação:**
   ```bash
   # Abrir PowerShell como Administrador
   mongod --version
   mongo --version
   ```

## Passo 2: Configurar MongoDB Service

### Iniciar Serviço

```bash
# Iniciar serviço MongoDB
net start MongoDB

# Verificar status
sc query MongoDB

# Configurar para iniciar automaticamente
sc config MongoDB start= auto
```

### Configuração Básica

1. **Arquivo de Configuração** (`C:\Program Files\MongoDB\Server\7.0\bin\mongod.cfg`):
   ```yaml
   systemLog:
     destination: file
     path: C:\Program Files\MongoDB\Server\7.0\log\mongod.log
   storage:
     dbPath: C:\Program Files\MongoDB\Server\7.0\data
   net:
     port: 27017
     bindIp: 127.0.0.1,0.0.0.0
   ```

2. **Reiniciar Serviço:**
   ```bash
   net stop MongoDB
   net start MongoDB
   ```

## Passo 3: Configurar Sistema Zara Quality

### Criar Arquivo .env

```bash
# No diretório raiz do projeto
cp .env.example .env
```

### Configurar .env para MongoDB Local

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados MongoDB LOCAL
MONGODB_URI=mongodb://localhost:27017/zaraqualitysystem

# Configurações adicionais do MongoDB
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000

# Segurança JWT
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_com_pelo_menos_32_caracteres

# Configurações de Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Configurações de CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Configurações de Log
LOG_LEVEL=info

# Configurações do Sistema de Chat
CHAT_ENABLED=true
CHAT_MAX_MESSAGES=100
CHAT_MESSAGE_TTL=86400

# Configurações Socket.IO
SOCKET_IO_ENABLED=true
SOCKET_IO_CORS_ORIGIN=http://localhost:3000
SOCKET_IO_TRANSPORTS=websocket,polling
SOCKET_IO_PING_TIMEOUT=60000
SOCKET_IO_PING_INTERVAL=25000
```

## Passo 4: Testar Conexão

### Verificar MongoDB

```bash
# Conectar ao MongoDB via linha de comando
mongo

# Ou usando mongosh (versão mais nova)
mongosh

# Comandos de teste
show dbs
use zaraqualitysystem
show collections
```

### Testar Sistema

```bash
# Instalar dependências (se necessário)
npm install

# Iniciar backend
npm start

# Em outro terminal, iniciar frontend
cd client
npm run dev
```

## Passo 5: Configuração para Produção Local

### Arquivo .env.production

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=production

# Banco de Dados MongoDB LOCAL
MONGODB_URI=mongodb://localhost:27017/zaraqualitysystem_prod

# Configurações de segurança para produção
JWT_SECRET=seu_jwt_secret_super_seguro_para_producao_com_64_caracteres_ou_mais

# Configurações otimizadas para produção
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=10000
MONGODB_SOCKET_TIMEOUT=60000

# CORS para produção (ajustar conforme seu domínio)
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com

# Log level para produção
LOG_LEVEL=warn
```

## Backup e Manutenção

### Backup Automático

```bash
# Criar script de backup (backup-mongodb.bat)
@echo off
set BACKUP_DIR=C:\MongoDB-Backups\%date:~-4,4%-%date:~-10,2%-%date:~-7,2%
mkdir "%BACKUP_DIR%"
mongodump --host localhost:27017 --db zaraqualitysystem --out "%BACKUP_DIR%"
echo Backup concluído em %BACKUP_DIR%
```

### Restaurar Backup

```bash
# Restaurar de backup
mongorestore --host localhost:27017 --db zaraqualitysystem C:\MongoDB-Backups\2024-01-15\zaraqualitysystem
```

### Monitoramento

```bash
# Verificar logs do MongoDB
type "C:\Program Files\MongoDB\Server\7.0\log\mongod.log"

# Verificar performance
mongo --eval "db.stats()"
```

## Segurança (Opcional)

### Habilitar Autenticação

1. **Criar usuário administrador:**
   ```javascript
   // Conectar ao mongo
   mongo
   
   // Usar database admin
   use admin
   
   // Criar usuário
   db.createUser({
     user: "admin",
     pwd: "senha_super_segura",
     roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
   })
   ```

2. **Habilitar auth no mongod.cfg:**
   ```yaml
   security:
     authorization: enabled
   ```

3. **Atualizar .env:**
   ```env
   MONGODB_URI=mongodb://admin:senha_super_segura@localhost:27017/zaraqualitysystem?authSource=admin
   ```

## Troubleshooting

### Problemas Comuns

1. **Serviço não inicia:**
   ```bash
   # Verificar logs
   type "C:\Program Files\MongoDB\Server\7.0\log\mongod.log"
   
   # Verificar porta
   netstat -an | findstr :27017
   ```

2. **Conexão recusada:**
   ```bash
   # Verificar se serviço está rodando
   sc query MongoDB
   
   # Testar conexão
   telnet localhost 27017
   ```

3. **Erro de permissão:**
   ```bash
   # Executar como administrador
   # Verificar permissões da pasta de dados
   ```

## Comparação: Local vs Atlas

| Aspecto | MongoDB Local | MongoDB Atlas |
|---------|---------------|---------------|
| **Custo** | Gratuito | Pago (após limite gratuito) |
| **Setup** | Manual | Automático |
| **Manutenção** | Manual | Automática |
| **Backup** | Manual | Automático |
| **Escalabilidade** | Limitada | Ilimitada |
| **Segurança** | Sua responsabilidade | Gerenciada |
| **Performance** | Depende do hardware | Otimizada |
| **Disponibilidade** | Depende do servidor | 99.95% SLA |

## Conclusão

✅ **MongoDB Local é uma excelente opção para:**
- Desenvolvimento e testes
- Projetos pequenos/médios
- Ambientes com restrições de conectividade
- Controle total sobre dados

⚠️ **Considere MongoDB Atlas para:**
- Aplicações críticas em produção
- Necessidade de alta disponibilidade
- Equipes sem expertise em administração de banco
- Escalabilidade automática

## Próximos Passos

1. ✅ Instalar MongoDB Community Server
2. ✅ Configurar arquivo .env
3. ✅ Testar conexão
4. ✅ Executar sistema localmente
5. ✅ Configurar backup (opcional)
6. ✅ Implementar segurança (opcional)

---

**Nota:** O sistema Zara Quality está preparado para funcionar com ambas as opções. Você pode começar com MongoDB local e migrar para Atlas posteriormente se necessário.