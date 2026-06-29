export interface CeramicProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  size: string | null
  color: string | null
  finish: string | null
  brand: string | null
  price_per_m2: number | null
  price_per_unit: number | null
  m2_per_box: number | null
  stock_m2: number | null
  stock_units: number | null
  images: string[]
  attributes: string[]
  featured_on_landing: boolean
  active: boolean
}

export interface Bundle {
  id: string
  name: string
  bundle_price: number
  active: boolean
  items: BundleItem[]
}

export interface BundleItem {
  product_id: string
  quantity: number
  product?: CeramicProduct
}

export interface Promotion {
  id: string
  product_id: string | null
  bundle_id: string | null
  discount_type: 'percentage' | 'fixed_price'
  discount_value: number
  starts_at: string
  ends_at: string
}

export interface CartItem {
  productId: string
  name: string
  category: string | null
  quantity: number
  m2?: number
  boxes?: number
  unitPrice: number
  total: number
  image?: string
}

export interface CommerceContext {
  products?: CeramicProduct[]
  bundles?: Bundle[]
  activePromotion?: Promotion
  customer?: {
    name: string
    totalOrders: number
    phone?: string
  }
  state: string
}
