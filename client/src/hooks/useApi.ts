import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

// Auth
export const useLogin = () => {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post('/auth/login', data).then(r => r.data),
  })
}

export const useRegister = () => {
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post('/auth/register', data).then(r => r.data),
  })
}

// Dashboard
export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/stock/dashboard').then(r => r.data),
  })

// Products
export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => r.data),
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/products', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.put(`/products/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Receipts
export const useReceipts = () =>
  useQuery({
    queryKey: ['receipts'],
    queryFn: () => api.get('/receipts').then(r => r.data),
  })

export const useCreateReceipt = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/receipts', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateReceipt = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/receipts/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateReceiptStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/receipts/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Deliveries
export const useDeliveries = () =>
  useQuery({
    queryKey: ['deliveries'],
    queryFn: () => api.get('/deliveries').then(r => r.data),
  })

export const useCreateDelivery = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/deliveries', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateDelivery = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/deliveries/${id}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export const useUpdateDeliveryStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/deliveries/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliveries'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Transfers
export const useTransfers = () =>
  useQuery({
    queryKey: ['transfers'],
    queryFn: () => api.get('/transfers').then(r => r.data),
  })

export const useCreateTransfer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/transfers', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Issue A fix: expose status transitions for transfers
export const useUpdateTransferStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/transfers/${id}/status`, { status }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transfers'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Stock
export const useStock = () =>
  useQuery({
    queryKey: ['stock'],
    queryFn: () => api.get('/stock').then(r => r.data),
  })

export const useLowStock = () =>
  useQuery({
    queryKey: ['stock', 'low'],
    queryFn: () => api.get('/stock/low').then(r => r.data),
  })

export const useStockHistory = (limit = 50) =>
  useQuery({
    queryKey: ['stock', 'history', limit],
    queryFn: () => api.get(`/stock/history?limit=${limit}`).then(r => r.data),
  })

// Warehouses
export const useWarehouses = () =>
  useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then(r => r.data),
  })

export const useCreateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; address?: string }) =>
      api.post('/warehouses', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

// Suppliers
export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  })

export const useCreateSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/suppliers', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

// Categories
export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data),
  })

// Bug #3 fix: Units of Measure
export const useUnits = () =>
  useQuery({
    queryKey: ['units'],
    queryFn: () => api.get('/units').then(r => r.data),
  })

export const useCreateUnit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { unitName: string; symbol: string }) =>
      api.post('/units', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['units'] }),
  })
}

// Bug #4 fix: Adjustments
export const useAdjustments = () =>
  useQuery({
    queryKey: ['adjustments'],
    queryFn: () => api.get('/adjustments').then(r => r.data),
  })

export const useCreateAdjustment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post('/adjustments', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adjustments'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// Bug #10 fix: Create Location under a Warehouse
export const useCreateLocation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ warehouseId, locationCode, description }: { warehouseId: number; locationCode: string; description?: string }) =>
      api.post(`/warehouses/${warehouseId}/locations`, { locationCode, description }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

