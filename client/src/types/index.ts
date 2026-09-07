export interface User {
  id: number
  name: string
  email: string
  role_id: number
  is_active?: boolean
}

export interface Product {
  id: number
  name: string
  sku: string
  description?: string
  category_id: number
  unit_id: number
  reorder_level: number
  product_categories?: { id: number; category_name: string }
  units_of_measure?: { id: number; unit_name: string; symbol: string }
  stock_balances?: { quantity: number; locations?: { warehouses?: { name: string } } }[]
  totalStock?: number
  created_at: string
}

export interface Category {
  id: number
  category_name: string
}

export interface UnitOfMeasure {
  id: number
  unit_name: string
  symbol: string
}

export interface Warehouse {
  id: number
  name: string
  address?: string
  locations: Location[]
}

export interface Location {
  id: number
  location_code: string
  warehouse_id: number
  warehouses?: Warehouse
}

export interface Supplier {
  id: number
  name: string
  email?: string
  phone?: string
  address?: string
}

export interface ReceiptItem {
  id: number
  product_id: number
  location_id: number
  quantity: number
  products?: Product
  locations?: Location
}

export interface Receipt {
  id: number
  reference_no: string
  warehouse_id: number
  supplier_id: number
  created_by: number
  created_at: string
  status: string
  warehouses?: Warehouse
  suppliers?: Supplier
  users?: Pick<User, 'id' | 'name'>
  receipt_items?: ReceiptItem[]
}

export interface DeliveryItem {
  id: number
  product_id: number
  location_id: number
  quantity: number
  products?: Product
  locations?: Location
}

export interface DeliveryOrder {
  id: number
  reference_no: string
  warehouse_id: number
  created_by: number
  created_at: string
  status: string
  warehouses?: Warehouse
  users?: Pick<User, 'id' | 'name'>
  delivery_items?: DeliveryItem[]
}

export interface Transfer {
  id: number
  reference_no: string
  from_warehouse: number
  to_warehouse: number
  created_at: string
  status: string
  warehouses_transfers_from_warehouseTowarehouses?: Warehouse
  warehouses_transfers_to_warehouseTowarehouses?: Warehouse
  transfer_items?: TransferItem[]
}

export interface TransferItem {
  id: number
  product_id: number
  from_location: number
  to_location: number
  quantity: number
  products?: Product
}

export interface StockBalance {
  id: number
  product_id: number
  location_id: number
  quantity: number
  products?: Product
  locations?: Location
}

export interface StockMove {
  id: number
  product_id: number
  from_location?: number
  to_location?: number
  quantity: number
  move_type: 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  reference_id?: number
  created_at: string
  products?: Product
}

export interface DashboardStats {
  totalProducts: number
  totalWarehouses: number
  totalSuppliers: number
  totalStock: number
  lowStockAlerts: number
  recentMoves: StockMove[]
  categoryStock: { category: string; total: number }[]
  movementTrend: { date: string; receipts: number; deliveries: number }[]
}
