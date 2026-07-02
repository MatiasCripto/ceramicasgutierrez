import { describe, it, expect } from 'vitest'
import {
  initCheckout,
  processCheckoutMessage,
  buildSummary,
  type CheckoutSession,
  type CheckoutItem,
} from '@/lib/bot/checkout-machine'

const sampleItems: CheckoutItem[] = [
  { productName: 'Porcelanato Esmaltado', quantity: 10, m2: 18.5, color: 'Gris', finish: 'Mate' },
  { productName: 'Cerámica Blanca', quantity: 5, m2: 8.2, color: 'Blanco' },
]

describe('initCheckout', () => {
  it('should skip name step when customer name exists', () => {
    const session = initCheckout(sampleItems, 'Juan Pérez')
    expect(session.state).toBe('shipping')
    expect(session.customerName).toBe('Juan Pérez')
    expect(session.items).toEqual(sampleItems)
  })

  it('should start at name step when no customer name', () => {
    const session = initCheckout(sampleItems, null)
    expect(session.state).toBe('name')
    expect(session.customerName).toBeUndefined()
    expect(session.items).toEqual(sampleItems)
  })

  it('should start at name step when customer name is empty', () => {
    const session = initCheckout(sampleItems, '')
    expect(session.state).toBe('name')
  })
})

describe('processCheckoutMessage — name state', () => {
  it('should transition to shipping when valid full name given', () => {
    const session: CheckoutSession = { state: 'name', items: sampleItems }
    const result = processCheckoutMessage('Juan Pérez', session)
    expect(result.session.state).toBe('shipping')
    expect(result.session.customerName).toBe('Juan Pérez')
    expect(result.response).toContain('Gracias')
  })

  it('should stay in name state when only first name given', () => {
    const session: CheckoutSession = { state: 'name', items: sampleItems }
    const result = processCheckoutMessage('Juan', session)
    expect(result.session.state).toBe('name')
    expect(result.response).toContain('nombre completo')
  })

  it('should stay in name state for empty input', () => {
    const session: CheckoutSession = { state: 'name', items: sampleItems }
    const result = processCheckoutMessage('', session)
    expect(result.session.state).toBe('name')
  })
})

describe('processCheckoutMessage — shipping state', () => {
  it('should transition to payment_method on pickup', () => {
    const session: CheckoutSession = { state: 'shipping', items: sampleItems, customerName: 'Juan' }
    const result = processCheckoutMessage('retiro por el local', session)
    expect(result.session.state).toBe('payment_method')
    expect(result.session.shippingMethod).toBe('pickup')
    expect(result.response).toContain('Retirás')
  })

  it('should reject with retry for unknown shipping method', () => {
    const session: CheckoutSession = { state: 'shipping', items: sampleItems, customerName: 'Juan' }
    const result = processCheckoutMessage('no', session)
    expect(result.session.state).toBe('shipping')
    expect(result.response).toContain('retirás')
  })

  it('should accept short delivery keyword', () => {
    const session: CheckoutSession = { state: 'shipping', items: sampleItems, customerName: 'Juan' }
    const result = processCheckoutMessage('delivery', session)
    expect(result.session.state).toBe('payment_method')
    expect(result.session.shippingMethod).toBe('delivery')
  })

  it('should treat long text as address', () => {
    const session: CheckoutSession = { state: 'shipping', items: sampleItems, customerName: 'Juan' }
    const result = processCheckoutMessage('Calle Falsa 123, Berazategui', session)
    expect(result.session.state).toBe('payment_method')
    expect(result.session.shippingMethod).toBe('delivery')
    expect(result.session.address).toBe('Calle Falsa 123, Berazategui')
  })
})

describe('processCheckoutMessage — payment_method state', () => {
  it('should transition to confirm on cash', () => {
    const session: CheckoutSession = {
      state: 'payment_method', items: sampleItems, customerName: 'Juan',
      shippingMethod: 'pickup',
    }
    const result = processCheckoutMessage('efectivo', session)
    expect(result.session.state).toBe('confirm')
    expect(result.session.paymentMethod).toBe('cash')
    expect(result.response).toContain('Perfecto')
  })

  it('should transition to confirm on transfer and emit send_payment_info action', () => {
    const session: CheckoutSession = {
      state: 'payment_method', items: sampleItems, customerName: 'Juan',
      shippingMethod: 'delivery', address: 'Calle 123',
    }
    const result = processCheckoutMessage('transferencia', session)
    expect(result.session.state).toBe('confirm')
    expect(result.session.paymentMethod).toBe('transfer')
    expect(result.action?.type).toBe('send_payment_info')
  })

  it('should reject unknown payment method', () => {
    const session: CheckoutSession = {
      state: 'payment_method', items: sampleItems, customerName: 'Juan',
    }
    const result = processCheckoutMessage('mercado pago', session)
    expect(result.session.state).toBe('payment_method')
  })
})

describe('processCheckoutMessage — confirm state', () => {
  it('should create order on confirmation', () => {
    const session: CheckoutSession = {
      state: 'confirm', items: sampleItems, customerName: 'Juan',
      shippingMethod: 'pickup', paymentMethod: 'cash',
    }
    const result = processCheckoutMessage('si', session)
    expect(result.session.state).toBe('completed')
    expect(result.action?.type).toBe('create_order')
  })

  it('should cancel on cancel intent', () => {
    const session: CheckoutSession = {
      state: 'confirm', items: sampleItems, customerName: 'Juan',
    }
    const result = processCheckoutMessage('no', session)
    expect(result.session.state).toBe('idle')
    expect(result.action?.type).toBe('cancel')
  })

  it('should stay on confirm for gibberish', () => {
    const session: CheckoutSession = {
      state: 'confirm', items: sampleItems, customerName: 'Juan',
    }
    const result = processCheckoutMessage('asdfgh', session)
    expect(result.session.state).toBe('confirm')
    expect(result.response).toContain('resumen')
  })
})

describe('processCheckoutMessage — idle/completed state', () => {
  it('should return empty response for idle state', () => {
    const session: CheckoutSession = { state: 'idle', items: [] }
    const result = processCheckoutMessage('hola', session)
    expect(result.response).toBe('')
  })

  it('should return empty response for completed state', () => {
    const session: CheckoutSession = { state: 'completed', items: [] }
    const result = processCheckoutMessage('hola', session)
    expect(result.response).toBe('')
  })
})

describe('buildSummary', () => {
  it('should include all items with m² and boxes', () => {
    const session: CheckoutSession = {
      state: 'confirm', items: sampleItems,
      customerName: 'Juan', shippingMethod: 'pickup', paymentMethod: 'cash',
    }
    const summary = buildSummary(session)
    expect(summary).toContain('Porcelanato Esmaltado')
    expect(summary).toContain('Cerámica Blanca')
    expect(summary).toContain('26.70m²') // 18.5 + 8.2
    expect(summary).toContain('15 cajas') // 10 + 5
    expect(summary).toContain('Retiro')
    expect(summary).toContain('efectivo')
  })

  it('should include delivery address', () => {
    const session: CheckoutSession = {
      state: 'confirm', items: [sampleItems[0]],
      customerName: 'Juan', shippingMethod: 'delivery',
      address: 'Calle Falsa 123', paymentMethod: 'transfer',
    }
    const summary = buildSummary(session)
    expect(summary).toContain('Calle Falsa 123')
    expect(summary).toContain('Envío')
  })
})
