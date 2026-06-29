-- ============================================================
-- FASE 1: Tablas para el Agente de Ventas WhatsApp
-- Schema: single-tenant para Cerámicas Gutiérrez
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  address TEXT,
  total_orders INTEGER DEFAULT 0,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select_authenticated"
  ON customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "clientes_insert_authenticated"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "clientes_update_authenticated"
  ON customers FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- 2. CONVERSACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'bot', 'human')),
  context JSONB DEFAULT '{}'::jsonb,
  human_takeover BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversaciones_select_authenticated"
  ON conversations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "conversaciones_insert_authenticated"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "conversaciones_update_authenticated"
  ON conversations FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- 3. MENSAJES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  channel_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'document')),
  body TEXT,
  media_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensajes_select_authenticated"
  ON messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "mensajes_insert_authenticated"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "mensajes_update_authenticated"
  ON messages FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- 4. ÓRDENES / PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone TEXT,
  customer_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'preparing', 'completed', 'cancelled')),
  items JSONB DEFAULT '[]'::jsonb,
  total_m2 DECIMAL(10,2),
  total_boxes INTEGER,
  total_price DECIMAL(12,2),
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_method TEXT CHECK (shipping_method IN ('delivery', 'pickup')),
  shipping_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Consistencia entre status y payment_status
  -- Ej: una orden "paid" no puede tener payment_status "pending"
  CONSTRAINT orders_status_consistency CHECK (
    (status = 'pending'   AND payment_status IN ('pending', 'failed'))  OR
    (status = 'confirmed' AND payment_status IN ('pending', 'paid'))    OR
    (status = 'paid'      AND payment_status = 'paid')                  OR
    (status = 'preparing' AND payment_status = 'paid')                  OR
    (status = 'completed' AND payment_status = 'paid')                  OR
    (status = 'cancelled' AND payment_status IN ('pending', 'failed', 'refunded'))
  )
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedidos_select_authenticated"
  ON orders FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pedidos_insert_authenticated"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "pedidos_update_authenticated"
  ON orders FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- 5. EVENTOS DE ÓRDENES (auditoría)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select_authenticated"
  ON order_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "eventos_insert_authenticated"
  ON order_events FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 6. CUENTAS BANCARIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  alias TEXT,
  cvu TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuentas_select_authenticated"
  ON payment_accounts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cuentas_insert_authenticated"
  ON payment_accounts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "cuentas_update_authenticated"
  ON payment_accounts FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "cuentas_delete_authenticated"
  ON payment_accounts FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- 7. COMPROBANTES DE PAGO
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  extracted_amount DECIMAL(12,2),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comprobantes_select_authenticated"
  ON payment_proofs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "comprobantes_insert_authenticated"
  ON payment_proofs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "comprobantes_update_authenticated"
  ON payment_proofs FOR UPDATE TO authenticated
  USING (true);

-- ============================================================
-- 8. CONFIGURACIÓN (app_settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_all_authenticated"
  ON app_settings FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- ALTER para tablas ya creadas (si se ejecutó una versión previa)
-- ============================================================
ALTER TABLE payment_accounts ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS actor_type TEXT;
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS actor_id TEXT;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(customer_phone, status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order ON payment_proofs(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ============================================================
-- STORAGE BUCKET para comprobantes de pago
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Cuenta bancaria de ejemplo
-- ============================================================
INSERT INTO payment_accounts (bank_name, account_holder, alias, cvu)
VALUES (
  'Banco Provincia',
  'Cerámicas Gutiérrez',
  'ceramicas.gutierrez',
  '0000000000000000000001'
) ON CONFLICT DO NOTHING;
