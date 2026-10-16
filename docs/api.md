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
