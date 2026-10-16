# API REST

Base local: `http://localhost:3333`. Todas as respostas são JSON.

## Convenções

- **Dinheiro em centavos** (inteiro): `12900` = R$ 129,00. Isso vale para respostas e para filtros.
- **Sucesso:** `{ "data": ... }`, e listas paginadas trazem também `{ "meta": ... }`.
- **Erro:** `{ "error": { "code": "...", "message": "...", "details"?: [...] } }`.

| Código HTTP | `error.code`       | Quando                                          |
| ----------- | ------------------ | ----------------------------------------------- |
| 400         | `VALIDATION_ERROR` | Parâmetro inválido (`details` diz qual e por quê) |
| 400         | `INVALID_JSON`     | Corpo da requisição não é um JSON válido         |
| 404         | `NOT_FOUND`        | Rota ou recurso inexistente                     |
| 409         | `CONFLICT`         | Valor que precisa ser único já existe (ex.: SKU) |
| 422         | (varia)            | Regra de negócio recusou a operação              |
| 503         | (varia)            | Serviço externo indisponível ou não configurado  |
| 500         | `INTERNAL_ERROR`   | Falha inesperada (detalhes só no log do servidor) |

## Saúde do sistema

| Método | Rota            | Resposta                                                           |
| ------ | --------------- | ------------------------------------------------------------------ |
| GET    | `/health`       | `200 { "status": "ok" }`: o processo está no ar                    |
| GET    | `/health/ready` | `200` se o banco responde, `503 { "database": "down" }` se não     |

## Catálogo (público, sem login)

O catálogo mostra **apenas produtos publicados** e **variações ativas**. Rascunhos e produtos
arquivados respondem 404.

### `GET /catalog/categories`

```json
{
  "data": [
    { "id": "…", "slug": "feminino", "name": "Feminino", "description": "…", "productCount": 8 }
  ]
}
```

`productCount` conta somente produtos publicados.

### `GET /catalog/products`

| Parâmetro  | Exemplo              | Descrição                                                  |
| ---------- | -------------------- | ---------------------------------------------------------- |
| `q`        | `vestido`            | Busca no nome (sem diferenciar maiúsculas/minúsculas)       |
| `category` | `feminino`           | Slug da categoria                                          |
| `minPrice` | `10000`              | Preço mínimo em centavos                                   |
| `maxPrice` | `30000`              | Preço máximo em centavos                                   |
| `sizes`    | `P,M`                | Tamanhos, separados por vírgula                            |
| `colors`   | `Preto,Areia`        | Cores, separadas por vírgula (nomes de `/catalog/filters`) |
| `onSale`   | `true`               | Só produtos em promoção                                    |
| `isNew`    | `true`               | Só novidades                                               |
| `sort`     | `price_asc`          | `newest` (padrão), `price_asc` ou `price_desc`             |
| `page`     | `2`                  | Página (padrão 1)                                          |
| `pageSize` | `24`                 | Itens por página (padrão 12, máximo 48)                    |

**Regra dos filtros de cor e tamanho:** uma **mesma variação** precisa ter a cor e o tamanho
pedidos e estar disponível (ativa e com estoque). `colors=Preto&sizes=M` não retorna um produto
que só tem Preto/G e Branco/M.

```json
{
  "data": [
    {
      "id": "…",
      "slug": "camisa-oversized-popeline",
      "name": "Camisa Oversized Popeline",
      "category": { "slug": "feminino", "name": "Feminino" },
      "priceCents": 23900,
      "compareAtPriceCents": 28900,
      "isOnSale": true,
      "discountPercent": 17,
      "isNew": false,
      "image": null,
      "colors": [{ "name": "Azul Céu", "hex": "#A9C3D9" }, { "name": "Branco", "hex": "#F7F6F2" }],
      "sizes": ["P", "M", "G"],
      "inStock": true
    }
  ],
  "meta": { "page": 1, "pageSize": 12, "total": 7, "totalPages": 1 }
}
```

### `GET /catalog/products/:slug`

Detalhes do produto, com todas as imagens em ordem e as variações ativas.

```json
{
  "data": {
    "…": "mesmos campos do resumo, sem `image`",
    "description": "…",
    "images": [{ "id": "…", "url": "…", "alt": "…", "color": "Preto" }],
    "variants": [
      {
        "id": "…",
        "sku": "VS-F02-BRA-P",
        "color": "Branco",
        "colorHex": "#F7F6F2",
        "size": "P",
        "available": true,
        "maxQuantity": 8
      }
    ]
  }
}
```

