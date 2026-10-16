# VÉRA Studio

E-commerce de moda full-stack construído como **projeto de portfólio**. A loja, os produtos e os
dados comerciais são fictícios, e nenhum pagamento real é processado (o Stripe roda em modo de teste).

> **Status:** Fase 4 de 8 (interface). Home, catálogo com filtros e busca, página de produto e
> páginas institucionais funcionam com dados reais da API; autenticação, carrinho e pagamentos
> chegam nas próximas fases.
> Veja o [plano completo](docs/architecture.md#plano-de-fases).

## Tecnologias

| Camada         | Tecnologias                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router, TanStack Query  |
| Backend        | Node.js, Express 5, TypeScript, Zod, Prisma 7, pino                          |
| Banco          | PostgreSQL (Docker no desenvolvimento, Supabase em produção)                 |
| Serviços       | Supabase Auth e Storage, Stripe Checkout (modo de teste)                      |
| Qualidade      | Vitest, Supertest, ESLint, Prettier, GitHub Actions                          |
| Implantação    | Vercel (frontend), Render (backend), Supabase (banco)                        |

As versões exatas e o motivo de cada escolha estão em [docs/decisions.md](docs/decisions.md).

## Estrutura de pastas

```
.
├─ frontend/            # SPA React (Vite)
│  └─ src/
│     ├─ app/           # rotas, layout, providers
│     ├─ pages/         # uma pasta por página
│     ├─ features/      # lógica por domínio (catálogo, carrinho, auth...)
│     ├─ components/    # componentes visuais reutilizáveis
│     ├─ config/        # brand.ts (nome/contatos da loja) e env.ts
│     ├─ lib/           # cliente da API e utilitários
│     └─ styles/        # Tailwind e tokens de design
├─ backend/             # API REST (Express)
│  ├─ prisma/           # schema, migrations e seed
│  ├─ src/
│  │  ├─ config/        # variáveis de ambiente validadas
│  │  ├─ modules/       # um módulo por domínio (rotas, controller, service...)
│  │  ├─ middlewares/   # erros, autenticação, validação
│  │  └─ lib/           # logger, banco, erros
│  └─ tests/
├─ docs/                # arquitetura e decisões técnicas
└─ docker-compose.yml   # PostgreSQL local
```

## Requisitos

- **Node.js 24 LTS** (mínimo 22.22.2). Com [nvm](https://github.com/nvm-sh/nvm): `nvm use`.
- **Docker Desktop** (para o PostgreSQL local).
- Git.

## Como executar localmente

```bash
# 1. Instalar as dependências (frontend e backend de uma vez)
npm install

# 2. Criar os arquivos de ambiente a partir dos exemplos
#    e preencher os dados do Supabase (veja "Configurar o Supabase" abaixo)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Subir o PostgreSQL local
npm run db:up

# 4. Criar as tabelas e carregar os produtos de demonstração
npm run db:migrate -w backend
npm run db:seed -w backend

# 5. Iniciar API (porta 3333) e frontend (porta 5173) juntos
npm run dev
```

Abra http://localhost:5173 (status da API e do banco) ou teste a API direto, por exemplo
http://localhost:3333/catalog/products?category=feminino.

> No Windows (PowerShell), troque `cp` por `Copy-Item`.

## Configurar o Supabase (autenticação)

O login usa o [Supabase Auth](https://supabase.com/docs/guides/auth). O plano gratuito basta.

1. Crie um projeto em https://supabase.com (região South America, São Paulo).
2. Em **Project Settings → JWT Keys**, confira se a chave atual é assimétrica (ECC P-256 ou RSA).
   Se for "Legacy HS256", crie uma chave assimétrica e torne-a a atual. Assim o backend confere o
   login só com a chave **pública** (JWKS), sem guardar segredos.
3. Em **Authentication → URL Configuration**, defina o *Site URL* `http://localhost:5173` e
   adicione `http://localhost:5173/redefinir-senha` em *Redirect URLs*.
4. Opcional, para desenvolvimento: em **Authentication → Sign In / Providers → Email**, desligue
   *Confirm email* (o e-mail gratuito do Supabase tem limite baixo de envios por hora).
5. Preencha os `.env` com a **Project URL** e a **Publishable key** (Project Settings → API Keys):
   - `backend/.env`: `SUPABASE_URL`
   - `frontend/.env`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`

A **Secret key** e a senha do banco nunca vão para o frontend nem para o Git.

### Criar o primeiro administrador

O cadastro pela loja sempre cria uma conta de **cliente**. Para dar acesso ao painel:

1. Crie a conta normalmente em http://localhost:5173/cadastro e entre uma vez.
2. Rode, na raiz do projeto: `npm run make-admin -w backend -- seu-email@exemplo.com`
3. Saia e entre de novo (ou recarregue a página). O link do painel aparece em "Minha conta".

Para remover o acesso: `npm run make-admin -w backend -- seu-email@exemplo.com --revoke`.

### Configurar o envio de fotos (Supabase Storage)

O painel envia as fotos dos produtos direto do navegador para o Supabase Storage, por um link de
uso único criado pela API. Para ativar:

1. No Supabase, em **Storage**, crie o bucket `product-images` marcado como **Public**, com limite
   de **5 MB** e tipos permitidos `image/jpeg, image/png, image/webp`.
2. Em **Project Settings > API Keys**, copie a **secret key** (`sb_secret_...`) para
   `SUPABASE_SECRET_KEY` no `backend/.env`. Ela fica **só** no backend: nunca no frontend, no Git
   ou em mensagens.
3. Reinicie o backend.

Sem a secret key, o painel funciona normalmente, mas o envio de fotos responde com um aviso de
"pendente de configuração" (o backend avisa isso no log ao iniciar).

## Comandos

Execute na raiz do projeto:

| Comando                | O que faz                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Sobe backend e frontend em modo de desenvolvimento               |
| `npm run check`        | Roda **tudo**: formatação, lint, tipos, testes e build           |
| `npm run test`         | Testes do backend e do frontend                                  |
| `npm run typecheck`    | Verificação de tipos do TypeScript                               |
| `npm run lint`         | ESLint                                                           |
| `npm run format`       | Formata o código com Prettier                                    |
| `npm run build`        | Build de produção dos dois projetos                              |
| `npm run db:up`        | Sobe o PostgreSQL no Docker                                      |
| `npm run db:down`      | Para o PostgreSQL (os dados continuam salvos no volume)          |

Comandos do banco, executados com `-w backend` (ex.: `npm run db:seed -w backend`):

| Comando              | O que faz                                                            |
| -------------------- | -------------------------------------------------------------------- |
| `db:migrate`         | Aplica migrations pendentes no banco de desenvolvimento e cria novas  |
| `db:seed`            | Recria o catálogo demonstrativo (apaga só as tabelas do catálogo)     |
| `db:reset`           | Apaga o banco de desenvolvimento inteiro e reaplica as migrations     |
| `db:deploy`          | Aplica migrations sem criar novas (usado em produção)                 |
| `db:studio`          | Abre o Prisma Studio para navegar pelos dados no navegador            |

> `npm run test` e `npm run check` precisam do PostgreSQL rodando (`npm run db:up`): os testes de
> integração usam um banco separado, `vera_studio_test`, e apagam os dados dele a cada execução.

## Variáveis de ambiente

**Backend** (`backend/.env`): veja [backend/.env.example](backend/.env.example).

| Variável       | Uso                                                              |
| -------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | Conexão da aplicação com o banco (no Supabase: pooler, porta 6543) |
| `DIRECT_URL`   | Conexão usada pelas migrations (no Supabase: porta 5432)          |
| `TEST_DATABASE_URL` | Banco exclusivo dos testes automatizados (os dados são apagados) |
| `SUPABASE_URL` | Project URL do Supabase, usada para conferir o login (chaves públicas) |
| `SUPABASE_SECRET_KEY` | Opcional. Secret key do Supabase, usada só para o envio de fotos |
| `CORS_ORIGINS` | Origens autorizadas a chamar a API, separadas por vírgula         |
| `PORT`         | Porta da API (padrão 3333)                                        |
| `LOG_LEVEL`    | Nível de log (padrão `info`)                                      |

**Frontend** (`frontend/.env`): `VITE_API_URL` (endereço da API), `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` (chave **pública** do Supabase).
Toda variável `VITE_*` é **pública** (vai para o navegador): nunca coloque segredos nela.

O servidor valida as variáveis ao iniciar e, se algo estiver errado, mostra qual variável corrigir
(sem exibir o valor, que pode conter senhas).

## Endpoints disponíveis

| Método | Rota                          | Descrição                                               |
| ------ | ----------------------------- | ------------------------------------------------------- |
| GET    | `/health`                     | O processo está no ar (usado pelo Render)               |
| GET    | `/health/ready`               | A API consegue acessar o banco (200 ou 503)             |
| GET    | `/catalog/categories`         | Categorias com a contagem de produtos publicados        |
| GET    | `/catalog/products`           | Busca, filtros, ordenação e paginação                   |
| GET    | `/catalog/products/:slug`     | Detalhes de um produto publicado                        |
| GET    | `/catalog/filters`            | Cores, tamanhos e faixa de preço disponíveis            |
| GET    | `/me`                         | Perfil do usuário logado (exige login)                  |
| PATCH  | `/me`                         | Altera o próprio nome (exige login)                     |
| \*     | `/admin/...`                  | Painel: indicadores, produtos, variações, fotos e categorias (exige ADMIN) |

Parâmetros, formatos de resposta e regras: [docs/api.md](docs/api.md).

## Diagnóstico de problemas comuns

- **`Variáveis de ambiente inválidas`** ao rodar o backend: o arquivo `backend/.env` não existe
  ou tem algum valor errado. Copie o `.env.example` e confira a variável indicada.
- **Frontend mostra "Sem conexão"**: confira se o backend está rodando e se `VITE_API_URL`
  aponta para ele. Se o backend rodar e o banco não, `/health/ready` responde 503.
- **`TEST_DATABASE_URL não definida`** ao rodar os testes: adicione a variável ao `backend/.env`
  (veja o `.env.example`).
- **`database "vera_studio_test" does not exist`**: o volume do Docker foi criado antes do script
  que cria o banco de testes. Rode `npm run db:down`, depois
  `docker volume rm verastudio_vera-db-data` (apaga os dados locais) e `npm run db:up`.
- **Porta 5432 ocupada**: há outro PostgreSQL rodando na máquina. Pare-o ou mude a porta no
  `docker-compose.yml` e nas URLs do `.env`.

## Implantação

Documentada na Fase 8. Variáveis, URLs públicas, CORS, migrations e webhooks serão descritos em
`docs/deploy.md`.

## Limitações conhecidas (Fase 5)

- O carrinho (Fase 6) e os pagamentos (Fase 7) ainda não existem. Na página do produto, o botão
  "Adicionar ao carrinho" fica desativado e diz isso. No painel, os indicadores de pedidos e
  receita aparecem só a partir da Fase 6.
- No painel, a cor e o tamanho de uma variação não podem ser editados depois de criados (isso
  mudaria o que já foi vendido com aquele SKU): desative a variação e cadastre outra.
- As páginas de contato e políticas são conteúdo demonstrativo, identificado em cada página.
- As fotos são ilustrativas, do Unsplash, e não mostram exatamente os produtos fictícios
  (créditos em [docs/credits.md](docs/credits.md)).
- A busca usa `ILIKE` (contém o texto, sem diferenciar maiúsculas). Ela diferencia acentos:
  "cafe" não encontra "café".

## Sobre este projeto

Projeto de portfólio desenvolvido para demonstrar a construção de uma aplicação full-stack completa.
Não representa uma loja real, e não há clientes, vendas ou depoimentos reais associados a ele.
