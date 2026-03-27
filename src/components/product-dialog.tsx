import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Edit2, Search, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Product {
    _id: string
    category: string
    subcategory: string[]
    price: number
}

interface ProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ProductDialog({ open, onOpenChange }: ProductDialogProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    const [category, setCategory] = useState("")
    const [newCategory, setNewCategory] = useState("")
    const [subcategoryPath, setSubcategoryPath] = useState<string[]>([])
    const [currentSubcategoryInput, setCurrentSubcategoryInput] = useState("")
    const [price, setPrice] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            fetchProducts()
            fetchCategories()
        }
    }, [open])

    const fetchProducts = async () => {
        try {
            const response = await apiClient.get('/api/products')
            setProducts(response.data)
        } catch (err) {
            console.error('Error fetching products:', err)
        }
    }

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get('/api/products/categories')
            setCategories(response.data)
        } catch (err) {
            console.error('Error fetching categories:', err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const finalCategory = category === "new" ? newCategory : category

            if (!finalCategory) {
                setError("Please select or enter a category")
                setLoading(false)
                return
            }

            if (subcategoryPath.length === 0) {
                setError("Please add at least one subcategory level")
                setLoading(false)
                return
            }

            const productData = {
                category: finalCategory,
                subcategory: subcategoryPath,
                price: parseFloat(price)
            }

            if (editingId) {
                await apiClient.put(`/api/products/${editingId}`, productData)
            } else {
                await apiClient.post('/api/products', productData)
            }

            await fetchProducts()
            await fetchCategories()
            resetForm()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving product')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (product: Product) => {
        setEditingId(product._id)
        setCategory(product.category)
        setSubcategoryPath(product.subcategory)
        setPrice(product.price.toString())
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return
        try {
            await apiClient.delete(`/api/products/${id}`)
            await fetchProducts()
            await fetchCategories()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error deleting product')
        }
    }

    const resetForm = () => {
        setCategory("")
        setNewCategory("")
        setSubcategoryPath([])
        setCurrentSubcategoryInput("")
        setPrice("")
        setEditingId(null)
        setError("")
    }

    const addSubcategoryLevel = () => {
        if (currentSubcategoryInput.trim()) {
            setSubcategoryPath([...subcategoryPath, currentSubcategoryInput.trim()])
            setCurrentSubcategoryInput("")
        }
    }

    const removeSubcategoryLevel = (index: number) => {
        setSubcategoryPath(subcategoryPath.filter((_, i) => i !== index))
    }

    const filteredProducts = products.filter(p => {
        const subcatStr = p.subcategory.join(' ')
        return p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subcatStr.toLowerCase().includes(searchQuery.toLowerCase())
    })

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] w-[85vw] h-[90vh] rounded-2xl p-0 flex flex-col bg-background">
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-3xl font-bold">Product Management</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-8 flex flex-col gap-12">

                    {/* Top Section: Form */}
                    <div className="bg-card rounded-xl border shadow-sm p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold">
                                {editingId ? 'Edit Product' : 'Add New Product'}
                            </h2>
                            {editingId && (
                                <Button type="button" variant="outline" onClick={resetForm} className="h-10 px-4">
                                    Cancel Edit
                                </Button>
                            )}
                        </div>

                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertDescription className="text-base">{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Form Column */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-base font-medium">Category *</Label>
                                        <Select value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="h-12 text-base">
                                                <SelectValue placeholder="Select or add category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat} className="text-base py-3">{cat}</SelectItem>
                                                ))}
                                                <SelectItem value="new" className="text-base py-3 font-semibold text-primary">
                                                    + Add New Category
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {category === "new" && (
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">New Category Name *</Label>
                                            <Input
                                                className="h-12 text-base"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                placeholder="e.g., Electronics"
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <Label className="text-base font-medium">Price *</Label>
                                        <Input
                                            className="h-12 text-base"
                                            type="number"
                                            step="0.01"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Right Form Column (Subcategory Builder) */}
                                <div className="space-y-4 bg-muted/30 p-5 rounded-lg border">
                                    <div>
                                        <Label className="text-base font-medium">Subcategory Hierarchy *</Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Build the path (e.g., Shirts → Cotton)
                                        </p>
                                    </div>

                                    {subcategoryPath.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-background rounded border min-h-[50px] items-center">
                                            {subcategoryPath.map((level, index) => (
                                                <div key={index} className="flex items-center">
                                                    <Badge variant="secondary" className="text-sm py-1.5 px-3 flex items-center gap-1">
                                                        {level}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSubcategoryLevel(index)}
                                                            className="ml-1.5 hover:text-destructive text-muted-foreground"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </Badge>
                                                    {index < subcategoryPath.length - 1 && (
                                                        <span className="mx-2 text-muted-foreground">→</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <Input
                                            className="h-12 text-base flex-1"
                                            value={currentSubcategoryInput}
                                            onChange={(e) => setCurrentSubcategoryInput(e.target.value)}
                                            placeholder={`Add level ${subcategoryPath.length + 1}...`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    addSubcategoryLevel()
                                                }
                                            }}
                                        />
                                        <Button type="button" onClick={addSubcategoryLevel} variant="secondary" className="h-12 px-6 text-base">
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-medium">
                                    {editingId ? 'Save Changes' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Bottom Section: List */}
                    <div className="flex flex-col gap-6 mb-12">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold">Product Catalog ({products.length})</h2>
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    className="h-12 pl-12 text-base rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products..."
                                />
                            </div>
                        </div>

                        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-base font-semibold py-4 px-6 text-foreground">Category</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6 text-foreground">Subcategory Path</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6 text-foreground">Price</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6 text-right text-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-16 text-muted-foreground text-lg">
                                                No products found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredProducts.map(product => (
                                            <TableRow key={product._id} className="text-base group">
                                                <TableCell className="font-semibold py-5 px-6">{product.category}</TableCell>
                                                <TableCell className="py-5 px-6 text-muted-foreground">
                                                    {product.subcategory.join(' → ')}
                                                </TableCell>
                                                <TableCell className="py-5 px-6 font-medium text-lg">
                                                    ${product.price.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-5 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                                            className="h-10 w-10 hover:bg-muted"
                                                        >
                                                            <Edit2 className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }}
                                                            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