A quantidade exata em estoque **não é exposta**. `maxQuantity` é o máximo que o cliente pode
colocar no carrinho: o menor valor entre o estoque e o limite de 10 unidades por item.

### `GET /catalog/filters`

Opções para montar os filtros da loja, considerando só o que pode ser comprado.
Aceita `?category=<slug>` para restringir a uma categoria.

```json
{
  "data": {
    "colors": [{ "name": "Areia", "hex": "#D8C8A8" }],
    "sizes": ["P", "M", "G", "GG", "38", "40", "U"],
    "priceRange": { "minCents": 8900, "maxCents": 45900 }
  }
}
```

## Carrinho (público, sem login)

### `POST /cart/quote`

Confere o carrinho guardado no navegador. Recebe **só** variação e quantidade; todos os valores
vêm do banco. Não altera nada (não reserva estoque).

```json
{ "items": [{ "variantId": "<uuid>", "quantity": 2 }] }
```

- No máximo 50 linhas e quantidade de 1 a 99 por linha. Linhas da mesma variação são somadas.
- Campos desconhecidos (ex.: um preço enviado pelo navegador) → `400 VALIDATION_ERROR`.

```json
{
  "data": {
    "items": [
      {
        "variantId": "<uuid>",
        "status": "OK",
        "requestedQuantity": 2,
        "quantity": 2,
        "maxQuantity": 10,
        "unitPriceCents": 15000,
        "compareAtPriceCents": 20000,
        "lineTotalCents": 30000,
        "product": { "id": "...", "slug": "camisa-linho", "name": "Camisa Linho", "image": { "url": "...", "alt": "..." } },
        "variant": { "sku": "VS-CAM-PRE-M", "color": "Preto", "colorHex": "#151515", "size": "M" }
      }
    ],
    "summary": {
      "itemCount": 2,
      "subtotalCents": 40000,
      "discountCents": 10000,
      "shippingCents": 0,
      "totalCents": 30000,
      "freeShippingMinCents": 29900,
      "freeShippingRemainingCents": 0
    }
  }
}
```

| `status`      | Significado                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `OK`          | Disponível na quantidade pedida                                             |
| `ADJUSTED`    | Disponível em quantidade menor (`quantity`), por estoque ou limite de 10    |
| `UNAVAILABLE` | Esgotada, desativada, produto fora da loja ou inexistente (`quantity: 0`)   |

`subtotalCents` usa os preços originais (o preço "de", quando há promoção), `discountCents` é o
que as promoções descontam, e o frete é grátis quando `subtotal - desconto` atinge
`freeShippingMinCents`. Itens indisponíveis não entram nos totais.

## Conta (exige login)

Enviar o cabeçalho `Authorization: Bearer <access token do Supabase>`.

- `GET /me`: perfil do usuário logado (`id`, `email`, `name`, `role`, `createdAt`). O papel
  (`CUSTOMER` ou `ADMIN`) vem do nosso banco, nunca do token.
- `PATCH /me` com `{ "name": "..." }`: altera o próprio nome.

## Painel administrativo (exige ADMIN)

Todas as rotas abaixo exigem login (`401 UNAUTHENTICATED` sem token válido) e o papel `ADMIN`
(`403 FORBIDDEN` para clientes). Corpos com campos desconhecidos são recusados com
`400 VALIDATION_ERROR`.

