'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import {
  Search,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  RefreshCcw,
  ImageOff,
} from 'lucide-react'
import { fetchMerchandise, createMerchandise, updateMerchandise, deleteMerchandise } from '@/lib/api'

type MerchandiseItem = {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  image_url?: string
}

type ProductFormState = {
  name: string
  description: string
  price: string
  stock: string
  image_url: string
}

function LoadingTableShell() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-muted animate-pulse" />
        ))}
      </div>
    </Card>
  )
}

export default function MerchandiseManagement() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [merchandise, setMerchandise] = useState<MerchandiseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const [newProduct, setNewProduct] = useState<ProductFormState>({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
  })

  const [editItem, setEditItem] = useState<MerchandiseItem | null>(null)
  const [editState, setEditState] = useState<ProductFormState>({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchMerchandise()
      setMerchandise(Array.isArray(data) ? (data as MerchandiseItem[]) : [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load merchandise')
      setMerchandise([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return merchandise
    return merchandise.filter((item) => {
      const hay = `${item.name} ${item.id}`.toLowerCase()
      return hay.includes(q)
    })
  }, [merchandise, searchTerm])

  const totalStock = useMemo(
    () => merchandise.reduce((sum, item) => sum + (Number(item.stock) || 0), 0),
    [merchandise]
  )
  const totalProducts = merchandise.length
  const avgPrice = useMemo(() => {
    if (merchandise.length === 0) return 0
    const total = merchandise.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
    return total / merchandise.length
  }, [merchandise])

  const canAdd =
    newProduct.name.trim() && Number.isFinite(Number(newProduct.price)) && Number.isFinite(Number(newProduct.stock))

  const resetForm = () => {
    setNewProduct({ name: '', description: '', price: '', stock: '', image_url: '' })
  }

  const handleAddProduct = async () => {
    if (!token) {
      alert('Please sign in as admin to add products.')
      return
    }
    if (!canAdd) {
      alert('Please enter a name, price, and stock.')
      return
    }

    try {
      await createMerchandise(
        {
          name: newProduct.name.trim(),
          description: newProduct.description.trim(),
          price: Number(newProduct.price),
          stock: Number(newProduct.stock),
          image_url: newProduct.image_url.trim(),
        },
        token
      )

      resetForm()
      setShowAddForm(false)
      await load()
    } catch (err) {
      alert('Failed to add product: ' + (err as Error).message)
    }
  }

  const openEdit = (item: MerchandiseItem) => {
    setEditItem(item)
    setEditState({
      name: item.name ?? '',
      description: item.description ?? '',
      price: String(item.price ?? ''),
      stock: String(item.stock ?? ''),
      image_url: item.image_url ?? '',
    })
  }

  const canSaveEdit =
    editState.name.trim() &&
    Number.isFinite(Number(editState.price)) &&
    Number.isFinite(Number(editState.stock))

  const handleSaveEdit = async () => {
    if (!token) {
      alert('Please sign in as admin to edit products.')
      return
    }
    if (!editItem) return
    if (!canSaveEdit) {
      alert('Please enter a name, price, and stock.')
      return
    }

    try {
      setSavingEdit(true)
      await updateMerchandise(
        editItem.id,
        {
          name: editState.name.trim(),
          description: editState.description.trim(),
          price: Number(editState.price),
          stock: Number(editState.stock),
          image_url: editState.image_url.trim(),
        },
        token
      )

      setEditItem(null)
      await load()
    } catch (err) {
      alert('Failed to update product: ' + (err as Error).message)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (item: MerchandiseItem) => {
    if (!token) {
      alert('Please sign in as admin to delete products.')
      return
    }

    const ok = window.confirm(`Delete "${item.name}"? This cannot be undone.`)
    if (!ok) return

    try {
      setDeletingId(item.id)
      await deleteMerchandise(item.id, token)
      await load()
    } catch (err) {
      alert('Failed to delete product: ' + (err as Error).message)
    } finally {
      setDeletingId(null)
    }
  }

  const hasActiveFilters = Boolean(searchTerm.trim())
  const clearFilters = () => setSearchTerm('')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Merchandise</h1>
          <p className="mt-2 text-muted-foreground">Manage products and inventory</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} className="gap-2" disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Products</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{totalProducts}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{totalStock}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Price</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{avgPrice.toLocaleString()} KES</p>
            </div>
            {/* <div className="rounded-lg bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div> */}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear
          </Button>
        </div>

        <div className="mt-3 text-sm text-foreground/60">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{' '}
          <span className="font-medium text-foreground">{merchandise.length}</span>
        </div>
      </Card>

      {/* Error */}
      {!loading && error && (
        <Card className="p-6 border border-destructive/30">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <LoadingTableShell />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-left font-semibold text-foreground">ID</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Product</th>
                  <th className="px-6 py-4 text-right font-semibold text-foreground">Price</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">Stock</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Image</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-6 py-4 text-foreground/70 font-mono text-xs">{item.id}</td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-foreground">
                      {Number(item.price).toLocaleString()} KES
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-0.5 rounded text-xs font-medium',
                          item.stock === 0
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                        )}
                      >
                        {item.stock}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-12 w-12 rounded object-cover border border-border"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" title="Edit" onClick={() => openEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <RefreshCcw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No products match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog
        open={showAddForm}
        onOpenChange={(open) => {
          setShowAddForm(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Enter product description"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (KES)</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  placeholder="e.g. 1500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  placeholder="e.g. 20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={newProduct.image_url}
                onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                placeholder="https://..."
              />
              
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct} disabled={!canAdd}>
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={Boolean(editItem)} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Product Name</Label>
              <Input
                id="edit_name"
                value={editState.name}
                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editState.description}
                onChange={(e) => setEditState({ ...editState, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit_price">Price (KES)</Label>
                <Input
                  id="edit_price"
                  type="number"
                  value={editState.price}
                  onChange={(e) => setEditState({ ...editState, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_stock">Stock</Label>
                <Input
                  id="edit_stock"
                  type="number"
                  value={editState.stock}
                  onChange={(e) => setEditState({ ...editState, stock: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_image_url">Image URL</Label>
              <Input
                id="edit_image_url"
                value={editState.image_url}
                onChange={(e) => setEditState({ ...editState, image_url: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditItem(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!canSaveEdit || savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
