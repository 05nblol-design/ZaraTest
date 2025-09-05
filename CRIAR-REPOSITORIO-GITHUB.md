# Como Criar o Repositório no GitHub

Siga estes passos para criar o repositório no GitHub e conectar seu projeto:

## 1. Criar Repositório no GitHub

1. Acesse [GitHub.com](https://github.com) e faça login
2. Clique no botão **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Preencha os dados:
   - **Repository name**: `zara-quality-system`
   - **Description**: `Sistema de Qualidade Zara - Controle de Qualidade Industrial`
   - Marque como **Public** (ou Private se preferir)
   - **NÃO** marque "Add a README file" (já temos um)
   - **NÃO** marque "Add .gitignore" (já temos um)
   - **NÃO** marque "Choose a license"
5. Clique em **"Create repository"**

## 2. Conectar o Repositório Local

Após criar o repositório, o GitHub mostrará uma página com comandos. Use estes comandos no terminal:

```bash
# Adicionar o repositório remoto (substitua SEU_USUARIO pelo seu nome de usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/zara-quality-system.git

# Fazer push do código
git push -u origin main
```

## 3. Exemplo Completo

Se seu usuário do GitHub for `joaosilva`, os comandos serão:

```bash
git remote add origin https://github.com/joaosilva/zara-quality-system.git
git push -u origin main
```

## 4. Verificar se Funcionou

Após executar os comandos:
1. Atualize a página do repositório no GitHub
2. Você deve ver todos os arquivos do projeto
3. O link do seu repositório será: `https://github.com/SEU_USUARIO/zara-quality-system`

## 5. Próximos Passos

Com o repositório criado, você pode:
- Usar o link para fazer deploy no Render.com (seguindo o `GUIA-RENDER.md`)
- Compartilhar o código com outros desenvolvedores
- Fazer backup automático do seu código

## Comandos Úteis

```bash
# Ver status do repositório
git status

# Ver repositórios remotos configurados
git remote -v

# Fazer push de mudanças futuras
git add .
git commit -m "Descrição das mudanças"
git push
```

---

**Importante**: Substitua `SEU_USUARIO` pelo seu nome de usuário real do GitHub nos comandos acima.