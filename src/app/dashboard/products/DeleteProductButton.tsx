'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export default function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const sb = createClient()
    const { error } = await sb.from('products').delete().eq('id', productId)
    setDeleting(false)
    if (error) {
      alert('Error al eliminar: ' + error.message)
      return
    }
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium px-2 py-1 rounded transition-colors"
          style={{ background: 'var(--danger)', color: 'white' }}
        >
          {deleting ? '...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
      style={{ color: 'var(--subtle)' }}
      title="Eliminar producto"
    >
      <Trash2 size={14} />
    </button>
  )
}
