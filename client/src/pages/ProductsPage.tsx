import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useCategories } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner } from '../components/ui'
import type { Product } from '../types'

export default function ProductsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', sku: '', description: '', categoryId: '', unitId: '', reorderLevel: '0' })
  const [error, setError] = useState('')

  const { data: products = [], isLoading } = useProducts()
  const { data: categories = [] } = useCategories()
  const { mutate: createProduct, isPending: creating } = useCreateProduct()
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct()
  const { mutate: deleteProduct } = useDeleteProduct()

  // Collect unique units from products
  const unitsMap = new Map<number, { id: number; unit_name: string; symbol: string }>()
  products.forEach((p: any) => {
    if (p.units_of_measure && p.units_of_measure.id) {
      unitsMap.set(p.units_of_measure.id, p.units_of_measure)
    }
  })
  const units = Array.from(unitsMap.values())

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', sku: '', description: '', categoryId: String(categories[0]?.id || ''), unitId: String(units[0]?.id || ''), reorderLevel: '0' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (product: any) => {
    setEditing(product)
    setForm({
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      categoryId: String(product.category_id || ''),
      unitId: String(product.unit_id || ''),
      reorderLevel: String(product.reorder_level || 0),
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || undefined,
      categoryId: parseInt(form.categoryId),
      unitId: parseInt(form.unitId),
      reorderLevel: parseInt(form.reorderLevel),
    }

    if (editing) {
      updateProduct({ id: editing.id, ...payload } as any, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to update product'),
      })
    } else {
      createProduct(payload as any, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to create product'),
      })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('Delete this product? This cannot be undone.')) {
      deleteProduct(id)
    }
  }

  const columns = [
    { key: 'name', header: 'Product', sortable: true, render: (p: any) => (
      <div>
        <p className="font-medium text-slate-800">{p.name}</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{p.sku}</p>
      </div>
    )},
    { key: 'category', header: 'Category', render: (p: any) => (
      <span className="badge-slate">{p.product_categories?.category_name || '—'}</span>
    )},
    { key: 'unit', header: 'Unit', render: (p: any) => p.units_of_measure?.symbol || '—' },
    { key: 'totalStock', header: 'Stock', sortable: true, render: (p: any) => {
      const total = p.totalStock || 0
      const reorder = p.reorder_level || 0
      const isLow = total <= reorder
      return (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
            {Number(total).toLocaleString()}
          </span>
          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
        </div>
      )
    }},
    { key: 'reorder_level', header: 'Reorder At', render: (p: any) => (
      <span className="text-slate-500">{p.reorder_level || 0}</span>
    )},
    { key: 'actions', header: '', render: (p: any) => (
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )},
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={`${products.length} products in inventory`}
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Product
          </button>
        }
      />

      <DataTable
        data={products}
        columns={columns}
        searchKeys={['name', 'sku'] as any}
        emptyMessage="No products yet. Add your first product."
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'New Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Steel Bolt M8" />
            </div>
            <div>
              <label className="label">SKU *</label>
              <input className="input font-mono" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required placeholder="e.g. BOLT-M8-001" />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit of Measure *</label>
              <select className="input" value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))} required>
                <option value="">Select unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name} ({u.symbol})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Reorder Level</label>
            <input className="input" type="number" min="0" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} />
            <p className="text-xs text-slate-400 mt-1">Alert when stock falls at or below this quantity</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={creating || updating}>
              {creating || updating ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
