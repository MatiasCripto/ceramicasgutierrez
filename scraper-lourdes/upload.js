const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// ─── Load env manually ─────────────────────────────────────────────────────

function loadEnv(p) {
  const t = fs.readFileSync(p, 'utf-8');
  const o = {};
  for (const l of t.split('\n')) {
    const s = l.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i < 0) continue;
    o[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  return o;
}
const _e = loadEnv(path.resolve(__dirname, '..', '.env.local'));
const SUPABASE_URL = _e.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = _e.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const INPUT_DIR = path.resolve(__dirname, '..', 'catalogo-lourdes');
const BUCKET = 'product_images';

// ─── Stats ───────────────────────────────────────────────────────────────────

const stats = {
  productsInserted: 0,
  productsSkipped: 0,
  imagesUploaded: 0,
  errors: [],
};

// Known finish keywords (from Spanish)
const FINISH_MAP = {
  brillante: 'brillante',
  satinado: 'mate',
  texturizado: 'mate',
  mate: 'mate',
  rectificado: 'rectificado',
};

// Known color words to detect at end of name
const COLOR_WORDS = new Set([
  'beige', 'gris', 'marron', 'blanco', 'negro', 'azul', 'rojo', 'verde',
  'arena', 'terra', 'claro', 'oscuro', 'marfil', 'cuero', 'albino',
  'cerezo', 'vison', 'grises', 'blancos', 'negros', 'azules',
  'natural', 'naturale', 'vintage', 'fresno', 'brick', 'petroleo',
]);

// ─── Reverse slug to original name ───────────────────────────────────────────

function slugToName(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Detect finish and color from name ──────────────────────────────────────

function detectMeta(name) {
  const lower = name.toLowerCase();
  let finish = null;
  let color = null;

  // Detect finish
  for (const [keyword, mapped] of Object.entries(FINISH_MAP)) {
    if (lower.includes(keyword)) {
      finish = mapped;
      break;
    }
  }

  // Detect color — last word if it's a known color
  const words = lower.split(' ');
  const lastWord = words[words.length - 1];
  if (COLOR_WORDS.has(lastWord)) {
    color = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
  }

  return { finish, color };
}

// ─── Category mapping ────────────────────────────────────────────────────────

function mapCategory(dirName) {
  const map = { pisos: 'piso', paredes: 'pared' };
  return map[dirName] || dirName;
}

// ─── Upload one image to Supabase Storage ────────────────────────────────────

async function uploadImage(filePath, storagePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: `image/${path.extname(filePath).slice(1)}`,
        upsert: false,
      });

    if (error) {
      // 409 = already exists
      if (error.statusCode === 409 || error.message?.includes('already exists')) {
        return 'exists'; // not an error, just skip
      }
      throw error;
    }

    stats.imagesUploaded++;
    return 'uploaded';
  } catch (err) {
    stats.errors.push(`Upload image ${path.basename(filePath)}: ${err.message}`);
    return 'error';
  }
}

// ─── Build public URL for an uploaded image ──────────────────────────────────

function getPublicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── Insert one product ──────────────────────────────────────────────────────

async function insertProduct(product) {
  // Check if product with same name already exists
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('name', product.name)
    .eq('category', product.category)
    .maybeSingle();

  if (existing) {
    stats.productsSkipped++;
    console.log(`  ⏭ ${product.name} (${product.category}) — ya existe`);
    return;
  }

  const { error } = await supabase.from('products').insert({
    name: product.name,
    description: product.description,
    category: product.category,
    size: product.size,
    color: product.color,
    finish: product.finish,
    brand: 'Cerámicas Lourdes',
    images: product.images,
    attributes: product.attributes,
    active: true,
  });

  if (error) {
    stats.errors.push(`Insert ${product.name}: ${error.message}`);
    console.log(`  ✗ ${product.name} — ERROR: ${error.message}`);
  } else {
    stats.productsInserted++;
    console.log(`  ✓ ${product.name} → ${product.category} [${product.images.length} img]`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Upload — Cerámicas Lourdes → Supabase');
  console.log('═══════════════════════════════════════════════════\n');

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Directory not found: ${INPUT_DIR}`);
    console.error('   Run scraper.js first to download images.\n');
    process.exit(1);
  }

  // Scan category directories
  const categories = fs.readdirSync(INPUT_DIR).filter(d =>
    fs.statSync(path.join(INPUT_DIR, d)).isDirectory()
  );

  console.log(`📁 Categories found: ${categories.join(', ')}\n`);

  for (const catDir of categories) {
    const catPath = path.join(INPUT_DIR, catDir);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));

    // Group files by product slug
    const products = new Map();

    for (const file of files) {
      // Extract slug: remove -01, -02, .jpg, .png, .webp
      let slug = file.replace(/\.(jpg|png|webp)$/i, '');
      slug = slug.replace(/-\d{2}$/, ''); // remove -01, -02, etc.

      if (!products.has(slug)) {
        products.set(slug, []);
      }
      products.get(slug).push(file);
    }

    console.log(`📦 ${catDir}/ — ${products.size} products\n`);

    const ourCategory = mapCategory(catDir);

    for (const [slug, imageFiles] of products) {
      const name = slugToName(slug);
      const { finish, color } = detectMeta(name);

      // Upload images to Supabase Storage
      const uploadedUrls = [];
      for (const imgFile of imageFiles.sort()) {
        const localPath = path.join(catPath, imgFile);
        const storagePath = `${catDir}/${imgFile}`;

        const result = await uploadImage(localPath, storagePath);
        if (result !== 'error') {
          uploadedUrls.push(getPublicUrl(storagePath));
        }
      }

      // Insert product record
      const product = {
        name,
        description: `${name} — Cerámica de Cerámicas Lourdes. Categoría: ${catDir}. Acabado: ${finish || '—'}.${color ? ` Color: ${color}.` : ''}`,
        category: ourCategory,
        size: null, // will be filled by user
        color,
        finish,
        brand: 'Cerámicas Lourdes',
        images: uploadedUrls,
        attributes: ourCategory === 'piso'
          ? ['piso', 'interior']
          : ['pared', 'interior'],
        active: true,
      };

      await insertProduct(product);
    }

    console.log('');
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`  Productos insertados:  ${stats.productsInserted}`);
  console.log(`  Ya existían:           ${stats.productsSkipped}`);
  console.log(`  Imágenes subidas:      ${stats.imagesUploaded}`);
  console.log(`  Errores:               ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log(`\n  Últimos errores (hasta 10):`);
    stats.errors.slice(-10).forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  console.log('\n✅ Upload finalizado.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
