-- Protege a tabela de controle do Prisma (_prisma_migrations).
--
-- Ela é criada pelo próprio Prisma antes das migrations, por isso ficou de
-- fora do RLS aplicado às outras tabelas. No Supabase, sem RLS, ela ficaria
-- acessível pela API automática (com a chave pública do site), permitindo
-- ler ou alterar o histórico de migrations.
--
-- Com RLS ativado e nenhuma política, a API automática não acessa nada. O
-- Prisma continua funcionando porque conecta como dono da tabela, e o dono
-- não é afetado pelo RLS.
--
-- A tabela só existe nos bancos reais. O `prisma migrate dev` também aplica as
-- migrations num banco temporário de conferência (shadow database), onde ela
-- não é criada; por isso o comando só roda quando a tabela existe.
DO $$
BEGIN
    IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
        ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;
