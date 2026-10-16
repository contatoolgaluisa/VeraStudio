# Roteiro de demonstração

Lista para apresentar a VÉRA Studio publicada, de forma honesta: é um **projeto de portfólio**,
com produtos, textos e fotos de demonstração. Não há clientes, vendas ou avaliações reais.

## Antes da apresentação

- [ ] Abrir a loja **5 minutos antes** (a API gratuita do Render pode estar "dormindo" e leva
      cerca de 1 minuto para acordar).
- [ ] Se o projeto ficou mais de 7 dias sem uso: conferir no Supabase se está pausado e clicar em
      **Resume project**.
- [ ] Entrar com a conta de administrador numa aba e deixar outra aba sem login, para mostrar a
      loja como visitante.
- [ ] Testar o envio de uma foto no painel (confirma Storage e permissões).

## O que já pode ser demonstrado

1. **Home**: banner, coleções e novidades.
2. **Catálogo**: busca por nome, filtros de categoria, preço, tamanho e cor, ordenação e
   paginação. Os filtros ficam no endereço da página (dá para copiar e compartilhar).
3. **Produto**: fotos, seleção de cor e tamanho. Combinações esgotadas ou inexistentes não podem
   ser escolhidas.
4. **Celular**: menu adaptado e filtros em painel lateral.
5. **Cadastro e login**, recuperação de senha e "Minha conta".
6. **Segurança**: uma conta de cliente que tenta abrir `/admin` vê "Acesso restrito", e a API
   recusa as operações mesmo que alguém chame direto.
7. **Painel administrativo**:
   - visão geral com números calculados do banco e estoque baixo;
   - criar um produto (nasce como rascunho), cadastrar variações e publicar;
   - ajustar o estoque (+5 / -2) e ver a mudança na loja;
   - enviar uma foto e reordenar as fotos;
   - gerenciar categorias;
   - pedidos: lista com busca, detalhe, histórico de quem mudou o quê e mudança de situação
     (separação, envio, entrega). "Pago" não existe como botão: só o pagamento confirma.
8. **Carrinho e pedido**: adicionar peças, ver o frete e o total recalculados pelo servidor,
   finalizar (exige login), ver o pedido "aguardando pagamento" com as peças reservadas por 30
   minutos e cancelar em "Meus pedidos" (o estoque volta na hora).

## Em desenvolvimento

Diga isso abertamente se perguntarem:

- **Pagamento com Stripe em modo de teste** (Fase 7): hoje o pedido fica aguardando pagamento e
  expira em 30 minutos.
- **Revisão final de qualidade e segurança** (Fase 8).

## Se for dar acesso ao painel a outra pessoa

Não compartilhe a sua conta. Crie uma conta separada para a demonstração (por exemplo, com um
apelido do seu e-mail, como `seu.email+demo@gmail.com`), torne-a administradora com o comando de
`docs/deploy.md` (passo 7) e remova o acesso depois com `--revoke`. Se algo for alterado, rode o
seed de novo para restaurar o catálogo de demonstração.
