-- ============================================================
-- MIGRACIÓN: Agregar 'simil_madera' al CHECK constraint de products.category
--
-- NOTA: Las categorías 'griferia', 'vanitory', 'pulido' ya fueron
-- agregadas manualmente en producción. Esta migración también las
-- incluye por completitud.
-- ============================================================

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN (
    'piso', 'pared', 'bano', 'exterior',
    'pegamento', 'pastina',
    'griferia', 'vanitory', 'pulido',
    'simil_madera'
  ));
