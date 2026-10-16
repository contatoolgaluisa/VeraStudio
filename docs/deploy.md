# Publicação (Vercel + Render + Supabase)

Este guia coloca a loja no ar para demonstração:

| Parte    | Onde fica | Endereço (exemplo)                         |
| -------- | --------- | ------------------------------------------ |
| Loja     | Vercel    | `https://vera-studio.vercel.app`           |
| API      | Render    | `https://vera-studio-api.onrender.com`     |
| Banco, login e fotos | Supabase (o mesmo projeto já usado no login) | — |

Tudo usa planos gratuitos. Depois de configurado, cada alteração que entra na branch `main` do
GitHub é publicada sozinha, na Vercel e no Render.

> **Segredos:** senhas e chaves são digitadas só nos painéis da Vercel, do Render e do Supabase,
> ou no seu terminal. Nunca em arquivos do projeto, no GitHub ou em mensagens.

## Antes de começar

- Contas: GitHub (já existe), Supabase (já existe), [Render](https://render.com) e
  [Vercel](https://vercel.com). Nas duas últimas, entre com a conta do GitHub.
- O código a publicar precisa estar na branch `main` (PRs aprovados e mesclados).
- A branch padrão do repositório no GitHub precisa ser a `main` (**Settings > General > Default
  branch**). O Render e a Vercel começam pela branch padrão: se ela for outra, publicam uma versão
  antiga. Confira também nos dois serviços que a branch configurada é a `main` (Render: campo
  **Branch** do serviço; Vercel: **Settings > Environments > Production > Branch Tracking**).
- A senha do banco do Supabase (definida ao criar o projeto). Se não lembrar, gere outra em
  **Project Settings > Database > Reset database password**.

## 1. Pegar os endereços do banco no Supabase

No painel do projeto, clique em **Connect** (no topo). Copie dois endereços:

- **Transaction pooler** (porta **6543**): será o `DATABASE_URL`, usado pela API.
- **Session pooler** (porta **5432**): será o `DIRECT_URL`, usado só pelas migrations.

Troque `[YOUR-PASSWORD]` pela senha do banco nos dois. Se a senha tiver caracteres especiais,
escreva-os codificados: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`.

Use os endereços de **pooler**, não a "Direct connection": a conexão direta do Supabase só
funciona por IPv6, que o Render e muitas redes domésticas não têm.

## 2. Criar as tabelas e os produtos de demonstração

No PowerShell, na raiz do projeto. As variáveis abaixo valem só para esta janela do terminal e
têm prioridade sobre o `backend/.env` (que continua apontando para o banco local):

```powershell
$env:DIRECT_URL = "cole aqui o Session pooler (porta 5432)"
$env:DATABASE_URL = "cole aqui o Transaction pooler (porta 6543)"
npm run db:deploy -w backend
npm run db:seed -w backend
```

O resultado esperado é a lista de migrations aplicadas e a mensagem do seed com 24 produtos.
**Feche essa janela do terminal ao terminar**, para não rodar por engano um comando local no
banco publicado.

## 3. Publicar a API no Render

1. No Render: **New > Blueprint**, escolha o repositório `VeraStudio`. O Render lê o arquivo
   `render.yaml` da raiz e mostra o serviço `vera-studio-api`.
2. Preencha as variáveis pedidas:

   | Variável              | Valor                                                     |
   | --------------------- | --------------------------------------------------------- |
   | `DATABASE_URL`        | Transaction pooler (porta 6543), com a senha              |
   | `DIRECT_URL`          | Session pooler (porta 5432), com a senha                  |
   | `SUPABASE_URL`        | Project URL (`https://<projeto>.supabase.co`)             |
   | `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`), a mesma do `backend/.env`   |
   | `CORS_ORIGINS`        | Por enquanto `http://localhost:5173` (será trocada no passo 5) |

3. Clique em **Apply**. O primeiro build leva alguns minutos.
4. Teste: abra `https://<seu-serviço>.onrender.com/health/ready`. Deve responder com
   `"status":"ok"`. Anote esse endereço, sem barra no final.

## 4. Publicar a loja na Vercel

1. Na Vercel: **Add New > Project**, importe o repositório `VeraStudio`.
2. Em **Root Directory**, escolha `frontend`. O framework (Vite) é detectado sozinho.
3. Em **Environment Variables**, adicione:

   | Variável                        | Valor                                               |
   | ------------------------------- | --------------------------------------------------- |
   | `VITE_API_URL`                  | Endereço do Render do passo 3 (sem barra no final)  |
   | `VITE_SUPABASE_URL`             | Project URL do Supabase                             |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`)              |

   Nunca coloque a secret key aqui: tudo que começa com `VITE_` vai para o navegador.
4. Clique em **Deploy** e anote o endereço final (ex.: `https://vera-studio.vercel.app`).

## 5. Liberar a loja na API (CORS)

No Render, em **Environment**, troque `CORS_ORIGINS` pelo endereço da Vercel, sem barra no final.
Para continuar desenvolvendo localmente com a mesma API, use os dois, separados por vírgula:

```
https://vera-studio.vercel.app,http://localhost:5173
```

Salve. O Render reinicia o serviço sozinho.

## 6. Ajustar o login no Supabase

Em **Authentication > URL Configuration**:

- **Site URL:** o endereço da Vercel. É para onde apontam os links dos e-mails de confirmação e
  de recuperação de senha.
- **Redirect URLs:** adicione `https://vera-studio.vercel.app/**` e `http://localhost:5173/**`.

## 7. Criar o administrador no banco publicado

O banco publicado é outro banco, então o seu acesso de administrador precisa ser criado de novo:

1. Crie a conta na loja publicada e entre uma vez.
2. Num terminal novo, na raiz do projeto:

   ```powershell
   $env:DATABASE_URL = "cole aqui o Transaction pooler (porta 6543)"
   npm run make-admin -w backend -- seu-email@exemplo.com
   ```

3. Feche o terminal. Saia e entre de novo na loja: o painel aparece em "Minha conta".

## 8. Conferir

Siga a lista de [docs/demo.md](demo.md). O envio de fotos usa o bucket `product-images` do mesmo
projeto Supabase, já criado.

## Planos gratuitos: o que esperar

- **Render:** a API desliga após 15 minutos sem acesso e leva cerca de 1 minuto para voltar. A
  loja mostra um aviso quando o carregamento demora. Antes de uma apresentação, abra o site
  alguns minutos antes.
- **Supabase:** o projeto é pausado após 7 dias sem uso. Para reativar: painel do Supabase >
  projeto > **Resume project**. Os dados voltam intactos.

## Diagnóstico

| Sintoma | Causa provável e solução |
| ------- | ------------------------ |
| Build do Render falha em `db:deploy` com `P1001` (não alcança o banco) | `DIRECT_URL` com a "Direct connection" (IPv6). Use o **Session pooler**. |
| `password authentication failed` | Senha errada ou com caractere especial sem codificar (veja o passo 1). |
| `self-signed certificate in certificate chain` | Remova `?sslmode=...` do final do endereço do banco. |
| Loja abre, mas mostra "Sem conexão" | `VITE_API_URL` errado (refaça o deploy na Vercel depois de corrigir) ou `CORS_ORIGINS` sem o endereço exato da Vercel. No navegador, a aba Console mostra "CORS" nesse caso. |
| Loja fica carregando por quase 1 minuto | API do Render acordando (plano gratuito). Normal na primeira visita. |
| Link do e-mail de confirmação abre `localhost` | **Site URL** do Supabase ainda é `localhost` (passo 6). |
| Envio de foto responde "pendente de configuração" | `SUPABASE_SECRET_KEY` não definida no Render. |
| Site publicado mostra uma versão antiga ("Em construção") ou o Render diz `render.yaml not found` | Serviço apontando para outra branch. Veja "Antes de começar": branch padrão do GitHub e branch configurada em cada serviço devem ser a `main`. Depois, publique de novo. |
| Build da Vercel falha ao instalar dependências | Em **Settings > Build and Deployment**, defina Install Command como `cd .. && npm ci`. |
| Tudo parou de responder após dias sem uso | Projeto do Supabase pausado: **Resume project**. |

## Segurança da publicação

- As tabelas têm Row Level Security ativado sem políticas: a publishable key (pública) não lê nem
  altera nada no banco diretamente. Só a API, com a senha do banco, acessa os dados.
- A API confere login e papel em cada rota do painel. Contas criadas pela loja são sempre de
  cliente; administrador só pelo comando do passo 7.
- Previews da Vercel (endereços diferentes para cada PR) não estão em `CORS_ORIGINS`, então não
  conseguem chamar a API. Só o endereço principal funciona.
