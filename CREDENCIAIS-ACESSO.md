# 🔐 Credenciais de Acesso - Sistema Zara Quality

## 📍 URL da Aplicação
**Produção**: https://zara-quality-system-2.onrender.com/

## 👥 Usuários Disponíveis

### 👷 Operador
- **Usuário**: `operador`
- **Senha**: `123456`
- **Email**: operador@zara.com
- **Permissões**: Acesso básico ao sistema

### 👨‍🏭 Líder de Equipe
- **Usuário**: `lider`
- **Senha**: `123456`
- **Email**: lider@zara.com
- **Permissões**: Supervisão de operadores

### 👨‍💼 Gestor
- **Usuário**: `gestor`
- **Senha**: `123456`
- **Email**: gestor@zara.com
- **Permissões**: Acesso completo ao dashboard e relatórios

## ⚠️ Observações Importantes

1. **Senha Padrão**: Todos os usuários utilizam a senha `123456`
2. **Login**: Use o campo "Usuário" com os nomes acima (operador, lider, gestor)
3. **Status**: ✅ Sistema funcionando corretamente no Render
4. **Health Check**: https://zara-quality-system-2.onrender.com/api/health

## 🔧 Endpoints de API

- **Login**: `POST /api/auth/login`
- **Health Check**: `GET /api/health`
- **Setup Usuários**: `POST /api/setup/create-users` (apenas produção)

## 📊 Status do Sistema

- ✅ **MongoDB**: Conectado e funcionando
- ✅ **API**: Respondendo corretamente
- ✅ **Autenticação**: Login funcionando
- ✅ **Deploy**: Automático via GitHub → Render

---

**Última atualização**: 04/09/2025
**Versão**: 1.0.0
**Ambiente**: Produção (Render)