# Arquitetura

## Visão geral

```
[Navegador]
   │  React + Vite (Vercel)
   │   ├─ Supabase Auth (login/cadastro) → recebe um JWT
   │   └─ chama a API enviando "Authorization: Bearer <JWT>"
   ▼
[API Express + TypeScript (Render)]
   │  verifica o JWT (chaves públicas do Supabase) → carrega o perfil e o papel no banco
   │  regras de negócio: preço, estoque, pedidos, permissões
   ├─► PostgreSQL (Supabase) via Prisma
   ├─► Supabase Storage (upload de imagens, apenas pelo backend)
   └─► Stripe (cria a sessão de Checkout) ◄── webhook assinado
```

### Responsabilidades

- **Frontend:** apresentação, navegação e estado de interface. Nunca é fonte de verdade para
  preço, estoque ou permissão.
- **Supabase Auth:** apenas identidade (senha, e-mail de recuperação, sessão).
- **Backend:** única camada que escreve no banco. O papel (`CUSTOMER`/`ADMIN`) fica na tabela
  `UserProfile`, nunca no token nem no frontend.
- **Prisma + PostgreSQL:** dados com integridade referencial e transações para o estoque.
- **Stripe Checkout:** a página de pagamento é hospedada pelo Stripe, então nenhum dado de cartão
  passa pela aplicação. A confirmação do pagamento chega **somente** pelo webhook.

### Estado no frontend

- **TanStack Query**: dados vindos da API (cache, carregamento, erro, nova tentativa).
- **Zustand com `persist`** (Fase 6): carrinho salvo no navegador e revalidado no servidor.

## Organização do backend

Cada domínio fica em `src/modules/<domínio>/` com arquivos separados por responsabilidade:

| Arquivo         | Responsabilidade                                                   |
| --------------- | ------------------------------------------------------------------ |
| `routes.ts`     | Mapeia URL + método para o controller e aplica middlewares         |
| `controller.ts` | Lê a requisição, chama o serviço, monta a resposta HTTP            |
| `service.ts`    | Regras de negócio (não conhece Express)                            |
| `repository.ts` | Acesso ao banco via Prisma                                         |
| `schemas.ts`    | Validação de entrada com Zod                                       |

O `app.ts` recebe suas dependências (configuração, logger, banco) por parâmetro. Isso permite
testar a API com dependências falsas, sem precisar de serviços externos.

### Tratamento de erros

Toda resposta de erro segue o mesmo formato:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Dados inválidos", "details": [] } }
```

Erros esperados usam `AppError` (código HTTP e código de erro definidos). Qualquer outro erro vira
`500 INTERNAL_ERROR` com mensagem genérica; os detalhes vão só para o log.

## Modelo de dados (implementado na Fase 3)

Valores monetários em **centavos (inteiro)**, o formato usado pelo Stripe.

```
UserProfile    id (= id do Supabase Auth) · email · name · role (CUSTOMER|ADMIN) · timestamps
Category       id · name · slug (único) · parentId? · sortOrder · timestamps
Product        id · name · slug (único) · description · categoryId → Category
               priceCents · compareAtPriceCents? · status (DRAFT|PUBLISHED|ARCHIVED) · isNew
ProductImage   id · productId → Product · storagePath · alt · color? · position
ProductVariant id · productId → Product · sku (único) · color · colorHex · size
               stock (CHECK >= 0) · isActive         único: (productId, color, size)
Order          id · number · userId → UserProfile · status · fulfillmentStatus
               subtotalCents · discountCents · shippingCents · totalCents · currency
               shippingAddress (snapshot) · expiresAt · timestamps
OrderItem      id · orderId · variantId? · productName · variantLabel · sku
               unitPriceCents · quantity                ← cópia no momento da compra
Payment        id · orderId · stripeCheckoutSessionId (único) · stripePaymentIntentId?
               status · amountCents · timestamps
WebhookEvent   id (= id do evento Stripe) · type · processedAt
OrderStatusHistory  id · orderId · from · to · changedBy · note · createdAt   ← auditoria
```

- "Novidades" e "Promoções" são **filtros**, não categorias (`isNew` e `compareAtPriceCents`).
- Status de pagamento e status operacional são separados. Só o webhook define `PAID`;
  o administrador altera apenas o status operacional, e tudo fica em `OrderStatusHistory`.

## Plano de fases

| Fase | Conteúdo                                                                                 | Status       |
| ---- | ---------------------------------------------------------------------------------------- | ------------ |
| 1    | Planejamento e arquitetura                                                               | Concluída    |
| 2    | Fundação: monorepo, TypeScript, lint, env validado, Postgres local, health check, CI     | Em revisão   |
| 3    | Banco e produtos: schema, migrations, seed, API pública do catálogo                      | Pendente     |
| 4    | Interface e catálogo: identidade visual, páginas públicas, responsividade, acessibilidade | Pendente     |
| 5    | Autenticação e administração                                                             | Pendente     |
| 6    | Carrinho e pedidos (reserva de estoque)                                                  | Pendente     |
| 7    | Stripe: Checkout, webhooks, idempotência                                                 | Pendente     |
| 8    | Qualidade e implantação                                                                  | Pendente     |

A ordem original previa a interface antes do banco; ela foi invertida (decisão D1) para que as
telas do catálogo já consumam a API real.
