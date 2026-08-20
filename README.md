# Portal Polícia Federal Virtual

Portal institucional inspirado na referência `portal-pf.web.app`, com área pública e painel ASCOM para publicação de notícias.

## Executar localmente

Pré-requisito: Node.js 18 ou superior.

```powershell
npm start
```

Acesse `http://localhost:3000/`. O painel fica em `http://localhost:3000/admin.html`.

## Publicar notícias

Credenciais iniciais:

- Usuário: `admin`
- Senha: `r0@t`

As publicações ficam persistidas em `data/db.json` e são carregadas pelo portal público através da API. Antes de colocar o site em produção, altere a senha inicial e configure HTTPS.

## Estrutura

- `server.js`: servidor HTTP, API de autenticação e CRUD de notícias.
- `index.html`: portal público responsivo.
- `admin.html`: painel de notícias.
- `styles/pf.css` e `scripts/app.js`: interface e consumo da API.
- `data/db.json`: armazenamento persistente local.
- `pages/`, `scripts/`, `styles/styles.css`: projeto-base preservado para reaproveitamento de páginas existentes.
