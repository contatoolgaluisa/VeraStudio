-- Pedidos (Fase 6B): pedido, itens congelados no momento da compra e
-- histórico de mudanças de situação.

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customer_email" TEXT NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "item_count" INTEGER NOT NULL,
    "subtotal_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL,
    "shipping_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "reservation_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "image_url" TEXT,
    "unit_price_cents" INTEGER NOT NULL,
    "compare_at_price_cents" INTEGER,
    "quantity" INTEGER NOT NULL,
    "line_total_cents" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus",
    "to_status" "OrderStatus" NOT NULL,
    "changed_by_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_reservation_expires_at_idx" ON "orders"("status", "reservation_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===================================================================
-- Regras adicionais (escritas manualmente)
-- ===================================================================

-- Números de pedido começam em 1001 (mais natural para o atendimento que "pedido 1").
ALTER SEQUENCE "orders_number_seq" RESTART WITH 1001;

-- Valores coerentes: nada negativo, e o total é exatamente
-- subtotal - desconto + frete. Um erro de cálculo no código falha aqui.
ALTER TABLE "orders"
    ADD CONSTRAINT "orders_amounts_check" CHECK (
        "item_count" > 0
        AND "subtotal_cents" >= 0
        AND "discount_cents" >= 0
        AND "discount_cents" <= "subtotal_cents"
        AND "shipping_cents" >= 0
        AND "total_cents" = "subtotal_cents" - "discount_cents" + "shipping_cents"
    );

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0),
    ADD CONSTRAINT "order_items_price_check" CHECK ("unit_price_cents" > 0),
    ADD CONSTRAINT "order_items_compare_at_check"
        CHECK ("compare_at_price_cents" IS NULL OR "compare_at_price_cents" > "unit_price_cents"),
    ADD CONSTRAINT "order_items_line_total_check"
        CHECK ("line_total_cents" = "unit_price_cents" * "quantity");

ALTER TABLE "order_status_history"
    ADD CONSTRAINT "order_status_history_note_length_check"
        CHECK ("note" IS NULL OR char_length("note") <= 500);

-- Bloqueia o acesso pela API automática do Supabase (ver migration inicial).
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_status_history" ENABLE ROW LEVEL SECURITY;
