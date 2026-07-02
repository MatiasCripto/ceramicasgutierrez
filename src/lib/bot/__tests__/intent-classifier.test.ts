import { describe, it, expect } from 'vitest'
import { classifyIntent, extractKeywords } from '@/lib/bot/intent-classifier'

describe('classifyIntent', () => {
  it('should detect greet', () => {
    expect(classifyIntent('hola')).toBe('greet')
    expect(classifyIntent('buenos días')).toBe('greet')
    expect(classifyIntent('buenas tardes')).toBe('greet')
    expect(classifyIntent('hey')).toBe('greet')
  })

  it('should detect thanks', () => {
    expect(classifyIntent('gracias')).toBe('thanks')
    expect(classifyIntent('muchas gracias')).toBe('thanks')
  })

  it('should detect search_products', () => {
    expect(classifyIntent('busco porcelanato gris')).toBe('search_products')
    expect(classifyIntent('tienen cerámica blanca?')).toBe('search_products')
    expect(classifyIntent('necesito mosaicos')).toBe('search_products')
  })

  it('should detect add_to_cart', () => {
    expect(classifyIntent('quiero comprar')).toBe('add_to_cart')
    expect(classifyIntent('lo quiero')).toBe('add_to_cart')
    expect(classifyIntent('me llevo ese')).toBe('add_to_cart')
  })

  it('should detect cancel_order', () => {
    expect(classifyIntent('cancelar pedido')).toBe('cancel_order')
    expect(classifyIntent('anular')).toBe('cancel_order')
    expect(classifyIntent('baja')).toBe('cancel_order')
  })

  it('should detect human_handoff', () => {
    expect(classifyIntent('hablar con alguien')).toBe('human_handoff')
    expect(classifyIntent('asesor')).toBe('human_handoff')
  })

  it('should return unknown for gibberish', () => {
    expect(classifyIntent('asdfghjkl')).toBe('unknown')
    expect(classifyIntent('xyz 123')).toBe('unknown')
  })
})

describe('extractKeywords', () => {
  it('should extract meaningful words and exclude stop words', () => {
    const keywords = extractKeywords('busco porcelanato gris para piso')
    expect(keywords).toContain('porcelanato')
    expect(keywords).toContain('gris')
    expect(keywords).toContain('piso')
    expect(keywords).not.toContain('para')
    expect(keywords).not.toContain('busco')
  })

  it('should handle accents and punctuation', () => {
    const keywords = extractKeywords('¿Tenés cerámica blanca?')
    expect(keywords).toContain('ceramica')
    expect(keywords).toContain('blanca')
  })

  it('should return empty array for stop words only', () => {
    const keywords = extractKeywords('que como para por')
    expect(keywords.length).toBe(0)
  })
})
