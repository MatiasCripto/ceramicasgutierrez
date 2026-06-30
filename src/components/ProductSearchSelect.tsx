'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

interface Product {
  id: string
  name: string
  category: string | null
}

interface ProductSearchSelectProps {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  placeholder?: string
}

export default function ProductSearchSelect({
  products,
  value,
  onChange,
  placeholder = 'Buscar producto...',
}: ProductSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => products.find((p) => p.id === value),
    [products, value],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category?.toLowerCase() ?? '').includes(q),
    )
  }, [products, query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true)
        setHighlightIdx(0)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightIdx]) handleSelect(filtered[highlightIdx].id)
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selected ? selected.name : ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlightIdx(0)
        }}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          setHighlightIdx(0)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          background: 'var(--dash-input-bg)',
          border: '1px solid var(--dash-input-border)',
          color: 'var(--dash-text-primary)',
        }}
        className="w-full h-10 px-3 text-sm rounded-[var(--dash-radius-md)] outline-none transition-colors focus:border-[var(--dash-input-focus)]"
      />

      {open && (
        <div
          className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-[var(--dash-radius-md)] shadow-lg"
          style={{ background: 'var(--dash-card)', border: '1px solid var(--dash-card-border)' }}
        >
          {filtered.length === 0 ? (
            <div
              className="px-3 py-2 text-sm"
              style={{ color: 'var(--dash-text-muted)' }}
            >
              Sin resultados
            </div>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => handleSelect(p.id)}
                onMouseEnter={() => setHighlightIdx(i)}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  background: i === highlightIdx ? 'var(--dash-row-hover)' : 'transparent',
                  color: 'var(--dash-text-primary)',
                }}
              >
                {p.name}
                {p.category && (
                  <span style={{ color: 'var(--dash-text-muted)' }} className="ml-2 text-xs">
                    ({p.category})
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
