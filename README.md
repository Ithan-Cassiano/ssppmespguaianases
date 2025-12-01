# Site da Força Pública de São Paulo

Sistema web institucional da Polícia Militar do Estado de São Paulo com painel administrativo completo.

## Estrutura do Projeto

```
site/
├── pages/              Páginas HTML principais
│   ├── index.html      Página inicial
│   ├── admin.html      Painel administrativo
│   └── auth/           Páginas de autenticação
├── scripts/            Arquivos JavaScript
├── styles/             Arquivos CSS
└── images/              Imagens e recursos visuais
```

## Funcionalidades Principais

### Portal Público
- Página inicial com banner institucional
- Seção PM em Números com estatísticas
- Portal de notícias
- Seção de atividades culturais e comunitárias
- Vídeos em destaque
- Navegação completa com menus dropdown

### Painel Administrativo
- Gerenciamento de notícias
- Gerenciamento de atividades
- Gerenciamento de concursos
- Gerenciamento do Diário Oficial
- Gerenciamento de usuários e permissões
- Gerenciamento de números PM
- Gerenciamento do banner principal

### Sistema de Autenticação
- Login e registro de usuários
- Recuperação de senha
- Verificação de e-mail
- Controle de acesso baseado em cargos

### Sistema de Permissões
- **Administrador**: Acesso total
- **Governador**: Acesso a tudo exceto banner e usuários
- **Comandante**: Acesso apenas a concursos
- **P5**: Acesso a notícias, atividades e números PM

## Tecnologias Utilizadas

- HTML5
- CSS3 (com variáveis CSS)
- JavaScript (ES6+)
- LocalStorage para persistência de dados
- Font Awesome para ícones

## Como Usar

1. Abra o arquivo `pages/index.html` em um navegador moderno
2. Para acessar o painel administrativo, faça login com:
   - Usuário: `admin`
   - Senha: `r0@t`

## Estrutura de Dados

Todos os dados são armazenados localmente no navegador usando LocalStorage:
- Notícias
- Atividades
- Concursos
- Publicações do Diário Oficial
- Usuários e permissões
- Números PM
- Configurações do banner

## Navegadores Suportados

- Chrome/Edge (últimas versões)
- Firefox (últimas versões)
- Safari (últimas versões)

## Notas Importantes

- As preferências de acessibilidade são salvas no localStorage
- O design é totalmente responsivo
- Os ícones são fornecidos via Font Awesome CDN
- Todas as funcionalidades JavaScript estão ativas automaticamente
