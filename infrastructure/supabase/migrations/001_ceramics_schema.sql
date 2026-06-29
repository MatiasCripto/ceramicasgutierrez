-- ============================================================
-- Cerámicas Gutiérrez — Schema inicial
-- Single-tenant: tablas de negocio para cerámicos
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- AUTH: Perfiles (dueño/admin vinculado a auth.users)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  role            TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT CHECK (category IN ('piso', 'pared', 'bano', 'exterior', 'pegamento', 'pastina')),
  size              TEXT,                   -- '60x60', '30x30', etc. (null para pegamento/pastina)
  color             TEXT,
  finish            TEXT CHECK (finish IN ('mate', 'brillante', 'rectificado')),
  brand             TEXT,
  price_per_m2      NUMERIC(10,2),          -- para cerámicos
  price_per_unit    NUMERIC(10,2),          -- para pegamento/pastina (por bolsa/unidad)
  m2_per_box        NUMERIC(10,2),          -- conversión caja -> m2 (ej: 1.44)
  stock_m2          NUMERIC(10,2) DEFAULT 0, -- stock disponible en m2
  stock_units       NUMERIC(10,2) DEFAULT 0, -- stock en unidades (pegamento/pastina)
  images            TEXT[] DEFAULT '{}',
  attributes        TEXT[] DEFAULT '{}',    -- ej: ['antideslizante', 'alto_tránsito', 'interior', 'exterior']
  texture_url       TEXT,                   -- URL de textura 3D (para fase 2)
  featured_on_landing BOOLEAN DEFAULT false,
  featured_order    INT,
  active            BOOLEAN DEFAULT true,
  search_vector     TSVECTOR,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(id) WHERE active = true;
CREATE INDEX idx_products_featured ON products(id) WHERE featured_on_landing = true AND active = true;
CREATE INDEX idx_products_search ON products USING GIN(search_vector);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- ============================================================
-- COMBOS / BUNDLES
-- ============================================================
CREATE TABLE bundles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,             -- "Combo Porcelanato Gris + Pegamento"
  bundle_price    NUMERIC(10,2) NOT NULL,    -- precio conjunto
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bundle_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id       UUID REFERENCES bundles(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  quantity        NUMERIC(10,2) DEFAULT 1 NOT NULL,  -- ej: 1 caja cerámico, 1 bolsa pegamento
  UNIQUE(bundle_id, product_id)
);

CREATE INDEX idx_bundle_items_bundle ON bundle_items(bundle_id);

-- ============================================================
-- PROMOCIONES
-- ============================================================
CREATE TABLE promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id),
  bundle_id       UUID REFERENCES bundles(id),
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_price')),
  discount_value  NUMERIC(10,2) NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CHECK (
    (product_id IS NOT NULL AND bundle_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NOT NULL)
  )
);

CREATE INDEX idx_promotions_active ON promotions(product_id, bundle_id) WHERE active = true;

-- ============================================================
-- GALERÍA DE INSPIRACIÓN (sección 4 de la landing)
-- ============================================================
CREATE TABLE inspiration_gallery (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url       TEXT NOT NULL,
  room_type       TEXT CHECK (room_type IN ('bano', 'cocina', 'living', 'quincho', 'fachada', 'dormitorio')),
  product_id      UUID REFERENCES products(id),
  sort_order      INT DEFAULT 0,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inspiration_room ON inspiration_gallery(room_type);

-- ============================================================
-- ASSETS 3D (para catálogo rotable — fase 2)
-- ============================================================
CREATE TABLE product_3d_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID REFERENCES products(id) ON DELETE CASCADE,
  color_map_url     TEXT,
  normal_map_url    TEXT,
  roughness_map_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id)
);

-- ============================================================
-- VISTA: productos destacados para la landing
-- ============================================================
CREATE VIEW landing_featured_products AS
SELECT
  p.*,
  COALESCE(
    json_agg(
      json_build_object('id', p3a.id, 'color_map_url', p3a.color_map_url, 'normal_map_url', p3a.normal_map_url, 'roughness_map_url', p3a.roughness_map_url)
      ORDER BY p3a.id
    ) FILTER (WHERE p3a.id IS NOT NULL),
    '[]'::json
  ) AS textures_3d
FROM products p
LEFT JOIN product_3d_assets p3a ON p3a.product_id = p.id
WHERE p.featured_on_landing = true AND p.active = true
GROUP BY p.id
ORDER BY p.featured_order ASC NULLS LAST;

-- ============================================================
-- VISTA: promociones vigentes
-- ============================================================
CREATE VIEW active_promotions AS
SELECT *
FROM promotions
WHERE active = true
  AND starts_at <= now()
  AND ends_at >= now();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_3d_assets ENABLE ROW LEVEL SECURITY;

-- Políticas: el dueño autenticado puede todo; público solo lectura en productos activos
CREATE POLICY "Owner full access on profiles"
  ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Owner full access on products"
  ON products FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read active products"
  ON products FOR SELECT USING (active = true);

CREATE POLICY "Owner full access on bundles"
  ON bundles FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read active bundles"
  ON bundles FOR SELECT USING (active = true);

CREATE POLICY "Owner full access on bundle_items"
  ON bundle_items FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read bundle_items"
  ON bundle_items FOR SELECT USING (true);

CREATE POLICY "Owner full access on promotions"
  ON promotions FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read active promotions"
  ON promotions FOR SELECT USING (active = true);

CREATE POLICY "Owner full access on inspiration_gallery"
  ON inspiration_gallery FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read inspiration_gallery"
  ON inspiration_gallery FOR SELECT USING (active = true);

CREATE POLICY "Owner full access on product_3d_assets"
  ON product_3d_assets FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read product_3d_assets"
  ON product_3d_assets FOR SELECT USING (true);

-- ============================================================
-- Trigger: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Trigger: actualizar search_vector en INSERT/UPDATE de productos
-- ============================================================
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.color, '') || ' ' ||
    coalesce(NEW.brand, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(array_to_string(NEW.attributes, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- ============================================================
-- Realtime: habilitar replicación para productos
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- ============================================================
-- Bucket de Storage para imágenes de productos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer, solo autenticado puede subir
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT USING (bucket_id = 'product_images');

CREATE POLICY "Authenticated upload product images"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'product_images' AND auth.role() = 'authenticated'
  );
