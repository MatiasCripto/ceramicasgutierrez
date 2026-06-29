const { chromium } = require('playwright');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = 'https://www.ceramicas-lourdes.com.ar';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'catalogo-lourdes');
const CONCURRENCY = 3; // simultaneous product pages
const NAV_TIMEOUT = 30000;

const CATEGORY_PAGES = [
  { slug: 'pisos', url: `${BASE_URL}/pisos/` },
  { slug: 'paredes', url: `${BASE_URL}/paredes/` },
];

// Files whose names contain any of these are NOT product images
const NON_PRODUCT_PATTERNS = [
  'logo', 'ig.', 'fb.', 'iram', 'iqnet', 'icon', 'icos',
  'png-icon', 'lourdes-logo', 'cropped-lourdes',
];

// ─── Stats ──────────────────────────────────────────────────────────────────

const stats = {
  productsFound: 0,
  imagesDownloaded: 0,
  duplicatesSkipped: 0,
  errors: [],
  seenHashes: new Set(),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function isProductImage(src) {
  if (!src || src.startsWith('data:') || src.includes('base64')) return false;
  // Must be an actual image file
  if (!/\.(jpe?g|png|webp)$/i.test(src)) return false;
  // Must be from the uploads directory
  if (!src.includes('/wp-content/uploads/')) return false;
  // Exclude known non-product images
  const lower = src.toLowerCase();
  for (const pattern of NON_PRODUCT_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }
  return true;
}

// ─── parseProduct: extract name, category, size, images from rendered HTML ──

function parseProduct(html) {
  const $ = cheerio.load(html);

  // 1. Name — first h2 in the content area
  const name = $('h2').first().text().trim();

  // 2. Breadcrumb/metadata block — find element containing "Productos /"
  let breadText = '';
  $('body *').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt.startsWith('Productos /') && txt.length < 300) {
      breadText = txt;
      return false; // break
    }
  });

  // 3. Category + size from breadcrumb
  let category = 'otros';
  let size = '';
  const breadMatch = breadText.match(/Productos\s*\/\s*([^\d]+?)\s*\/\s*(\d+[xX×]\d+)/i);
  if (breadMatch) {
    const rawCat = breadMatch[1].trim().toLowerCase();
    if (rawCat.includes('paredes')) category = 'paredes';
    else if (rawCat.includes('pisos')) category = 'pisos';
    size = breadMatch[2].replace(/x/gi, '×');
  }

  // 4. Real product images
  const seen = new Set();
  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!isProductImage(src)) return;
    // Resolve to absolute
    const abs = src.startsWith('http') ? src : `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
    // Dedup by URL
    if (!seen.has(abs)) {
      seen.add(abs);
      images.push(abs);
    }
  });

  return { name, category, size, images };
}

// ─── Download one image ─────────────────────────────────────────────────────

async function downloadImage(url, filePath) {
  try {
    const resp = await axios({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: BASE_URL,
      },
    });

    // Dedup by content hash
    const hash = crypto.createHash('sha256').update(Buffer.from(resp.data)).digest('hex');
    if (stats.seenHashes.has(hash)) {
      stats.duplicatesSkipped++;
      return false;
    }
    stats.seenHashes.add(hash);

    // Extension from content-type
    const ct = resp.headers['content-type'] || '';
    let ext = '.jpg';
    if (ct.includes('png')) ext = '.png';
    else if (ct.includes('webp')) ext = '.webp';

    const finalPath = filePath + ext;
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    if (fs.existsSync(finalPath)) {
      stats.duplicatesSkipped++;
      return false;
    }

    fs.writeFileSync(finalPath, Buffer.from(resp.data));
    stats.imagesDownloaded++;
    return true;
  } catch (err) {
    stats.errors.push(`Download: ${path.basename(filePath)} — ${err.message}`);
    return false;
  }
}

// ─── Scrape one product page ────────────────────────────────────────────────

async function scrapeProduct(browser, productUrl) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  try {
    await page.goto(productUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
    // Extra wait + scroll for lazy images
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const html = await page.content();
    const product = parseProduct(html);

    if (!product.name) {
      stats.errors.push(`No name found at ${productUrl}`);
      return;
    }

    const slug = toSlug(product.name);
    const catDir = path.join(OUTPUT_DIR, product.category);
    fs.mkdirSync(catDir, { recursive: true });
    stats.productsFound++;

    for (let i = 0; i < product.images.length; i++) {
      const suffix = product.images.length > 1 ? `-${String(i + 1).padStart(2, '0')}` : '';
      const imgPath = path.join(catDir, slug + suffix);
      await downloadImage(product.images[i], imgPath);
    }

    console.log(`  ✓ ${product.name}  →  ${product.category}/  [${product.images.length} img]`);

  } catch (err) {
    stats.errors.push(`Page error: ${productUrl} — ${err.message}`);
  } finally {
    await ctx.close();
  }
}

// ─── Extract product links from a category listing page ─────────────────────

async function extractProductLinks(browser, catUrl) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await ctx.newPage();

  try {
    await page.goto(catUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    const links = new Set();
    $('a[href*="/ourcases/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const full = href.startsWith('http') ? href : `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
      if (full.includes('/ourcases/') && !full.endsWith('/ourcases/')) {
        links.add(full.replace(/#.*$/, '').replace(/\/$/, ''));
      }
    });

    console.log(`  → ${links.size} products found`);
    return [...links];
  } finally {
    await ctx.close();
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Cerámicas Lourdes — Scraper');
  console.log('═══════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ── Phase 1: collect product URLs ──
    console.log('📁 Collecting product links...\n');
    const allProducts = [];
    for (const cat of CATEGORY_PAGES) {
      console.log(`  ${cat.slug}:`);
      const urls = await extractProductLinks(browser, cat.url);
      urls.forEach(url => allProducts.push({ url, source: cat.slug }));
    }

    console.log(`\n📦 Total: ${allProducts.length} products\n`);

    // ── Phase 2: scrape each product ──
    console.log('🔍 Scraping product pages...\n');

    for (let i = 0; i < allProducts.length; i += CONCURRENCY) {
      const batch = allProducts.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(p => scrapeProduct(browser, p.url)));
      const done = Math.min(i + CONCURRENCY, allProducts.length);
      console.log(`  → Progress: ${done}/${allProducts.length}\n`);
    }

  } finally {
    await browser.close();
  }

  // ── Summary ──
  console.log('═══════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`  Productos encontrados:   ${stats.productsFound}`);
  console.log(`  Imágenes descargadas:    ${stats.imagesDownloaded}`);
  console.log(`  Duplicados omitidos:     ${stats.duplicatesSkipped}`);
  console.log(`  Errores:                 ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log(`\n  Últimos errores (hasta 10):`);
    stats.errors.slice(-10).forEach((e, i) => console.log(`    ${i + 1}. ${e}`));
  }

  // Show output structure
  if (fs.existsSync(OUTPUT_DIR)) {
    const cats = fs.readdirSync(OUTPUT_DIR).filter(d =>
      fs.statSync(path.join(OUTPUT_DIR, d)).isDirectory()
    );
    console.log(`\n  Output: ${OUTPUT_DIR}`);
    console.log(`  Categorías: ${cats.join(', ') || '(ninguna)'}`);
    for (const c of cats) {
      const count = fs.readdirSync(path.join(OUTPUT_DIR, c)).length;
      console.log(`    ${c}/ → ${count} archivos`);
    }
  }

  console.log('\n✅ Listo.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
