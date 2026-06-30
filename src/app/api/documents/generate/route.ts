import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateDocumentPDF } from '@/lib/pdf/generateDocumentPDF'
import type { BusinessInfo, DocumentData } from '@/lib/pdf/DocumentPDF'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, customer_name, customer_phone, customer_id, items, valid_until, order_id } = body

    // ── Validaciones ──
    if (!type || !['quote', 'receipt'].includes(type)) {
      return NextResponse.json({ error: 'Tipo de documento inválido. Debe ser "quote" o "receipt".' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debe incluir al menos un producto.' }, { status: 400 })
    }

    const sb = createServiceClient()

    // ── Leer business_info ──
    const { data: business, error: bizError } = await sb
      .from('business_info')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (bizError) {
      return NextResponse.json({ error: 'Error al leer datos de facturación: ' + bizError.message }, { status: 500 })
    }
    if (!business) {
      return NextResponse.json(
        { error: 'Completá los datos de facturación primero', redirectTo: '/dashboard/settings/billing' },
        { status: 400 },
      )
    }

    // ── Calcular montos ──
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0)
    const total_price = subtotal

    // ── Insertar documento ──
    const docPayload: Record<string, any> = {
      type,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
      customer_id: customer_id || null,
      order_id: order_id || null,
      items,
      subtotal,
      total_price,
      valid_until: type === 'quote' ? (valid_until || null) : null,
    }

    const { data: document, error: docError } = await sb
      .from('documents')
      .insert(docPayload)
      .select()
      .single()

    if (docError) {
      return NextResponse.json({ error: 'Error al crear documento: ' + docError.message }, { status: 500 })
    }

    // ── Generar PDF ──
    const businessInfo: BusinessInfo = business
    const docData: DocumentData = {
      type: document.type,
      customer_name: document.customer_name,
      customer_phone: document.customer_phone,
      items: document.items,
      subtotal: document.subtotal,
      total_price: document.total_price,
      valid_until: document.valid_until,
      created_at: document.created_at,
    }

    try {
      const pdfUrl = await generateDocumentPDF(businessInfo, docData, document.id)

      // Actualizar pdf_url
      const { error: updateError } = await sb
        .from('documents')
        .update({ pdf_url: pdfUrl })
        .eq('id', document.id)

      if (updateError) {
        console.error('[DOCUMENTS] Error al actualizar pdf_url:', updateError.message)
      }

      return NextResponse.json({
        document: { ...document, pdf_url: pdfUrl },
        pdfUrl,
      })
    } catch (pdfError) {
      // El documento se creó pero falló el PDF
      return NextResponse.json({
        document,
        pdfUrl: null,
        warning: 'El documento se creó pero hubo un error al generar el PDF: ' + String(pdfError),
      }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Error interno: ' + String(err) }, { status: 500 })
  }
}