| Método | Rota                                   | O que faz                                                  |
| ------ | -------------------------------------- | ---------------------------------------------------------- |
| GET    | `/admin/dashboard`                     | Indicadores calculados do banco                            |
| GET    | `/admin/products`                      | Lista com `q` (nome ou SKU), `status`, `page`, `pageSize`  |
| POST   | `/admin/products`                      | Cria um produto (sempre como rascunho)                     |
| GET    | `/admin/products/:id`                  | Detalhe completo, com estoque exato e fotos                |
| PATCH  | `/admin/products/:id`                  | Altera dados, preço, promoção e situação                   |
| POST   | `/admin/products/:id/variants`         | Cria uma variação (cor, tamanho, SKU, estoque inicial)     |
| PATCH  | `/admin/variants/:id`                  | Ativa/desativa, troca SKU ou tom, ajusta estoque (`stockDelta`) |
| POST   | `/admin/products/:id/images/upload-url`| Cria o link de envio de uma foto                           |
| POST   | `/admin/products/:id/images`           | Confere a foto enviada e a cadastra                        |
| PATCH  | `/admin/images/:id`                    | Texto alternativo, cor e posição                           |
| DELETE | `/admin/images/:id`                    | Remove do produto e do Storage (204)                       |
| GET    | `/admin/categories`                    | Categorias com a contagem de produtos                      |
| POST   | `/admin/categories`                    | Cria (o endereço é gerado do nome)                         |
| PATCH  | `/admin/categories/:id`                | Altera nome, descrição e ordem                             |
| DELETE | `/admin/categories/:id`                | Exclui categoria sem produtos (204)                        |

### `GET /admin/dashboard`

```json
{
  "data": {
    "products": { "total": 24, "published": 22, "draft": 1, "archived": 1 },
    "stock": { "threshold": 3, "lowStock": 5, "outOfStock": 2 },
    "lowStockItems": [
      {
        "sku": "VS-CAM-PRE-P",
        "color": "Preto",
        "size": "P",
        "stock": 0,
        "product": { "id": "...", "name": "Camiseta Essential" }
      }
    ],
    "orders": null
  }
}
```

`orders` é `null` até a Fase 6 (pedidos ainda não existem).

### Produtos

`POST /admin/products`:

```json
{
  "name": "Camiseta Essential",
  "slug": "camiseta-essential",
  "description": "Camiseta de algodão...",
  "categoryId": "<uuid>",
  "priceCents": 12990,
  "compareAtPriceCents": 15990,
  "isNew": true
}
```

- `slug` é opcional: sem ele, é gerado do nome sem acentos.
- `compareAtPriceCents` (preço "de") precisa ser maior que `priceCents`.
- Criar já como `PUBLISHED` é recusado (`422 CANNOT_PUBLISH`): o produto ainda não tem variações.

`PATCH /admin/products/:id` aceita os mesmos campos (todos opcionais) e `status`
(`DRAFT`, `PUBLISHED`, `ARCHIVED`). Publicar exige ao menos uma variação ativa
(`422 CANNOT_PUBLISH`). O preço "de" é conferido contra o preço final, mesmo que só um deles seja
enviado (`422 INVALID_PRICE`).

### Variações e estoque

`POST /admin/products/:id/variants` com
`{ "color": "Preto", "colorHex": "#151515", "size": "M", "sku": "VS-CAM-PRE-M", "stock": 10 }`.
Tamanho e SKU são convertidos para maiúsculas. SKU repetido, ou a mesma cor e tamanho no mesmo
produto, respondem `409 CONFLICT`.

`PATCH /admin/variants/:id` com qualquer combinação de `isActive`, `sku`, `colorHex` e
`stockDelta`:

- `stockDelta` é um ajuste **relativo** (`5` entrou mercadoria, `-2` avaria). Se o resultado
  ficaria negativo, responde `409 INSUFFICIENT_STOCK` e nada muda.
- Desativar a última variação ativa de um produto publicado responde `422 LAST_ACTIVE_VARIANT`.

As duas rotas devolvem o produto completo atualizado.

### Fotos

1. `POST /admin/products/:id/images/upload-url` com `{ "contentType": "image/webp" }` (JPG, PNG
   ou WebP) devolve `{ "path": "products/<id>/<uuid>.webp", "uploadUrl": "..." }`.
2. O navegador envia o arquivo com `PUT` para `uploadUrl` (direto ao Supabase Storage).
3. `POST /admin/products/:id/images` com `{ "path": "...", "alt": "...", "color": "Preto" }`.
   A API confere o arquivo armazenado: inexistente → `400 IMAGE_NOT_FOUND`; tipo diferente de
   imagem, vazio ou acima de 5 MB → o arquivo é apagado e a resposta é `400 INVALID_IMAGE`;
   caminho de outro produto → `400 INVALID_PATH`.

Sem `SUPABASE_SECRET_KEY` no backend, as rotas de envio respondem
`503 STORAGE_NOT_CONFIGURED`.

### Categorias

`DELETE /admin/categories/:id` responde `409 CATEGORY_IN_USE` se a categoria tiver produtos.
