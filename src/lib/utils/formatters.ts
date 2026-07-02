export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelative(date: string | Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:         { bg: '#fef3c7', color: '#92400e' },
  confirmed:       { bg: '#dbeafe', color: '#1e40af' },
  paid:            { bg: '#d1fae5', color: '#065f46' },
  preparing:       { bg: '#e0e7ff', color: '#3730a3' },
  completed:       { bg: '#d1fae5', color: '#065f46' },
  cancelled:       { bg: '#fee2e2', color: '#991b1b' },
  refunded:        { bg: '#fef3c7', color: '#92400e' },
}

export const STATUS_LABELS: Record<string, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  paid:      'Pagado',
  preparing: 'Preparando',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded:  'Reembolsado',
}

export const PAYMENT_LABELS: Record<string, string> = {
  cash:       'Efectivo',
  transfer:   'Transferencia',
  pending:    'Pendiente',
  paid:       'Pagado',
  failed:     'Fallido',
  refunded:   'Reembolsado',
}

export const SHIPPING_LABELS: Record<string, string> = {
  pickup:   'Retiro en local',
  delivery: 'Envío a domicilio',
}

export function getOrderStatusConfig(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f3f4f6', color: '#6b7280' }
}

export function getPaymentStatusConfig(status: string) {
  return STATUS_STYLES[status] ?? { bg: '#f3f4f6', color: '#6b7280' }
}

export function getRfmConfig() {
  return {}
}
