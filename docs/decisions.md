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

## Fase 4B: página de produto e páginas institucionais

### F4-6. Regras de seleção separadas da tela

A lógica de cor e tamanho (`variant-selection.ts`) é feita de funções puras, testadas sem
renderizar nada: cada tamanho pode estar **disponível**, **esgotado** ou **inexistente** na cor
escolhida, e só o primeiro pode ser selecionado. A quantidade vai de 1 até o `maxQuantity` da
variação. Isso é conveniência para o cliente: na Fase 6 o backend valida tudo de novo antes de
criar o pedido.

### F4-7. Cor na URL, tamanho na memória da página

`/produto/camiseta-essential?cor=Preto` abre já na cor certa, o que é útil para compartilhar. O
tamanho não vai para a URL, porque depende da pessoa e não faz sentido num link compartilhado.

### F4-8. Botão do carrinho desativado, com o motivo explícito

O botão "Adicionar ao carrinho" aparece para mostrar o fluxo de seleção, mas fica desativado com
a explicação de que o carrinho chega na Fase 6. A página de contato não tem formulário pelo mesmo
motivo: um formulário que não envia nada seria um elemento decorativo se passando por funcional.

### F4-9. Textos institucionais demonstrativos

Entrega, trocas, privacidade e contato exibem um aviso de conteúdo demonstrativo. As referências
legais (CDC art. 49 e LGPD) são reais, mas o texto não substitui a revisão de um profissional.

## Fase 5A: autenticação

### F5-1. Supabase cuida da identidade; a loja cuida das permissões

Cadastro, senha, sessão e e-mails de recuperação ficam com o Supabase Auth. O papel de cada pessoa
(`CUSTOMER` ou `ADMIN`) fica na tabela `user_profiles`, no **nosso** banco. O token do Supabase
contém `user_metadata`, que o próprio usuário pode editar; por isso o backend nunca lê papel do
token. Há testes que enviam tokens com "ADMIN" nos metadados e confirmam que nada muda.

### F5-2. Verificação do login com chave pública (JWKS)

O backend confere a assinatura de cada token com a chave pública publicada pelo Supabase
(`/auth/v1/.well-known/jwks.json`), além do emissor (`iss`), do público (`aud: authenticated`) e
da validade (`exp`). Nenhum segredo do Supabase fica no servidor para isso. Nos testes, um par de
chaves gerado na hora faz o papel do Supabase, sem depender da internet.

### F5-3. Perfil criado no primeiro acesso

O perfil é criado quando a pessoa chama a API pela primeira vez já logada, sempre como `CUSTOMER`.
Dois acessos simultâneos não duplicam o perfil (a chave primária impede, e o código trata o caso).

### F5-4. Administrador definido por comando no servidor

Não existe tela nem rota que conceda `ADMIN`. O comando `npm run make-admin` roda com acesso direto
ao banco, ou seja, só quem administra o servidor consegue usá-lo.

### F5-5. Esconder no frontend é conveniência, não segurança

`RequireAuth` e `RequireAdmin` só evitam mostrar páginas a quem não deve vê-las. A proteção real é
o backend, que confere login e papel em cada requisição (`requireAuth`, `requireRole`).

### F5-6. Recuperação de senha sem revelar contas

A tela de recuperação mostra a mesma mensagem exista ou não uma conta com o e-mail informado,
para que ninguém a use para descobrir quem é cliente da loja.

## Fase 5B: painel administrativo

### F5-7. Fotos enviadas direto ao Storage, conferidas depois

O arquivo vai do navegador direto para o Supabase Storage, por um link de uso único que a API só
cria depois de conferir que a pessoa é ADMIN. O caminho do arquivo é escolhido pelo servidor
(`products/<id do produto>/<uuid>.<ext>`), então ninguém consegue sobrescrever fotos de outro
produto. Depois do envio, a API confere o arquivo que realmente chegou (tipo e tamanho), e não o
que o navegador declarou; se não servir, apaga o arquivo e recusa. Assim a foto não passa pelo
nosso servidor (sem limite de corpo, sem custo de banda no Render) e a secret key do Supabase
nunca sai do backend.

### F5-8. Estoque ajustado de forma relativa e atômica

O painel não envia "o estoque agora é 10", e sim "+5" ou "-2". Se uma venda acontecer enquanto o
administrador está com a tela aberta, um valor absoluto apagaria essa venda. O ajuste é um único
`UPDATE ... SET stock = stock + delta WHERE stock >= -delta`: se dois ajustes chegarem ao mesmo
tempo, o banco aplica um de cada vez, e o estoque nunca fica negativo (teste com ajustes
simultâneos em `backend/tests/admin.test.ts`).

### F5-9. Regras de publicação no servidor

Um produto só é publicado com ao menos uma variação ativa, e a última variação ativa de um produto
publicado não pode ser desativada (ele sumiria da loja sem aviso). Produtos novos nascem como
rascunho. Categorias só podem ser excluídas sem produtos. O painel mostra as mensagens que o
servidor devolve, em vez de repetir as regras na tela.

### F5-10. Cor e tamanho fixos depois de criados

Uma variação representa uma peça física identificada pelo SKU. Mudar a cor ou o tamanho dela
alteraria o significado de pedidos já feitos (Fase 6). Para corrigir, desativa-se a variação e
cria-se outra. Variações não são excluídas, pelo mesmo motivo.

### F5-11. Indicadores sem números inventados

O dashboard calcula tudo na hora a partir do banco. Pedidos e receita ainda não existem, então a
API responde `orders: null` e a tela explica que esses números chegam na Fase 6. Estoque baixo é
"3 unidades ou menos", contando só variações ativas de produtos que não estão arquivados.

