# Usuários do Sistema de Qualidade Zara

Este documento contém as credenciais dos usuários criados no sistema.

## Usuários Disponíveis

### 1. Operador
- **Username:** `operador1`
- **Password:** `123456`
- **Role:** `operator`
- **Email:** `operador@zara.com`
- **Permissões:** Acesso básico ao sistema, pode realizar testes de qualidade

### 2. Líder
- **Username:** `lider1`
- **Password:** `123456`
- **Role:** `leader`
- **Email:** `lider@zara.com`
- **Permissões:** Acesso intermediário, pode gerenciar equipe e visualizar relatórios

### 3. Gestor
- **Username:** `gestor1`
- **Password:** `123456`
- **Role:** `manager`
- **Email:** `gestor@zara.com`
- **Permissões:** Acesso completo ao sistema, pode gerenciar usuários, máquinas e configurações

## Usuários de Teste (Hardcoded)

Além dos usuários do banco de dados, também existem usuários de teste hardcoded no sistema:

### Admin
- **Username:** `admin`
- **Password:** `123456`
- **Role:** `manager`

### Manager
- **Username:** `manager`
- **Password:** `123456`
- **Role:** `manager`

## Como Fazer Login

1. Acesse a aplicação em: http://localhost:5173/
2. Use qualquer uma das credenciais acima
3. O sistema redirecionará automaticamente para o dashboard

## Notas Importantes

- Todos os usuários usam a senha padrão `123456`
- Os usuários são criados automaticamente quando o servidor inicia
- Em ambiente de desenvolvimento, o sistema usa MongoDB Memory Server
- Os usuários hardcoded funcionam mesmo sem conexão com o banco de dados

## Status do Sistema

- ✅ MongoDB conectado
- ✅ 3 usuários criados no banco de dados
- ✅ Usuários de teste hardcoded disponíveis
- ✅ Sistema funcionando corretamente