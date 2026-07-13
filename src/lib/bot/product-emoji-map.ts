// ── Product Emoji Mapping — Cerámicas Gutiérrez ─────────────
// Categorías de cerámicos + colores + acabados

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  piso: '🟫',
  pared: '🧱',
  bano: '🚿',
  exterior: '🌿',
  pegamento: '🧴',
  pastina: '🪣',
  porcelanato: '✨',
  ceramico: '🔲',
  cerámico: '🔲',
  mayolica: '💠',
  calcárea: '🪨',
  calcarea: '🪨',
  granito: '🪨',
  mármol: '🗿',
  marmol: '🗿',
  madera: '🪵',
  rústico: '🏛️',
  rustico: '🏛️',
  combo: '📦',
  pack: '📦',
  kit: '📦',
  muestra: '🎴',
  promo: '🏷️',
  oferta: '🏷️',
  liquidación: '🏷️',
  liquidacion: '🏷️',
  vanitory: '🚿',
  pulido: '✨',
  rectificado: '🔲',
  simil_madera: '🪵',
}

const FINISH_EMOJI_MAP: Record<string, string> = {
  mate: '〰️',
  brillante: '✨',
  rectificado: '🔲',
  satinado: '🌫️',
  laqueado: '💎',
}

const COLOR_EMOJI_MAP: Record<string, string> = {
  blanco: '⬜',
  negro: '⬛',
  gris: '◻️',
  beige: '🟨',
  marfil: '🟨',
  crudo: '🟨',
  arena: '🟨',
  marrón: '🟤',
  marron: '🟤',
  café: '🟤',
  cafe: '🟤',
  terracota: '🟧',
  naranja: '🟠',
  rojo: '🔴',
  bordó: '🔴',
  bordo: '🔴',
  azul: '🔵',
  celeste: '🔵',
  verde: '🟢',
  oliva: '🟢',
  mostaza: '🟡',
  amarillo: '🟡',
  rosado: '🩷',
  rosa: '🩷',
  violeta: '🟣',
  lila: '🟣',
  nude: '🟫',
  madera: '🟫',
  piedra: '🪨',
  cemento: '🏗️',
  metal: '⚙️',
  dorado: '🌟',
  plateado: '⭐',
  cobre: '🪙',
}

const FALLBACK_EMOJI = '🔲'

const CATEGORY_KEYWORDS = Object.keys(CATEGORY_EMOJI_MAP)
const FINISH_KEYWORDS = Object.keys(FINISH_EMOJI_MAP)
const COLOR_KEYWORDS = Object.keys(COLOR_EMOJI_MAP)

/** Obtener emoji según la categoría del producto. */
export function getProductEmoji(productName: string, category?: string): string {
  const lower = productName.toLowerCase()
  // Primero buscar por categoría en el nombre del producto
  for (const keyword of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) return CATEGORY_EMOJI_MAP[keyword]
  }
  // Si se pasó una categoría explícita, usarla
  if (category && CATEGORY_EMOJI_MAP[category]) {
    return CATEGORY_EMOJI_MAP[category]
  }
  return FALLBACK_EMOJI
}

/** Obtener emoji según el color. */
export function getColorEmoji(color?: string): string {
  if (!color) return ''
  const lower = color.toLowerCase()
  for (const keyword of COLOR_KEYWORDS) {
    if (lower.includes(keyword)) return COLOR_EMOJI_MAP[keyword]
  }
  return ''
}

/** Obtener emoji según el acabado. */
export function getFinishEmoji(finish?: string): string {
  if (!finish) return ''
  const lower = finish.toLowerCase()
  for (const keyword of FINISH_KEYWORDS) {
    if (lower.includes(keyword)) return FINISH_EMOJI_MAP[keyword]
  }
  return ''
}

/** Build product presentation line: "🧱 Porcelanato Gris 60x60 (mate) x1" */
export function buildProductPresentation(
  productName: string,
  quantity?: number,
  attribute_values?: Record<string, string>,
): string {
  const emoji = getProductEmoji(productName)
  const parts = [emoji, productName]
  const label = attribute_values ? Object.values(attribute_values).filter(Boolean).join(' / ') : ''
  if (label) parts.push(`(${label})`)
  if (quantity && quantity > 0) parts.push(`x${quantity}`)
  return parts.join(' ')
}
