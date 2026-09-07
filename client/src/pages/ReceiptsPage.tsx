import { useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { useReceipts, useCreateReceipt, useUpdateReceipt, useUpdateReceiptStatus, useWarehouses, useSuppliers, useProducts } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner, StatusBadge } from '../components/ui'
import { format } from 'date-fns'
import { Edit2 } from 'lucide-react'

interface LineItem {
  productId: string
  locationId: string
  quantity: string
  unitCost: string
}

// ...
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function ReceiptsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ warehouseId: '', supplierId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [items, setItems] = useState<LineItem[]>([{ productId: '', locationId: '', quantity: '', unitCost: '' }])
  const [error, setError] = useState('')

  const { data: receipts = [], isLoading } = useReceipts()
  const { data: warehouses = [] } = useWarehouses()
  const { data: suppliers = [] } = useSuppliers()
  const { data: products = [] } = useProducts()
  const { mutate: createReceipt, isPending: isCreating } = useCreateReceipt()
  const { mutate: updateReceipt, isPending: isUpdating } = useUpdateReceipt()
  const { mutate: updateStatus } = useUpdateReceiptStatus()
  
  const isPending = isCreating || isUpdating

  const selectedWarehouse = warehouses.find((w: any) => String(w.id) === form.warehouseId)
  const locations = (selectedWarehouse as any)?.locations || []

  const addItem = () => setItems(prev => [...prev, { productId: '', locationId: '', quantity: '', unitCost: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof LineItem, value: string) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const openModal = (receipt?: any) => {
    if (receipt) {
      setEditId(receipt.id)
      setForm({
        warehouseId: String(receipt.warehouse_id || ''),
        supplierId: String(receipt.supplier_id || ''),
        date: format(new Date(receipt.created_at), 'yyyy-MM-dd'),
        notes: '',
      })
      setItems(receipt.receipt_items?.map((i: any) => ({
        productId: String(i.product_id),
        locationId: String(i.location_id),
        quantity: String(i.quantity),
        unitCost: '',
      })) || [{ productId: '', locationId: '', quantity: '', unitCost: '' }])
    } else {
      setEditId(null)
      setForm({ warehouseId: String(warehouses[0]?.id || ''), supplierId: String(suppliers[0]?.id || ''), date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
      setItems([{ productId: '', locationId: '', quantity: '', unitCost: '' }])
    }
    setError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validItems = items.filter(i => i.productId && i.locationId && i.quantity)
    if (validItems.length === 0) {
      setError('Add at least one item with product, location, and quantity.')
      return
    }

    const payload = {
      warehouseId: parseInt(form.warehouseId),
      supplierId: parseInt(form.supplierId),
      date: form.date,
      notes: form.notes || undefined,
      items: validItems.map(i => ({
        productId: parseInt(i.productId),
        locationId: parseInt(i.locationId),
        quantity: parseFloat(i.quantity),
        unitCost: i.unitCost ? parseFloat(i.unitCost) : undefined,
      })),
    }

    if (editId) {
      updateReceipt({ id: editId, ...payload }, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to update receipt'),
      })
    } else {
      createReceipt(payload, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to create receipt'),
      })
    }
  }

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus({ id, status: newStatus })
  }

  const columns = [
    { key: 'reference_no', header: 'Reference', render: (r: any) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{r.reference_no}</span>
    )},
    { key: 'supplier', header: 'Supplier', render: (r: any) => (
      <span className="font-medium text-slate-700">{r.suppliers?.name || '—'}</span>
    )},
    { key: 'warehouse', header: 'Warehouse', render: (r: any) => r.warehouses?.name || '—' },
    { key: 'date', header: 'Date', render: (r: any) => {
      try { return format(new Date(r.created_at), 'MMM d, yyyy') } catch { return '—' }
    }},
    { key: 'items', header: 'Items', render: (r: any) => (
      <span className="badge-slate">{r.receipt_items?.length || 0} line items</span>
    )},
    { key: 'status', header: 'Status', render: (r: any) => (
      <div className="relative inline-block">
        <select
          value={r.status || 'draft'}
          onChange={(e) => handleStatusChange(r.id, e.target.value)}
          className="appearance-none bg-transparent text-xs font-medium cursor-pointer pr-5 py-0.5 rounded-full border pl-2 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-colors"
          style={{
            borderColor: r.status === 'done' ? '#a7f3d0' : r.status === 'cancelled' ? '#fecaca' : r.status === 'ready' ? '#bfdbfe' : r.status === 'waiting' ? '#fde68a' : '#e2e8f0',
            color: r.status === 'done' ? '#047857' : r.status === 'cancelled' ? '#dc2626' : r.status === 'ready' ? '#1d4ed8' : r.status === 'waiting' ? '#ca8a04' : '#475569',
            backgroundColor: r.status === 'done' ? '#ecfdf5' : r.status === 'cancelled' ? '#fef2f2' : r.status === 'ready' ? '#eff6ff' : r.status === 'waiting' ? '#fefce8' : '#f8fafc',
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-slate-400" />
      </div>
    )},
    { key: 'user', header: 'Created By', render: (r: any) => (
      <span className="text-slate-500 text-xs">{r.users?.name || '—'}</span>
    )},
    { key: 'actions', header: '', align: 'right' as const, render: (r: any) => (
      <button onClick={() => openModal(r)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-colors">
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    )},
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle="Incoming inventory from suppliers"
        action={
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus className="w-4 h-4" /> New Receipt
          </button>
        }
      />

      <DataTable
        data={receipts}
        columns={columns}
        searchKeys={['reference_no'] as any}
        emptyMessage="No receipts yet. Create your first receipt."
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Receipt" : "New Receipt"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier *</label>
              <select className="input" value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} required>
                <option value="">Select supplier</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Warehouse *</label>
              <select className="input" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))} required>
                <option value="">Select warehouse</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Line Items *</label>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">Location</th>
                    <th className="table-header w-28">Quantity</th>
                    <th className="table-header w-28">Unit Cost</th>
                    <th className="table-header w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <select className="input py-1.5" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                          <option value="">Select product</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select className="input py-1.5" value={item.locationId} onChange={e => updateItem(i, 'locationId', e.target.value)} required disabled={!form.warehouseId}>
                          <option value="">Select location</option>
                          {locations.map((l: any) => <option key={l.id} value={l.id}>{l.location_code || l.description || `Loc #${l.id}`}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5" type="number" min="0.01" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="0" required />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5" type="number" min="0" step="0.01" value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)} placeholder="0.00" />
                      </td>
                      <td className="px-3 py-2">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isPending}>
              {isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Receipt'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
