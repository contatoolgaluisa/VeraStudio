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
