// ── WhatsApp webhook (Evolution API) — Cerámicas Gutiérrez ────
// Single-tenant: sin stores/organizations. Schema cerámico (JSONB items).
// Orquestador: delega a handlers especializados.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendText, downloadMedia } from '@/lib/bot/evolution-client'
import { getProductImages, sendProductImages } from '@/lib/bot/product-images'
import {
  getOrCreateConversation, saveMessage, updateContext,
  fetchProducts, fetchCustomerOrders, fetchCustomerHistory,
  resolveCeramicProduct,
  acquireConversationLock, releaseConversationLock,
} from '@/lib/bot/conversation-engine'
import { generateAiResponse } from '@/lib/bot/ai-chat'
import {
  initCheckout, processCheckoutMessage,
} from '@/lib/bot/checkout-machine'
import { buildProductPresentation } from '@/lib/bot/product-emoji-map'
import { getStorePaymentSettings, formatPaymentSettings } from '@/lib/bot/payment-service'
import { addItemsToOrder, removeItemsFromOrder, canEditOrder, createOrder } from '@/lib/bot/order-service'
import { validateWebhookPayload } from './validators/payload.validator'
import { handleMediaMessage } from './handlers/media.handler'
import type { CheckoutState, CheckoutSession } from '@/lib/bot/checkout-machine'
import type { EvolutionMessageData, BotContext } from '@/lib/types/whatsapp.types'

const CHECKOUT_STATES: Set<string> = new Set(['name', 'shipping', 'payment_method', 'confirm', 'completed'])
const LEGACY_STATES: Set<string> = new Set(['checkout', 'checkout_completed'])
const processedMessages = new Set<string>()

function isCheckoutState(s: string): boolean {
  return CHECKOUT_STATES.has(s)
}

