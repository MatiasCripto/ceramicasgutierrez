import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v18/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2',
      fontWeight: 700,
    },
  ],
})
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Brand Colors ───────────────────────────────────────────────
const DORADO = '#F5C200'
const DORADO_OSCURO = '#C49A00'
const PLATEADO = '#E8E8E8'
const NEGRO = '#1A1A1A'
const NEGRO_TEXTO = '#111111'

export interface BusinessInfo {
  business_name: string | null
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}

export interface DocItem {
  product_name: string
  category: string | null
  color: string | null
  finish: string | null
  image_url: string | null
  m2: number
  boxes: number
  price_per_m2: number
  total: number
}

export interface DocumentData {
  type: 'quote' | 'receipt'
  customer_name: string | null
  customer_phone: string | null
  items: DocItem[]
  subtotal: number
  total_price: number
  valid_until: string | null
  created_at: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: 'Inter',
    fontSize: 10,
    color: NEGRO_TEXTO,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    padding: 16,
    borderRadius: 4,
    backgroundColor: NEGRO,
    borderBottomWidth: 2,
    borderBottomColor: DORADO,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  logoFallback: {
    width: 60,
    height: 60,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoFallbackText: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  businessInfo: {
    gap: 2,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PLATEADO,
  },
  businessDetail: {
    fontSize: 8,
    color: PLATEADO,
    lineHeight: 1.4,
  },
  // ── Document Type Badge ──
  badgeRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeQuote: {
    backgroundColor: DORADO,
  },
  badgeReceipt: {
    backgroundColor: DORADO,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  badgeTextQuote: {
    color: NEGRO,
  },
  badgeTextReceipt: {
    color: NEGRO,
  },
  // ── Customer + Date ──
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    gap: 3,
  },
  infoLabel: {
    fontSize: 8,
    color: NEGRO_TEXTO,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 10,
    color: NEGRO_TEXTO,
  },
  // ── Table ──
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: NEGRO,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: DORADO,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: PLATEADO,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: DORADO,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#FFFFFF',
  },
  cellName: { flex: 2.5 },
  cellM2: { flex: 1, textAlign: 'right' },
  cellBoxes: { flex: 1, textAlign: 'right' },
  cellPrice: { flex: 1.5, textAlign: 'right' },
  cellTotal: { flex: 1.5, textAlign: 'right' },
  cellText: {
    fontSize: 9,
    color: NEGRO_TEXTO,
  },
  cellTextSmall: {
    fontSize: 7,
    color: NEGRO_TEXTO,
  },
  // ── Totals ──
  totalsSection: {
    marginLeft: 'auto',
    width: 220,
    gap: 4,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DORADO,
    borderRadius: 4,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 9,
    color: NEGRO_TEXTO,
  },
  totalValue: {
    fontSize: 9,
    color: NEGRO_TEXTO,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: DORADO,
    paddingTop: 4,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: NEGRO,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DORADO,
  },
  // ── Validity Notice ──
  validityBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DORADO,
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
  },
  validityText: {
    fontSize: 8,
    color: DORADO_OSCURO,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: DORADO,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: NEGRO,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  footerText: {
    fontSize: 7,
    color: PLATEADO,
  },
})

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
  } catch {
    return dateStr
  }
}

function getValidityText(validUntil: string | null): string {
  if (!validUntil) return ''
  const now = new Date()
  const end = new Date(validUntil)
  const diffMs = end.getTime() - now.getTime()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours <= 0) {
    return 'Este presupuesto ha vencido.'
  }

  // Si son exactamente 48hs (margen de 1h), usar texto fijo
  if (diffHours >= 47 && diffHours <= 49) {
    return 'Presupuesto válido por 48 horas. Los precios están sujetos a variación sin previo aviso por modificaciones en los costos de los proveedores.'
  }

  // Si son más de 48hs, mostrar en días
  if (diffDays >= 1) {
    return `Presupuesto válido por ${diffDays} día${diffDays !== 1 ? 's' : ''}. Los precios están sujetos a variación sin previo aviso por modificaciones en los costos de los proveedores.`
  }

  // Menos de 48hs pero no exactamente 48
  return `Presupuesto válido por ${diffHours} hora${diffHours !== 1 ? 's' : ''}. Los precios están sujetos a variación sin previo aviso por modificaciones en los costos de los proveedores.`
}

