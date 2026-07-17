-- ============================================================
-- MIGRACIÓN: Agregar 'sanitario' al CHECK constraint de products.category
-- ============================================================

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN (
    'piso', 'pared', 'bano', 'exterior',
    'pegamento', 'pastina',
    'griferia', 'vanitory', 'pulido',
    'simil_madera',
    'sanitario'
  ));
