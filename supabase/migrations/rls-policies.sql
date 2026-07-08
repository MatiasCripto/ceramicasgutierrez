-- ============================================================
-- RLS Policies — Cerámicas Gutiérrez (fixed)
-- ============================================================
-- Single-tenant: el dueño y empleados son los únicos usuarios
-- autenticados del dashboard. El público (anon) solo necesita
-- ver productos activos en la landing.
--
-- IMPORTANTE: Este script PRIMERO elimina TODAS las políticas
-- existentes (incluyendo las auto-generadas por Supabase que
-- referencian user_id), luego crea las correctas.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- PASO 1: Eliminar TODAS las políticas existentes
-- ══════════════════════════════════════════════════════════════
-- Esto remueve cualquier política auto-generada por el Dashboard
-- de Supabase (ej: "Enable access for authenticated users only"
-- con USING (auth.uid() = user_id)) que causaría el error
-- "column user_id does not exist".

DO $$ DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 2: Habilitar RLS en todas las tablas
-- ══════════════════════════════════════════════════════════════
-- Usamos un DO block para evitar errores si alguna tabla
-- no existe (notifications fue creada por el dashboard).

DO $$ DECLARE
  tables text[] := ARRAY[
    'orders', 'customers', 'products', 'conversations', 'messages',
    'order_events', 'payment_accounts', 'payment_proofs', 'app_settings',
    'business_info', 'documents', 'bundles', 'bundle_items',
    'promotions', 'profiles', 'inspiration_gallery', 'product_3d_assets',
    'active_promotions', 'notifications'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not enable RLS on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 3: Políticas para usuarios autenticados (dashboard)
-- ══════════════════════════════════════════════════════════════
-- El usuario logueado (único tenant) tiene CRUD completo en
-- todas las tablas del negocio.

DO $$ DECLARE
  t text;
  tables text[] := ARRAY[
    'orders', 'customers', 'products', 'conversations', 'messages',
    'order_events', 'payment_accounts', 'payment_proofs', 'app_settings',
    'business_info', 'documents', 'bundles', 'bundle_items',
    'promotions', 'profiles', 'inspiration_gallery', 'product_3d_assets',
    'notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "authenticated_all" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
        t
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create policy on %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 4: Políticas para público anónimo (landing page)
-- ══════════════════════════════════════════════════════════════
-- Solo lectura de productos activos para mostrar el catálogo.

DO $$ DECLARE
  t text;
BEGIN
  -- Products
  BEGIN
    EXECUTE 'CREATE POLICY "public_read_active" ON products FOR SELECT TO anon USING (active = true)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public_read on products: %', SQLERRM;
  END;

  -- Bundles
  BEGIN
    EXECUTE 'CREATE POLICY "public_read_active" ON bundles FOR SELECT TO anon USING (active = true OR active IS NULL)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public_read on bundles: %', SQLERRM;
  END;

  -- Promotions
  BEGIN
    EXECUTE 'CREATE POLICY "public_read_active" ON promotions FOR SELECT TO anon USING (active = true OR active IS NULL)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public_read on promotions: %', SQLERRM;
  END;

  -- Inspiration gallery (público puede ver activas)
  BEGIN
    EXECUTE 'CREATE POLICY "public_read_active" ON inspiration_gallery FOR SELECT TO anon USING (active = true)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public_read on inspiration_gallery: %', SQLERRM;
  END;

  -- Active promotions view (público puede leer)
  BEGIN
    EXECUTE 'CREATE POLICY "public_read" ON active_promotions FOR SELECT TO anon USING (true)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public_read on active_promotions: %', SQLERRM;
  END;
END $$;

-- ══════════════════════════════════════════════════════════════
-- PASO 5: Storage — imágenes de productos y comprobantes
-- ══════════════════════════════════════════════════════════════
-- Autenticados: CRUD completo en product_images y payment-proofs
-- Anónimo: solo lectura

DO $$ BEGIN
  -- product_images bucket
  EXECUTE 'CREATE POLICY "authenticated_all" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''product_images'') WITH CHECK (bucket_id = ''product_images'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (authenticated_all): %', SQLERRM;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "public_read" ON storage.objects FOR SELECT TO anon USING (bucket_id = ''product_images'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (public_read): %', SQLERRM;
END $$;

DO $$ BEGIN
  -- payment-proofs bucket
  EXECUTE 'CREATE POLICY "authenticated_payment" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''payment-proofs'') WITH CHECK (bucket_id = ''payment-proofs'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (payment proofs): %', SQLERRM;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "public_payment" ON storage.objects FOR SELECT TO anon USING (bucket_id = ''payment-proofs'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (public payment): %', SQLERRM;
END $$;

DO $$ BEGIN
  -- business-assets bucket
  EXECUTE 'CREATE POLICY "authenticated_business" ON storage.objects FOR ALL TO authenticated USING (bucket_id = ''business-assets'') WITH CHECK (bucket_id = ''business-assets'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (business assets): %', SQLERRM;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "public_business" ON storage.objects FOR SELECT TO anon USING (bucket_id = ''business-assets'')';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create storage policy (public business): %', SQLERRM;
END $$;

-- ══════════════════════════════════════════════════════════════
-- HECHO
-- ══════════════════════════════════════════════════════════════
-- Verificar políticas creadas:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- ORDER BY schemaname, tablename;