## Fase 6A: carrinho

### F6-1. Store próprio em vez de Zustand

O plano (D3) previa Zustand. Na implementação, o carrinho precisou de pouco: uma lista, quatro
operações e salvar no navegador. O React já tem a peça certa para isso (`useSyncExternalStore`),
e o store inteiro tem menos de 150 linhas comentadas em `frontend/src/features/cart/store.ts`.
Assim o projeto não ganha uma dependência sem necessidade, e o funcionamento fica visível. Se o
estado global crescer (Fase 6B em diante), trocar por Zustand é simples, porque os componentes
só usam `useCartItems`, `useCartCount` e `cart.*`.

### F6-2. O navegador guarda a escolha; o servidor decide os valores

O carrinho salvo guarda variação, quantidade e uma "foto" do produto (nome, cor, imagem) só para
exibir enquanto a API responde. O que é enviado a `POST /cart/quote` é apenas variação e
quantidade: preço, desconto, estoque, frete e total vêm do banco. Campos extras no corpo são
recusados. Os dados salvos são validados com Zod ao carregar; se estiverem corrompidos ou forem
adulterados, o carrinho começa vazio.

### F6-3. Ajuste automático ao estoque

Se o estoque cair abaixo do que está no carrinho, a API devolve a linha como `ADJUSTED` com a
quantidade possível, e a tela aplica essa quantidade e avisa o cliente. Itens esgotados, fora da
loja ou inexistentes voltam como `UNAVAILABLE` e não entram no total. A API não revela o
estoque exato: o máximo por item é o menor entre o estoque e 10.

### F6-4. Frete fixo configurável (D8)

R$ 19,90 para todo o Brasil, grátis quando o valor dos produtos, já com desconto, chega a
R$ 299,00. Os dois valores vêm de variáveis de ambiente com esses padrões. O cálculo é uma função
pura (`backend/src/modules/cart/pricing.ts`), que a Fase 6B reutiliza para o pedido.

## Fase 6B: pedidos

### F6-5. Reserva na criação do pedido, numa única transação

Ao criar o pedido, o servidor confere todos os itens e, na mesma transação, baixa o estoque com
`UPDATE ... SET stock = stock - n WHERE stock >= n` para cada variação, em ordem fixa de id. Se
qualquer baixa não acontecer (outra compra levou a peça no mesmo instante), a transação inteira é
desfeita: ou todos os itens ficam reservados, ou nenhum. O teste de "última peça" faz duas
compras simultâneas e confere que só uma passa e o estoque nunca fica negativo. A ordem fixa evita
que duas compras com os mesmos itens fiquem esperando uma pela outra (deadlock).

### F6-6. Pedido não corrige o carrinho sozinho

O orçamento do carrinho (`/cart/quote`) ajusta quantidades e avisa. A criação do pedido, não: se
algo mudou desde a revisão, responde `409 CART_CHANGED` com a lista do que mudou, e o cliente
revisa o carrinho. Assim ninguém é cobrado por algo diferente do que viu na tela.

### F6-7. Expiração em 30 minutos, com liberação idempotente

O pedido nasce `PENDING_PAYMENT` com `reservationExpiresAt` = criação + 30 min (o mínimo do Stripe
Checkout, que a Fase 7 vai usar como prazo da sessão de pagamento). A liberação muda a situação
com uma condição ("só se ainda estiver aguardando pagamento") antes de devolver o estoque. Duas
liberações ao mesmo tempo (expiração e cancelamento, ou dois processos) devolvem o estoque uma vez
só. As reservas vencidas são liberadas a cada minuto pelo servidor e também antes de criar ou
listar pedidos, porque o servidor gratuito do Render "dorme" e o relógio para junto.

Ponto para a Fase 7: um pagamento que chegue depois da expiração precisa ser tratado (reservar de
novo, se houver estoque, ou reembolsar automaticamente).

### F6-8. Proteções contra abuso da reserva

Reservar sem pagar "segura" estoque. Por isso: no máximo 3 pedidos aguardando pagamento por
cliente; no máximo 10 criações por minuto por cliente (`express-rate-limit`, contador em memória,
suficiente para um único servidor); e a chave de idempotência, que faz um clique duplo ou uma nova
tentativa após erro de rede devolver o mesmo pedido em vez de criar outro.

### F6-9. Situações e transições explícitas, com histórico

As transições permitidas ficam em uma tabela (`orders/order-status.ts`). O painel pode cancelar um
pedido aguardando pagamento e avançar `PAID → PROCESSING → SHIPPED → DELIVERED`. Não existe
transição manual para `PAID`: só a confirmação do pagamento (Fase 7). Cancelar um pedido pago
exige reembolso e chega com o Stripe. Cada mudança grava quem fez (ou "sistema"), quando, de onde
para onde e uma observação opcional. A mudança é condicional à situação atual, então duas pessoas
mudando o mesmo pedido ao mesmo tempo não se sobrescrevem.

### F6-10. Pedido guarda uma cópia do que foi comprado

Nome, endereço do produto, SKU, cor, tamanho, foto, preços e quantidade ficam copiados no
`OrderItem`, e os totais no `Order`, com `CHECK`s no banco (total = subtotal − desconto + frete;
total da linha = preço × quantidade). Alterar ou arquivar o produto depois não muda o pedido. A
variação vendida não pode ser apagada (chave estrangeira `RESTRICT`), só desativada.

### F6-11. Cliente só enxerga os próprios pedidos

Todas as consultas de pedido filtram pelo usuário do token. Pedido de outra pessoa responde 404,
como se não existisse, para não confirmar que aquele id é válido.
