# 📱💻 Guia de Acesso - Computador e Celular

## 🌐 Configuração Atual do Servidor

O servidor está configurado para aceitar conexões de qualquer dispositivo na mesma rede local.

### ✅ Configurações Aplicadas:
- **Host**: `0.0.0.0` (aceita conexões de qualquer IP)
- **Porta**: `3000`
- **Ambiente**: Desenvolvimento

## 🖥️ Acesso pelo Computador

### Opções de Acesso:
1. **Localhost**: `http://localhost:3000`
2. **IP Local**: `http://0.0.0.0:3000`
3. **IP da Máquina**: `http://[SEU_IP_LOCAL]:3000`

## 📱 Acesso pelo Celular

### Pré-requisitos:
- Celular e computador devem estar na **mesma rede Wi-Fi**
- Firewall do Windows deve permitir conexões na porta 3000

### Como Descobrir o IP do Computador:

#### Método 1 - Prompt de Comando:
```cmd
ipconfig
```
Procure por "Adaptador de Rede sem Fio Wi-Fi" e anote o "Endereço IPv4"

#### Método 2 - PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*"}
```

### URL para Celular:
```
http://[IP_DO_COMPUTADOR]:3000
```

**Exemplo**: Se o IP do computador for `192.168.1.100`, acesse:
```
http://192.168.1.100:3000
```

## 🔧 Configuração do Firewall (se necessário)

### Windows Defender Firewall:
1. Abra "Windows Defender Firewall com Segurança Avançada"
2. Clique em "Regras de Entrada" → "Nova Regra"
3. Selecione "Porta" → "TCP" → "Portas Locais Específicas" → Digite `3000`
4. Selecione "Permitir a conexão"
5. Aplique a regra para todos os perfis
6. Nomeie a regra como "Zara Quality System - Porta 3000"

## 🧪 Teste de Conectividade

### Do Computador:
```bash
# Teste local
curl http://localhost:3000

# Teste IP local
curl http://0.0.0.0:3000
```

### Do Celular:
1. Abra o navegador
2. Digite: `http://[IP_DO_COMPUTADOR]:3000`
3. Deve carregar a interface do sistema

## 🚨 Solução de Problemas

### Celular não consegue acessar:
1. ✅ Verifique se estão na mesma rede Wi-Fi
2. ✅ Confirme o IP do computador
3. ✅ Teste o firewall (desative temporariamente para teste)
4. ✅ Reinicie o servidor se necessário

### Comandos Úteis:
```bash
# Verificar se o servidor está rodando
netstat -an | findstr :3000

# Descobrir IP da máquina
ipconfig | findstr IPv4
```

## 📋 Checklist de Verificação

- [ ] Servidor rodando em `0.0.0.0:3000`
- [ ] Computador e celular na mesma rede Wi-Fi
- [ ] IP do computador identificado
- [ ] Firewall configurado (se necessário)
- [ ] Teste de acesso realizado

---

**✅ Status Atual**: Servidor configurado e pronto para acesso de múltiplos dispositivos!

**🌐 URL Local**: `http://0.0.0.0:3000`
**📱 URL Celular**: `http://[SEU_IP]:3000`