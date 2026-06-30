import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createServiceClient } from '@/lib/supabase/service'
import DocumentPDF, { type BusinessInfo, type DocumentData } from './DocumentPDF'

export async function generateDocumentPDF(
  business: BusinessInfo,
  doc: DocumentData,
  docId: string,
): Promise<string> {
  const element = React.createElement(DocumentPDF, { business, doc })
  const pdfBuffer = await renderToBuffer(element)

  const sb = createServiceClient()
  const path = `documents/${docId}.pdf`

  const { error: uploadError } = await sb.storage
    .from('business-assets')
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    throw new Error('Error al subir PDF: ' + uploadError.message)
  }

  const { data: urlData } = sb.storage
    .from('business-assets')
    .getPublicUrl(path)

  if (!urlData?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública del PDF')
  }

  return urlData.publicUrl
}
