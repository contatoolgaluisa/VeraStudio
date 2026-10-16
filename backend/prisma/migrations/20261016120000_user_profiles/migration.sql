-- Perfis de usuário (Fase 5A). A identidade fica no Supabase Auth; aqui
-- ficam os dados da loja, incluindo o papel (CUSTOMER ou ADMIN).

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");


-- ===================================================================
-- Regras adicionais (escritas manualmente)
-- ===================================================================

ALTER TABLE "user_profiles"
    ADD CONSTRAINT "user_profiles_name_length_check"
        CHECK ("name" IS NULL OR char_length("name") BETWEEN 1 AND 80);

-- Bloqueia o acesso pela API automática do Supabase (ver migration inicial).
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
