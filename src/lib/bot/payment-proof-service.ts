// ── Payment Proof Service — Single-Tenant ─────────────────────
// Lifecycle: create, approve, reject, query.
// La IA NUNCA procesa comprobantes — esto es lógica exclusiva del backend.

import type { PaymentProof } from '@/lib/types'
import { recordOrderEvent } from '@/lib/services/order-event.service'

export interface PaymentProofInput {
  order_id: string
  customer_id: string
  image_url: string
}

export async function createPaymentProof(
  sb: any,
  data: PaymentProofInput,
): Promise<PaymentProof | null> {
  try {
    const { data: proof, error } = await sb.from('payment_proofs').insert({
      order_id: data.order_id,
      image_url: data.image_url,
      status: 'pending',
    }).select('*').single()

    if (error) {
      console.error('[PAYMENT_PROOF] Create error:', error)
      return null
    }

    console.log('[PAYMENT_PROOF] Created:', { id: proof.id, order_id: data.order_id })
    return proof as PaymentProof
  } catch (err) {
    console.error('[PAYMENT_PROOF] Create exception:', err)
    return null
  }
}

export async function approvePaymentProof(
  sb: any,
  proofId: string,
  reviewerId: string,
): Promise<boolean> {
  try {
    const { data: proof } = await sb.from('payment_proofs')
      .select('order_id')
      .eq('id', proofId)
      .single()

    if (!proof) {
      console.error('[PAYMENT_PROOF] Not found:', proofId)
      return false
    }

    const { error: proofError } = await sb.from('payment_proofs').update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', proofId)

    if (proofError) {
      console.error('[PAYMENT_PROOF] Approve proof error:', proofError)
      return false
    }

    const { error: orderError } = await sb.from('orders').update({
      status: 'payment_confirmed',
      payment_status: 'confirmed',
    }).eq('id', proof.order_id)

    if (orderError) {
      console.error('[PAYMENT_PROOF] Approve order error:', orderError)
      return false
    }

    await recordOrderEvent(sb, {
      order_id: proof.order_id,
      type: 'payment_approved',
      actor_type: 'admin',
      actor_id: reviewerId,
      metadata: { proof_id: proofId },
    })

    console.log('[PAYMENT_PROOF] Approved:', { proofId, orderId: proof.order_id })
    return true
  } catch (err) {
    console.error('[PAYMENT_PROOF] Approve exception:', err)
    return false
  }
}

export async function rejectPaymentProof(
  sb: any,
  proofId: string,
  reviewerId: string,
  notes?: string,
): Promise<boolean> {
  try {
    const { data: proof } = await sb.from('payment_proofs')
      .select('order_id')
      .eq('id', proofId)
      .single()

    if (!proof) return false

    const { error } = await sb.from('payment_proofs').update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      notes: notes ?? null,
    }).eq('id', proofId)

    if (error) {
      console.error('[PAYMENT_PROOF] Reject error:', error)
      return false
    }

    await recordOrderEvent(sb, {
      order_id: proof.order_id,
      type: 'payment_rejected',
      actor_type: 'admin',
      actor_id: reviewerId,
      metadata: { proof_id: proofId, notes: notes ?? null },
    })

    console.log('[PAYMENT_PROOF] Rejected:', { proofId, orderId: proof.order_id })
    return true
  } catch (err) {
    console.error('[PAYMENT_PROOF] Reject exception:', err)
    return false
  }
}

export async function getPaymentProofsByOrder(
  sb: any,
  orderId: string,
): Promise<PaymentProof[]> {
  try {
    const { data } = await sb.from('payment_proofs')
      .select('*')
      .eq('order_id', orderId)
      .order('uploaded_at', { ascending: false })

    return (data as PaymentProof[]) ?? []
  } catch (err) {
    console.error('[PAYMENT_PROOF] Query error:', err)
    return []
  }
}
