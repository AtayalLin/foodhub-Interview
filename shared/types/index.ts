export interface User {
  id: number
  email: string
  name: string
  phone: string
  address: string
}

export interface Restaurant {
  id: number
  name: string
  cuisine: string
  emoji: string
  rating: number
  delivery_minutes: number
  intro: string
}

export interface Product {
  id: number
  restaurant_id: number
  category: string
  name: string
  description: string
  emoji: string
  price: number
  stock: number | null
  is_veg: number
  is_spicy: number
}

export interface CartItem {
  productId: number
  restaurantId: number
  name: string
  emoji: string
  unitPrice: number
  qty: number
}

export interface OrderItem {
  id: number
  product_id: number
  name: string
  qty: number
  unit_price: number
}

export interface Order {
  id: number
  user_id: number
  total: number
  address: string
  phone: string
  status: string
  created_at: string
  items: OrderItem[]
}
