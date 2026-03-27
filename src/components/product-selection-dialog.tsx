import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Search, ShoppingCart, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Product {
    _id: string
    category: string
    subcategory: string[]
    price: number
}

interface SelectedProduct {
    productId: string
    category: string
    subcategory: string[]
    quantity: number
    unitPrice: number
    totalPrice: number
}

interface ProductSelectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onProductsSelected: (products: SelectedProduct[]) => void
    initialProducts?: SelectedProduct[]
}

export function ProductSelectionDialog({
    open,
    onOpenChange,
    onProductsSelected,
    initialProducts = []
}: ProductSelectionDialogProps) {
    const [products, setProducts] = useState<Product[]>([])
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(initialProducts)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedProductId, setSelectedProductId] = useState("")
    const [quantity, setQuantity] = useState("1")

    useEffect(() => {
        if (open) {
            fetchProducts()
            setSelectedProducts(initialProducts)
        }
    }, [open, initialProducts])

    const fetchProducts = async () => {
        try {
            const response = await apiClient.get('/api/products')
            const processedProducts = response.data.map((p: any) => ({
                ...p,
                subcategory: Array.isArray(p.subcategory) ? p.subcategory : [p.subcategory]
            }))
            setProducts(processedProducts)
        } catch (err) {
            console.error('Error fetching products:', err)
        }
    }

    const handleAddProduct = () => {
        const product = products.find(p => p._id === selectedProductId)
        if (!product) return

        const qty = parseInt(quantity)
        if (qty <= 0) return

        const newProduct: SelectedProduct = {
            productId: product._id,
            category: product.category,
            subcategory: product.subcategory,
            quantity: qty,
            unitPrice: product.price,
            totalPrice: product.price * qty
        }

        setSelectedProducts([...selectedProducts, newProduct])
        setSelectedProductId("")
        setQuantity("1")
    }

    const handleRemoveProduct = (index: number) => {
        setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
    }

    const handleConfirm = () => {
        onProductsSelected(selectedProducts)
        onOpenChange(false)
    }

    const filteredProducts = products.filter(p => {
        const subcatStr = p.subcategory.join(' ')
        return p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            subcatStr.toLowerCase().includes(searchQuery.toLowerCase())
    })

    const subtotal = selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] w-[85vw] h-[90vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden">
                <DialogHeader className="px-8 py-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-3xl font-bold">Select Products</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-8 flex flex-col gap-10">

                    {/* Top Panel: Add Product Form */}
                    <div className="bg-card rounded-xl border shadow-sm p-8">
                        <h2 className="text-2xl font-semibold mb-6">Add to Cart</h2>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <Label className="text-base font-medium">Search Product</Label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        className="h-12 pl-12 text-base rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-primary transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Type category or product..."
                                    />
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4 space-y-3">
                                <Label className="text-base font-medium">Select Product *</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger className="h-12 text-base">
                                        <SelectValue placeholder="Choose a product..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {filteredProducts.map(product => (
                                            <SelectItem key={product._id} value={product._id} className="py-3 text-base">
                                                <span className="font-medium">{product.category}</span>
                                                <span className="mx-2 text-muted-foreground">→</span>
                                                <span className="text-muted-foreground">{product.subcategory.join(' → ')}</span>
                                                <span className="ml-3 font-bold text-primary">${product.price.toFixed(2)}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-12 md:col-span-2 space-y-3">
                                <Label className="text-base font-medium">Quantity *</Label>
                                <Input
                                    className="h-12 text-base font-semibold text-center"
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-2">
                                <Button
                                    onClick={handleAddProduct}
                                    disabled={!selectedProductId}
                                    className="h-12 text-base w-full font-semibold"
                                >
                                    Add Items
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-dashed my-2"></div>

                    {/* Bottom Panel: Cart */}
                    <div className="flex flex-col flex-1 pb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="h-7 w-7 text-primary" />
                                <h2 className="text-2xl font-semibold">Shopping Cart ({selectedProducts.length})</h2>
                            </div>
                            <div className="bg-primary/10 px-6 py-3 rounded-xl border border-primary/20">
                                <span className="text-lg text-primary mr-3">Subtotal:</span>
                                <span className="text-2xl font-bold text-foreground">${subtotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="border rounded-xl bg-card shadow-sm flex-1 min-h-[300px] flex flex-col overflow-hidden">
                            {selectedProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 py-20 text-muted-foreground">
                                    <div className="bg-muted p-6 rounded-full mb-6">
                                        <ShoppingCart className="h-12 w-12 opacity-50" />
                                    </div>
                                    <p className="text-xl font-medium text-foreground mb-2">Your cart is empty</p>
                                    <p className="text-base">Select products from the section above to add them here.</p>
                                </div>
                            ) : (
                                <div className="overflow-y-auto flex-1">
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-base font-semibold py-4 px-6 text-foreground">Product Details</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-center text-foreground w-32">Qty</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-right text-foreground w-40">Unit Price</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-right text-foreground w-40">Total</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-right text-foreground w-24">Remove</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedProducts.map((product, index) => (
                                                <TableRow key={index} className="text-base group">
                                                    <TableCell className="py-5 px-6">
                                                        <div className="font-bold text-lg">{product.category}</div>
                                                        <div className="text-muted-foreground mt-1">
                                                            {product.subcategory.join(' → ')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-6 text-center">
                                                        <span className="inline-flex items-center justify-center bg-muted h-10 w-12 rounded-md font-bold text-lg">
                                                            {product.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-5 px-6 text-right text-muted-foreground font-medium text-lg">
                                                        ${product.unitPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="py-5 px-6 text-right font-bold text-lg">
                                                        ${product.totalPrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="py-5 px-6 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveProduct(index)}
                                                            className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity ml-auto"
                                                            title="Remove From Cart"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer actions */}
                        <div className="sticky bottom-0 bg-background/80 backdrop-blur pt-6 mt-6 flex gap-4 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-14 px-8 text-lg font-medium"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                className="h-14 px-12 text-lg font-bold"
                                disabled={selectedProducts.length === 0}
                            >
                                Confirm Selection ({selectedProducts.length} items)
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
