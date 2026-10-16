# Registro de decisões técnicas

Cada decisão registra o contexto, a escolha e suas consequências, para que o raciocínio não se
perca com o tempo.

## Decisões de produto e arquitetura (aprovadas na Fase 1)

| ID | Decisão                                                                                       |
| -- | --------------------------------------------------------------------------------------------- |
| D1 | Banco e API de produtos **antes** da interface do catálogo, para as telas já usarem dados reais. |
| D2 | PostgreSQL em Docker para desenvolvimento e testes; Supabase apenas em produção e para Auth/Storage. |
| D3 | Carrinho no navegador (Zustand + localStorage), revalidado no servidor antes do checkout. Sem tabelas `Cart`/`CartItem` na v1. |
| D4 | Login obrigatório para finalizar a compra (simplifica propriedade dos pedidos e histórico). |
| D5 | Moeda BRL e apenas cartão de teste na v1 (Pix/boleto ficam para depois). |
| D6 | Estoque **reservado** ao criar o pedido e liberado se a sessão do Stripe expirar. |
| D7 | Endereço de entrega coletado pelo Stripe Checkout e copiado para o pedido via webhook. |
| D8 | Frete por regra simples configurável (valores definidos antes da Fase 6). |
| D9 | Monorepo com npm workspaces: um `npm install` e um `npm run dev` para tudo. |

## Fase 2: fundação

### F2-1. Versões verificadas em 15/10/2026

| Pacote               | Versão   | Observação                                                     |
| -------------------- | -------- | -------------------------------------------------------------- |
| Node.js              | 24 LTS   | Mínimo 22.22.2 (exigido pelo React Router 8 e pelo jsdom 30)  |
| TypeScript           | ~6.0.3   | Ver F2-2                                                       |
| React / React DOM    | 19.3     |                                                                |
| Vite                 | 8.3      | `@vitejs/plugin-react` 6 exige Vite 8                          |
| Tailwind CSS         | 4.3      | Integração pelo plugin oficial `@tailwindcss/vite`             |
| React Router         | 8.4      |                                                                |
| TanStack Query       | 5.104    |                                                                |
| Zod                  | 4.6      | Mesmo pacote no frontend e no backend                          |
| Express              | 5.3      | Erros de funções `async` chegam sozinhos ao tratador central   |
| Prisma               | 7.10     | Ver F2-3                                                       |
| Vitest               | 5.0      | Compatível com Vite 8                                          |
| ESLint               | 10       | Com typescript-eslint 8.71                                     |

### F2-2. TypeScript 6.0, e não 7.0

O TypeScript 7 (a reescrita nativa em Go) já é a versão `latest` no npm, mas o
`typescript-eslint` ainda aceita apenas `<6.1.0`. Usar o 7 quebraria o lint. O próprio template
oficial do Vite também fixa `~6.0`. Reavaliar quando o ecossistema de lint suportar a versão 7.

### F2-3. Prisma 7: configuração nova

O Prisma 7 mudou em três pontos que afetam o projeto:

1. A URL do banco saiu do `schema.prisma` e foi para `backend/prisma.config.ts`.
2. O cliente é gerado dentro de `backend/src/generated/prisma` (fora do Git), e não mais em
   `node_modules`.
3. Toda conexão passa por um *driver adapter*; usaremos `@prisma/adapter-pg`.

As migrations usam `DIRECT_URL` (conexão direta). A aplicação usa `DATABASE_URL`, que no Supabase
aponta para o pooler, evitando esgotar as conexões do plano gratuito.

### F2-4. Backend em ESM com `module: NodeNext`

O TypeScript segue as mesmas regras de módulos do Node. Consequência visível: imports relativos no
backend terminam em `.js` (`import { x } from './y.js'`), porque é esse o arquivo que existirá
depois do build. O frontend não precisa disso, pois o Vite resolve os imports.

### F2-5. Health check sem Prisma na Fase 2

O Prisma Client só é gerado quando o schema tem modelos, e os modelos entram na Fase 3. Para provar
a conexão com o banco já na fundação, `src/lib/database.ts` usa o driver `pg` diretamente (o mesmo
driver que o Prisma usa por baixo). Na Fase 3 esse arquivo passa a expor o `PrismaClient`.

### F2-6. Variáveis de ambiente sem `dotenv`

O Node 22+ lê arquivos `.env` nativamente (`process.loadEnvFile()`), então não instalamos o pacote
`dotenv`. As variáveis são validadas com Zod ao iniciar, e o servidor não sobe se faltar algo.

### F2-7. Dois health checks

`GET /health` não toca no banco e é o usado pelo Render. `GET /health/ready` verifica o banco.
Separar os dois evita que uma instabilidade passageira do banco faça o Render reiniciar a API.

### F2-8. ESLint com regras sem informação de tipos

