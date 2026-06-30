-- ============================================================
-- Cerámicas Gutiérrez — Documentos PDF y datos de facturación
-- ============================================================

-- ============================================================
-- BUSINESS INFO (una sola fila, como app_settings)
-- ============================================================
CREATE TABLE business_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_info_all_authenticated"
  ON business_info FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- DOCUMENTOS (presupuestos y comprobantes)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('quote', 'receipt')),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(12,2),
  total_price DECIMAL(12,2),
  valid_until TIMESTAMPTZ,
  pdf_url TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_all_authenticated"
  ON documents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_customer_id ON documents(customer_id);

-- ============================================================
-- STORAGE BUCKET: business-assets (logos + PDFs)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir subida a authenticated users
CREATE POLICY "business_assets_upload_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-assets');

-- Permitir lectura pública
CREATE POLICY "business_assets_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'business-assets');