const COL_WIDTHS = { name: 2.5, m2: 1, boxes: 1, price: 1.5, total: 1.5 }

function formatPrice(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DocumentPDF({ business, doc }: { business: BusinessInfo; doc: DocumentData }) {
  const isQuote = doc.type === 'quote'
  const validityText = isQuote ? getValidityText(doc.valid_until) : ''

  return (
    <Document
      title={isQuote ? `Presupuesto - ${doc.customer_name ?? 'Cliente'}` : `Comprobante - ${doc.customer_name ?? 'Cliente'}`}
      author={business.business_name ?? 'Cerámicas Gutiérrez'}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {business.logo_url ? (
              <Image style={styles.logo} src={business.logo_url} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>CG</Text>
              </View>
            )}
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{business.business_name ?? 'Cerámicas Gutiérrez'}</Text>
              {business.tax_id && <Text style={styles.businessDetail}>CUIT: {business.tax_id}</Text>}
              {business.address && <Text style={styles.businessDetail}>{business.address}</Text>}
              {business.phone && <Text style={styles.businessDetail}>Tel: {business.phone}</Text>}
            </View>
          </View>
        </View>

        {/* Document Type Badge */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isQuote ? styles.badgeQuote : styles.badgeReceipt]}>
            <Text style={[styles.badgeText, isQuote ? styles.badgeTextQuote : styles.badgeTextReceipt]}>
              {isQuote ? 'PRESUPUESTO' : 'COMPROBANTE'}
            </Text>
          </View>
        </View>

        {/* Customer + Date */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Cliente</Text>
            <Text style={styles.infoValue}>{doc.customer_name ?? '—'}</Text>
            {doc.customer_phone && <Text style={styles.infoValue}>Tel: {doc.customer_phone}</Text>}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Fecha de emisión</Text>
            <Text style={styles.infoValue}>{formatDate(doc.created_at)}</Text>
            {isQuote && doc.valid_until && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 4 }]}>Válido hasta</Text>
                <Text style={styles.infoValue}>{formatDate(doc.valid_until)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: COL_WIDTHS.name }]}>Producto</Text>
            <Text style={[styles.tableHeaderCell, { flex: COL_WIDTHS.m2 }]}>m²</Text>
            <Text style={[styles.tableHeaderCell, { flex: COL_WIDTHS.boxes }]}>Cajas</Text>
            <Text style={[styles.tableHeaderCell, { flex: COL_WIDTHS.price }]}>$/m²</Text>
            <Text style={[styles.tableHeaderCell, { flex: COL_WIDTHS.total }]}>Subtotal</Text>
          </View>

          {doc.items.map((item, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
              <View style={{ flex: COL_WIDTHS.name }}>
                <Text style={styles.cellText}>{item.product_name}</Text>
                <Text style={styles.cellTextSmall}>
                  {[item.category, item.color, item.finish].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[styles.cellText, { flex: COL_WIDTHS.m2, textAlign: 'right' }]}>
                {item.m2.toFixed(2)}
              </Text>
              <Text style={[styles.cellText, { flex: COL_WIDTHS.boxes, textAlign: 'right' }]}>
                {item.boxes}
              </Text>
              <Text style={[styles.cellText, { flex: COL_WIDTHS.price, textAlign: 'right' }]}>
                {formatPrice(item.price_per_m2)}
              </Text>
              <Text style={[styles.cellText, { flex: COL_WIDTHS.total, textAlign: 'right' }]}>
                {formatPrice(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatPrice(doc.subtotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(doc.total_price)}</Text>
          </View>
        </View>

        {/* Validity Notice (solo presupuestos) */}
        {isQuote && validityText && (
          <View style={styles.validityBox}>
            <Text style={styles.validityText}>{validityText}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {business.phone && <Text style={styles.footerText}>Tel: {business.phone}</Text>}
          {business.email && <Text style={styles.footerText}>Email: {business.email}</Text>}
          {business.address && <Text style={styles.footerText}>{business.address}</Text>}
          <Text style={styles.footerText}>Cerámicas Gutiérrez</Text>
        </View>
      </Page>
    </Document>
  )
}