Usamos o conjunto `recommended` do typescript-eslint, que é rápido e não depende do `tsconfig`.
Os erros de tipo já são cobertos pelo `npm run typecheck`. Regras mais rígidas podem ser ativadas
depois, quando houver mais código.

## Fase 3: banco e produtos

### F3-1. Uma migration por fase, junto do código que a usa

O plano inicial previa o schema completo na Fase 3. A migration desta fase cria apenas o catálogo
(`categories`, `products`, `product_images`, `product_variants`). Usuários, pedidos e pagamentos
entram nas fases em que são usados, cada um com a sua migration e os seus testes. Assim cada tabela
nasce com regras testadas, e o histórico de migrations mostra a evolução real do banco.

### F3-2. Regras de integridade no próprio banco

Além das chaves e índices, a migration adiciona `CHECK` constraints que o Prisma não expressa:
estoque nunca negativo, preço maior que zero, preço "de" maior que o preço de venda, formato de
slug e de cor hexadecimal. Mesmo que um bug no código tente gravar um valor inválido, o banco recusa.
Há testes que comprovam essas recusas.

### F3-3. Row Level Security ativado, sem políticas

No Supabase, toda tabela do schema `public` fica exposta pela API automática dele (PostgREST).
Ativar RLS sem criar políticas bloqueia esse caminho; o backend, dono das tabelas, continua com
acesso total. Toda leitura e escrita passa pela nossa API, que valida e autoriza.

### F3-4. Promoção = `compareAtPriceCents`

`priceCents` é sempre o preço cobrado; `compareAtPriceCents` é o preço "de" (riscado). Isso permite
filtrar e ordenar pelo preço real com índice, sem calcular "preço efetivo" em cada consulta.

### F3-5. "Novidades" é uma marcação manual (`isNew`)

Usar só a data de criação faria todo o catálogo do seed ser "novo" ao mesmo tempo. O administrador
marca o que é novidade; a ordenação "mais recentes" continua usando `createdAt`.

### F3-6. A API não expõe o estoque exato

O catálogo devolve `available` e `maxQuantity` (máximo de 10 por item, limitado ao estoque).
O número real de unidades é informação do negócio e só aparece no painel administrativo.

### F3-7. Testes de integração com banco real

Os testes do catálogo rodam contra um PostgreSQL de verdade (`vera_studio_test`), não contra
simulações. Assim testam também os filtros SQL, os índices únicos e os `CHECK`. O banco de testes
é separado do de desenvolvimento e as migrations são aplicadas nele antes de cada execução.

### F3-8. Busca com `ILIKE`

Suficiente para um catálogo pequeno. Para milhares de produtos, a evolução natural é um índice
`pg_trgm` ou busca textual do PostgreSQL, com suporte a acentos (`unaccent`).

### F3-9. Dependência `pg` mantida

O backend não importa mais o `pg` diretamente (o health check agora usa o Prisma), mas ele continua
como dependência do `@prisma/adapter-pg`. A remoção da linha no `package.json` fica para a próxima
atualização de dependências, junto com a regeneração do `package-lock.json`.

## Fase 4A: identidade visual e catálogo

### F4-1. Direção visual

Lookbook editorial: fundo off-white, muito espaço em branco, fotografia grande e títulos em
**Fraunces** (serifada com eixo de tamanho óptico, mais fina e contrastada em tamanhos grandes).
O restante da interface usa **Instrument Sans** e fica deliberadamente discreto: sem cards com
sombra, sem gradientes, botões retos. A ousadia está concentrada em um lugar, o título da home,
que é também o único movimento automático da loja. A cor de destaque (terracota escuro,
`#7A3B2C`) marca promoções, foco do teclado e o item ativo da navegação.

### F4-2. Filtros na URL

Tamanho, cor, preço, ordenação e página ficam na URL (`/loja/feminino?tamanhos=M&ordem=menor-preco`).
O link pode ser compartilhado, o "voltar" do navegador desfaz o último filtro e recarregar a página
não perde nada. A URL usa preços em reais; a API recebe centavos.

### F4-3. Painel lateral próprio, sem biblioteca

O menu do celular e os filtros usam um componente `Drawer` com foco preso dentro do painel, Esc
para fechar e retorno do foco ao botão que o abriu. É pouco código e evita uma dependência a mais.

### F4-4. Imagens responsivas do Unsplash

O Unsplash redimensiona a foto pela URL, então cada `<img>` recebe um `srcSet` com várias larguras
e o navegador baixa a menor que fica nítida. Só a foto principal e os primeiros cards carregam de
imediato; as demais esperam a rolagem (`loading="lazy"`).

### F4-5. Páginas honestas para o que ainda não existe

O link do carrinho e os cards de produto levam a páginas que dizem em qual fase a funcionalidade
chega, em vez de botões que não fazem nada.