function daysAgo(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7) return `hace ${diffDays} días`
  if (diffDays < 14) return 'la semana pasada'
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semanas`
  return `hace ${Math.floor(diffDays / 30)} meses`
}

function matchOrderByText(text: string, orders: any[]): any | null {
  const lower = text.toLowerCase()

  // Intentar coincidencia por número de pedido (ID corto)
  for (const o of orders) {
    const shortId = o.id.slice(0, 8)
    if (lower.includes(shortId)) return o
  }

  // Intentar coincidencia por producto en el texto
  for (const o of orders) {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items ?? [])
    for (const item of items) {
      if (lower.includes(item.product_name?.toLowerCase() ?? '')) return o
    }
  }

  // Intentar coincidencia por fecha relativa
  const dateKeywords: Record<string, (o: any) => boolean> = {
    ayer: (o) => daysAgo(o.created_at) === 'ayer',
    hoy: (o) => daysAgo(o.created_at) === 'hoy',
    semana: (o) => daysAgo(o.created_at).includes('semana'),
  }
  for (const [keyword, matchFn] of Object.entries(dateKeywords)) {
    if (lower.includes(keyword)) {
      const match = orders.find(matchFn)
      if (match) return match
    }
  }

  // Último recurso: tomar el único pedido
  if (orders.length === 1) return orders[0]

  return null
}

function buildOrderDescription(o: any, index: number): string {
  const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items ?? [])
  const productNames = items.map((i: any) => i.product_name).join(', ')
  const dateLabel = daysAgo(o.created_at)
  return `${index + 1}. Pedido del ${dateLabel}: ${productNames} — $${o.total_price?.toFixed(2)}`
}

export async function POST(req: NextRequest) {
  const __start = Date.now()
  let ctx!: BotContext
  let conversationId: string | undefined

  try {
    // Log the RAW request for debugging
    const rawBody = await req.clone().text()
    console.log('[WEBHOOK] RAW BODY (first 200):', rawBody.slice(0, 200))

    const validated = await validateWebhookPayload(req)
    console.log('[WEBHOOK] validated:', validated.ok)
    if (!validated.ok) {
      console.log('[WEBHOOK] validation failed:', JSON.stringify(validated).slice(0, 200))
      return validated.response
    }

    const { payload, phone, text, pushName } = validated.data
    const data = payload.data as EvolutionMessageData
    console.log('[WEBHOOK] msg from:', phone, 'text:', text.slice(0, 60))
    console.log('[WEBHOOK] pushName:', pushName, 'msgId:', data.key?.id, 'fromMe:', data.key?.fromMe)

    // ── Single-tenant: conectar directo a Supabase ──────────────
    const sb = createServiceClient()

    // Evolution instance: usar la default (env EVOLUTION_INSTANCE)
    const evoSend = (phone: string, text: string) => sendText(phone, text, 1200)
    const evoDownload = (jid: string, msgId: string) => downloadMedia(jid, msgId)

    // ── Message-level idempotency ───────────────────────────────
    const msgId = data.key?.id
    // In-memory dedup (Evolution API envía el mismo evento varias veces)
    if (msgId && processedMessages.has(msgId)) {
      console.log('[WEBHOOK] duplicate msgId, skipping:', msgId)
      return NextResponse.json({ ok: true })
    }
    if (msgId) {
      processedMessages.add(msgId)
      if (processedMessages.size > 100) {
        const first = processedMessages.values().next().value
        processedMessages.delete(first)
      }
    }
    if (msgId) {
      const { data: existingMsg } = await sb.from('messages')
        .select('id')
        .eq('channel_message_id', msgId)
        .maybeSingle()
      if (existingMsg) {
        console.log('[WEBHOOK] duplicate message, skipping:', msgId)
        return NextResponse.json({ ok: true })
      }
    }

    // ── Get or create conversation (single-tenant) ──────────────
    const { conversationId: cid, context: rawCtx, isNew } = await getOrCreateConversation(phone, pushName)
    conversationId = cid
    if (!conversationId) {
      console.log('[WEBHOOK] no conversationId')
      return NextResponse.json({ error: 'No conversation' }, { status: 500 })
    }
    console.log('[WEBHOOK] conv:', conversationId, 'isNew:', isNew)

    // ── Save inbound message ────────────────────────────────────
    await saveMessage(conversationId, 'inbound', text)
    ctx = rawCtx as BotContext
    console.log('[WEBHOOK] state:', ctx.state, 'customerId:', ctx.customerId, 'customerName:', ctx.customerName)

    // ── Acquire conversation lock ────────────────────────────────
    if (!acquireConversationLock(ctx)) {
      console.log('[WEBHOOK] conversation locked, skipping:', conversationId, 'processingSince:', ctx.processingStartedAt)
      return NextResponse.json({ ok: true })
    }

    // ── Reset legacy states ─────────────────────────────────────
    if (LEGACY_STATES.has(ctx.state)) {
      console.log('[WEBHOOK] resetting legacy state:', ctx.state, '→ idle')
      ctx.state = 'idle'
    }

    // ┌────────────────────────────────────────────────────────────┐
    // │                    CHECKOUT FLOW                           │
    // └────────────────────────────────────────────────────────────┘
    console.log('[WEBHOOK] routing — state:', ctx.state, 'isCheckout:', isCheckoutState(ctx.state), 'activeOrderId:', ctx.activeOrderId)

    if (isCheckoutState(ctx.state)) {
      // BUG 1: completed sin activeOrderId → reset and continue to normal flow
      if (ctx.state === 'completed' && !ctx.activeOrderId) {
        console.log('[WEBHOOK] checkout completed but no activeOrderId, resetting')
        ctx.state = 'idle'
        ctx.checkoutItems = undefined
        ctx.checkoutName = undefined
        ctx.checkoutShippingMethod = undefined
        ctx.checkoutAddress = undefined
        ctx.checkoutPaymentMethod = undefined
        // Don't return — falls through to normal flow below this if block
      } else {
        console.log('[WEBHOOK] entering checkout flow, text:', text.slice(0, 50))

        // Rebuild session from ctx
        const session: CheckoutSession = {
          state: ctx.state as CheckoutState,
          items: ctx.checkoutItems ?? [],
          customerName: ctx.checkoutName ?? ctx.customerName ?? undefined,
          shippingMethod: ctx.checkoutShippingMethod as 'pickup' | 'delivery' | undefined,
          address: ctx.checkoutAddress ?? undefined,
          paymentMethod: ctx.checkoutPaymentMethod as 'cash' | 'transfer' | undefined,
        }

        const result = processCheckoutMessage(text, session)

        // Persist session back to ctx
        ctx.state = result.session.state
        ctx.checkoutItems = result.session.items
        ctx.checkoutName = result.session.customerName
        ctx.checkoutShippingMethod = result.session.shippingMethod
        ctx.checkoutAddress = result.session.address
        ctx.checkoutPaymentMethod = result.session.paymentMethod

        // ── Send payment info (transfer method) ────────────────
        if (result.action?.type === 'send_payment_info') {
          const paySettings = await getStorePaymentSettings(sb)
          const bankMsg = paySettings
            ? formatPaymentSettings(paySettings)
            : '⚠️ No hay una cuenta bancaria configurada actualmente. Por favor hablanos con un asesor.'

          if (result.response) {
            appendHistory(ctx, text, result.response)
            await saveMessage(conversationId, 'outbound', result.response)
            await evoSend(phone, result.response)
          }
          await saveMessage(conversationId, 'outbound', bankMsg)
          await evoSend(phone, bankMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        // ── Create order (confirmed) ───────────────────────────
        if (result.action?.type === 'create_order') {
          if (!ctx.customerId) {
            await sendError(evoSend, saveMessage, updateContext, conversationId, ctx, 'Error: no se encontró el cliente')
            return NextResponse.json({ ok: true })
          }

          const orderItems = session.items.map(item => ({
            product_name: item.productName,
            m2: item.m2 ?? 0,
            boxes: item.quantity,
            price_per_m2: 0,
            total: 0,
          }))
          const totalM2 = session.items.reduce((sum, i) => sum + (i.m2 ?? 0), 0)
          const totalBoxes = session.items.reduce((sum, i) => sum + i.quantity, 0)

          const normMethod = session.shippingMethod === 'shipping' ? 'delivery' : (session.shippingMethod ?? 'pickup')
          const orderResult = await createOrder({
            customerId: ctx.customerId,
            customerPhone: ctx.phone ?? phone,
            customerName: session.customerName ?? ctx.customerName ?? null,
            items: orderItems,
            totalM2,
            totalBoxes,
            totalPrice: 0,
            paymentMethod: session.paymentMethod ?? 'transfer',
            shippingMethod: normMethod,
            shippingAddress: session.address ?? null,
          })

          if (!orderResult.ok) {
            await sendError(evoSend, saveMessage, updateContext, conversationId, ctx, 'Hubo un error al crear tu pedido. Por favor hablanos con un asesor.')
            return NextResponse.json({ ok: true })
          }

          ctx.state = 'closed'
          ctx.activeOrderId = orderResult.orderId
          ctx.lastOrderId = orderResult.orderId

          // Guardar nombre si lo obtuvimos durante el checkout
          if (session.customerName && session.customerName !== ctx.customerName) {
            await sb.from('customers').update({ full_name: session.customerName }).eq('id', ctx.customerId)
          }

          const confirmMsg =
            `✅ ¡Pedido #${orderResult.orderNumber} confirmado!` +
            (session.shippingMethod === 'pickup'
              ? '\n\n📦 Te avisamos cuando esté listo para retirar. Retirás por:\n📍 Camino General Belgrano 8093, Gutiérrez, Berazategui\n📍 Calle 1278 N° 743, Ingeniero Allan, Florencio Varela'
              : '\n\n📦 Te vamos a informar cuando esté en camino.')

          await updateContext(conversationId, ctx)
          await saveMessage(conversationId, 'outbound', confirmMsg)
          await evoSend(phone, confirmMsg)
          return NextResponse.json({ ok: true })
        }

        // ── Cancel ─────────────────────────────────────────────
        if (result.action?.type === 'cancel') {
          ctx.state = 'idle'
          ctx.checkoutItems = undefined
          ctx.checkoutName = undefined
          ctx.checkoutShippingMethod = undefined
          ctx.checkoutAddress = undefined
          ctx.checkoutPaymentMethod = undefined

          if (result.response) {
            appendHistory(ctx, text, result.response)
            await saveMessage(conversationId, 'outbound', result.response)
            await evoSend(phone, result.response)
          }
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        // ── No action — just the state machine response ─────────
        appendHistory(ctx, text, result.response)
        await saveMessage(conversationId, 'outbound', result.response)
        await evoSend(phone, result.response)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }
    }

    // ┌────────────────────────────────────────────────────────────┐
    // │              PAYMENT PROOF DETECTION                       │
    // └────────────────────────────────────────────────────────────┘
    if (ctx.activeOrderId && (data.message?.imageMessage?.url || data.message?.imageMessage)) {
      const jid = data.key?.remoteJid
      const imgMsgId = data.key?.id
      if (!jid || !imgMsgId) return NextResponse.json({ ok: true })

      return handleMediaMessage({
        sb, ctx, conversationId, phone,
        jid, msgId: imgMsgId,
        evoDownload, evoSend,
      })
    }

    // ┌────────────────────────────────────────────────────────────┐
    // │                    NORMAL FLOW                             │
    // └────────────────────────────────────────────────────────────┘
    console.log('[WEBHOOK] entering normal flow', 'customerId:', ctx.customerId, 'historyLen:', ctx.history?.length ?? 0, 'activeOrderId:', ctx.activeOrderId)

    const customerId = ctx.customerId
    const [products, orders, history] = await Promise.all([
      fetchProducts(sb),
      customerId ? fetchCustomerOrders(sb, customerId) : [],
      customerId ? fetchCustomerHistory(sb, customerId) : [],
    ])

    // ── Active order detection ───────────────────────────────────
    let activeOrderDetails: any[] | undefined
    let activeOrderStatus: string | undefined

    // Si ya hay activeOrderId, obtener su detalle
    if (ctx.activeOrderId && orders?.length) {
      const activeOrder = orders.find((o: any) => o.id === ctx.activeOrderId)
      activeOrderDetails = activeOrder?.items ?? undefined
      activeOrderStatus = activeOrder?.status ?? undefined
    }

    // ── Order disambiguation ─────────────────────────────────────
    // Si no hay activeOrderId, buscar pedidos editables
    if (!ctx.activeOrderId) {
      const editableOrders = orders?.filter((o: any) => canEditOrder(o.status)) ?? []

      if (editableOrders.length > 1 && !ctx.awaitingOrderSelection) {
        // Múltiples pedidos editables → preguntar cuál
        const descriptions = editableOrders.map((o: any, i: number) => buildOrderDescription(o, i))
        const disambigMsg = 'Tenés varios pedidos en curso:\n\n' +
          descriptions.join('\n') +
          '\n\n¿A cuál te referís? (Decime el número, el producto o la fecha)'

        ctx.pendingOrderIds = editableOrders.map((o: any) => o.id)
        ctx.awaitingOrderSelection = true

        appendHistory(ctx, text, disambigMsg)
        await saveMessage(conversationId, 'outbound', disambigMsg)
        await evoSend(phone, disambigMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }

      if (ctx.awaitingOrderSelection && ctx.pendingOrderIds?.length) {
        // El cliente está respondiendo a la pregunta de desambiguación
        const pendingOrders = orders?.filter((o: any) => ctx.pendingOrderIds!.includes(o.id)) ?? []
        const matched = matchOrderByText(text, pendingOrders)

        if (matched) {
          ctx.activeOrderId = matched.id
          ctx.lastOrderId = matched.id
          ctx.awaitingOrderSelection = undefined
          ctx.pendingOrderIds = undefined
          activeOrderDetails = matched.items ?? undefined
          activeOrderStatus = matched.status ?? undefined

          const ackMsg = `Ahí lo tengo, pedido del ${daysAgo(matched.created_at)}. Decime cómo querés seguirlo.`
          appendHistory(ctx, text, ackMsg)
          await saveMessage(conversationId, 'outbound', ackMsg)
          await evoSend(phone, ackMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        // No se pudo identificar → pedir de nuevo
        const retryMsg = 'No entendí bien cuál. Los pedidos que tenés son:\n\n' +
          pendingOrders.map((o: any, i: number) => buildOrderDescription(o, i)).join('\n') +
          '\n\n¿Podés decirme el producto o la fecha?'
        await saveMessage(conversationId, 'outbound', retryMsg)
        await evoSend(phone, retryMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }

      // Un solo pedido editable → auto-seleccionar
      if (editableOrders.length === 1) {
        ctx.activeOrderId = editableOrders[0].id
        ctx.lastOrderId = editableOrders[0].id
        activeOrderDetails = editableOrders[0].items ?? undefined
        activeOrderStatus = editableOrders[0].status ?? undefined
        console.log('[WEBHOOK] auto-detected single editable order:', ctx.activeOrderId, 'status:', activeOrderStatus)
      }
    }

    // ── Build AI context ─────────────────────────────────────────
    const aiCtx: Record<string, any> = {
      customerName: ctx.customerName,
      customerHistory: history,
      products,
      orders,
      history: ctx.history ?? [],
      activeOrderId: ctx.activeOrderId ?? undefined,
      activeOrderStatus,
      activeOrderDetails,
    }

    // ── Generate AI response ─────────────────────────────────────
    const response = await generateAiResponse(text, aiCtx)
    console.log('[WEBHOOK] AI response', 'hasResponse:', !!response, 'msg:', response?.message?.slice(0, 80), 'action:', response?.action?.type)

    if (!response) {
      const fallback = 'Uh, disculpa, estoy teniendo una pequeña falla técnica. Decime "hola" para seguir hablando!'
      await saveMessage(conversationId, 'outbound', fallback)
      await evoSend(phone, fallback)
      return NextResponse.json({ ok: true })
    }

    // ── Save to history ──────────────────────────────────────────
    const historyMsgs = ctx.history ?? []
    historyMsgs.push({ role: 'user', content: text })
    if (response.message?.trim() && !response.message.trim().startsWith('{') && !response.message.trim().startsWith('[')) {
      historyMsgs.push({ role: 'assistant', content: response.message.trim() })
    }
    ctx.history = historyMsgs

    // ── Handle actions ───────────────────────────────────────────

    // Human handoff
    if (response.action?.type === 'human_handoff') {
      ctx.state = 'human_handoff'
      await sb.from('conversations').update({ status: 'human', human_takeover: true }).eq('id', conversationId)
    }

    // Start checkout
    if (response.action?.type === 'start_checkout' && ctx.customerId) {
      const { data: customerData } = await sb.from('customers')
        .select('full_name')
        .eq('id', ctx.customerId)
        .single()

      const existingCustomerName = customerData?.full_name ?? ctx.customerName ?? null

      const session = initCheckout(response.action.items ?? [], existingCustomerName)
      ctx.state = session.state
      ctx.checkoutItems = session.items
      ctx.checkoutName = session.customerName

      const firstQuestion = getFirstQuestion(session.state)
      await saveMessage(conversationId, 'outbound', firstQuestion)
      await evoSend(phone, firstQuestion)
      await updateContext(conversationId, ctx)
      return NextResponse.json({ ok: true })
    }

    // ── Payment info request ─────────────────────────────────────
    if (response.action?.type === 'request_payment_info') {
      const paySettings = await getStorePaymentSettings(sb)
      historyMsgs.pop()
      historyMsgs.pop()

      const bankMsg = paySettings
        ? formatPaymentSettings(paySettings)
        : '⚠️ No hay una cuenta bancaria configurada actualmente. Por favor hablanos con un asesor.'

      await saveMessage(conversationId, 'outbound', bankMsg)
      await evoSend(phone, bankMsg)
      await updateContext(conversationId, ctx)
      return NextResponse.json({ ok: true })
    }

    // ── Payment info fallback ────────────────────────────────────
    const paymentKeywords = /pasame los datos|datos bancarios|alias|quiero pagar|quiero transferir|me pasas.*(?:cuenta|banco|alias|cbu|cvu)|necesito.*(?:pagar|transferir)|cbu|cvu|a qué (?:cuenta|banco)|cuenta bancaria|para transferir|para pagar|hacer el pago|realizar (?:la )?transferencia|datos de pago|mandame.*(?:cuenta|banco|alias)/i
    if (!response.action?.type && paymentKeywords.test(text)) {
      const paySettings = await getStorePaymentSettings(sb)
      const bankMsg = paySettings
        ? formatPaymentSettings(paySettings)
        : 'Lo siento, no hay una cuenta bancaria configurada actualmente. Por favor consulta con un asesor.'

      if (/(?:paso|mando|envio|doy).*(?:datos|cuenta|alias|banco)/i.test(response.message ?? '')) {
        historyMsgs.pop()
        historyMsgs.pop()
      }

      await saveMessage(conversationId, 'outbound', bankMsg)
      await evoSend(phone, bankMsg)
      await updateContext(conversationId, ctx)
      return NextResponse.json({ ok: true })
    }

    // ── Add to existing order ────────────────────────────────────
    if (response.action?.type === 'add_to_order' && ctx.activeOrderId) {
      const items = response.action.items ?? []
      if (items.length === 0) {
        const errMsg = 'No entendí qué producto querés agregar. ¿Me decís el nombre?'
        historyMsgs.push({ role: 'assistant', content: errMsg })
        await saveMessage(conversationId, 'outbound', errMsg)
        await evoSend(phone, errMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }

      // Resolver productos cerámicos → construir items para addItemsToOrder
      const ceramicItems: Array<{
        product_id?: string
        product_name: string
        m2: number
        boxes: number
        price_per_m2: number
        total: number
      }> = []

      for (const item of items) {
        const product = resolveCeramicProduct(products, { productName: item.productName })
        if (!product) {
          console.log('[WEBHOOK] add_to_order: product NOT FOUND for', item.productName)
          continue
        }

        const m2 = item.m2 ?? 0
        const m2PerBox = product.m2_per_box ?? 1
        const boxes = item.quantity || Math.ceil(m2 / m2PerBox)
        const pricePerM2 = product.price_per_m2 ?? product.price_per_unit ?? 0
        const total = m2 * pricePerM2

        ceramicItems.push({
          product_id: product.id,
          product_name: product.name,
          m2,
          boxes,
          price_per_m2: pricePerM2,
          total,
        })
      }

      if (ceramicItems.length === 0) {
        const errMsg = 'No encontré ese producto en el catálogo. ¿Podés verificar el nombre?'
        historyMsgs.push({ role: 'assistant', content: errMsg })
        await saveMessage(conversationId, 'outbound', errMsg)
        await evoSend(phone, errMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }

      const ok = await addItemsToOrder(ctx.activeOrderId, ceramicItems)
      const okMsg = ok
        ? 'Listo, se agregaron los productos a tu pedido. ¿Algo más o lo dejamos así?'
        : 'Hubo un error al agregar los productos. ¿Podés intentar de nuevo?'

      historyMsgs.push({ role: 'assistant', content: okMsg })
      await saveMessage(conversationId, 'outbound', okMsg)
      await evoSend(phone, okMsg)
      await updateContext(conversationId, ctx)
      return NextResponse.json({ ok: true })
    }

    // ── Remove from order ────────────────────────────────────────
    if (response.action?.type === 'remove_from_order' && ctx.activeOrderId) {
      const items = response.action.items ?? []
      if (items.length === 0) {
        const errMsg = 'No entendí qué producto querés sacar. ¿Me decís el nombre?'
        historyMsgs.push({ role: 'assistant', content: errMsg })
        await saveMessage(conversationId, 'outbound', errMsg)
        await evoSend(phone, errMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }

      const productNames = items.map((i: any) => i.productName).filter(Boolean)
      const ok = await removeItemsFromOrder(ctx.activeOrderId, productNames)
      const okMsg = ok
        ? 'Listo, saqué del pedido: ' + productNames.join(', ') + '. ¿Algo más o lo dejamos así?'
        : 'No encontré ese producto en tu pedido.'

      historyMsgs.push({ role: 'assistant', content: okMsg })
      await saveMessage(conversationId, 'outbound', okMsg)
      await evoSend(phone, okMsg)
      await updateContext(conversationId, ctx)
      return NextResponse.json({ ok: true })
    }

    // ── Show product images ──────────────────────────────────────
    if (response.action?.type === 'show_product_images') {
      try {
        const productName = (response.action.productName ?? '').trim()
        if (!productName) {
          const errMsg = '¿De qué producto querés ver las fotos? Decime el nombre.'
          historyMsgs.push({ role: 'assistant', content: errMsg })
          await saveMessage(conversationId, 'outbound', errMsg)
          await evoSend(phone, errMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        const result = await getProductImages(productName, text)
        console.log('[PRODUCT_IMAGES] search result:', { productName, imagesCount: result.images.length, ambiguous: result.ambiguousMatches.length })

        if (!result.productName && result.ambiguousMatches.length === 0) {
          const errMsg = `No tengo fotos de "${productName}" todavía 😕 ¿Querés que te describa cómo es o te paso el precio?`
          historyMsgs.push({ role: 'assistant', content: errMsg })
          await saveMessage(conversationId, 'outbound', errMsg)
          await evoSend(phone, errMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        if (result.ambiguousMatches.length > 0) {
          const list = result.ambiguousMatches.join(', ')
          const disambigMsg = `Encontré varios: ${list}. ¿De cuál querés ver las fotos?`
          historyMsgs.push({ role: 'assistant', content: disambigMsg })
          await saveMessage(conversationId, 'outbound', disambigMsg)
          await evoSend(phone, disambigMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        if (result.images.length === 0) {
          const errMsg = `No tengo fotos cargadas de ${result.productName ?? 'este producto'} todavía 😕 ¿Querés que te describa cómo es o te paso el precio?`
          historyMsgs.push({ role: 'assistant', content: errMsg })
          await saveMessage(conversationId, 'outbound', errMsg)
          await evoSend(phone, errMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        const { sent, failed } = await sendProductImages(phone, result.images, result.productName ?? 'Producto')

        if (sent === 0) {
          const errMsg = `Hubo un problema al enviar las fotos de ${result.productName ?? 'Producto'} 😕`
          historyMsgs.push({ role: 'assistant', content: errMsg })
          await saveMessage(conversationId, 'outbound', errMsg)
          await evoSend(phone, errMsg)
          await updateContext(conversationId, ctx)
          return NextResponse.json({ ok: true })
        }

        if (failed > 0) {
          console.log(`[PRODUCT_IMAGES] sent ${sent}/${sent + failed} images for ${result.productName ?? 'Producto'}`)
        }

        const followUpText = `¿Te interesa ${result.productName ?? 'este producto'}? Decime si querés agregarlo al pedido 📦`
        historyMsgs.push({ role: 'assistant', content: followUpText })
        await saveMessage(conversationId, 'outbound', followUpText)
        await evoSend(phone, followUpText)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      } catch (err) {
        console.error('[WEBHOOK] show_product_images error:', err)
        const errMsg = 'Hubo un problema al buscar las fotos. ¿Querés que te describa el producto?'
        historyMsgs.push({ role: 'assistant', content: errMsg })
        await saveMessage(conversationId, 'outbound', errMsg)
        await evoSend(phone, errMsg)
        await updateContext(conversationId, ctx)
        return NextResponse.json({ ok: true })
      }
    }

    // ── Safety fallback ─────────────────────────────────────────
    let safeMessage = response.message?.trim()
    if (!safeMessage || safeMessage.startsWith('{') || safeMessage.startsWith('[')) {
      console.log('[WEBHOOK] SAFETY: blocked raw/empty message from leaking:', JSON.stringify(safeMessage?.slice(0, 120)))
      safeMessage = 'Dale, decime cómo puedo ayudarte.'
    }

    await saveMessage(conversationId, 'outbound', safeMessage)
    await evoSend(phone, safeMessage)
    await updateContext(conversationId, ctx)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WhatsApp Webhook]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    if (conversationId) {
      releaseConversationLock(ctx)
      await updateContext(conversationId, ctx).catch(() => {})
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function appendHistory(ctx: BotContext, userMsg: string, assistantMsg: string) {
  const h = ctx.history ?? []
  h.push({ role: 'user', content: userMsg })
  h.push({ role: 'assistant', content: assistantMsg })
  ctx.history = h
}

async function sendError(
  evoSend: (phone: string, text: string) => Promise<any>,
  saveMessage: (convId: string, dir: 'inbound' | 'outbound', body: string) => Promise<any>,
  updateContext: (convId: string, ctx: BotContext) => Promise<any>,
  conversationId: string,
  ctx: BotContext,
  msg: string,
) {
  await saveMessage(conversationId, 'outbound', msg)
  await evoSend(ctx.phone ?? '', msg)
  await updateContext(conversationId, ctx)
}

function getFirstQuestion(state: string): string {
  switch (state) {
    case 'name': return 'Perfecto, ¿me decís tu nombre completo?'
    case 'shipping': return '¿Cómo preferís recibirlo? ¿Envío a domicilio o retiro por el showroom en Gutiérrez?'
    case 'payment_method': return '¿Cómo preferís pagar? ¿Efectivo o transferencia bancaria?'
    default: return 'Decime, ¿qué más necesitás?'
  }
}
