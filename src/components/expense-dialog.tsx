import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Edit2, Search, X, Receipt, TrendingUp, CalendarDays, PlusCircle, Tag } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ---- Types ----
interface ExpenseCategory {
    _id: string
    head: string
    subcategories: string[]
}

interface Expense {
    _id: string
    head: string
    category?: string
    amount: number
    description?: string
    createdAt?: string
}

interface ExpenseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExpenseDialog({ open, onOpenChange }: ExpenseDialogProps) {

    // ---- Data ----
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [categories, setCategories] = useState<ExpenseCategory[]>([])

    // ---- UI State ----
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("add-expense")
    const [editingId, setEditingId] = useState<string | null>(null)

    // ---- Add Expense Form ----
    const [selectedHead, setSelectedHead] = useState("")
    const [selectedSubcategory, setSelectedSubcategory] = useState("")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")

    // ---- Create Category Form ----
    const [newHead, setNewHead] = useState("")
    const [newSubcategory, setNewSubcategory] = useState("")

    // Load on open
    useEffect(() => {
        if (open) {
            fetchAll()
            resetTab()
        }
    }, [open])

    const fetchAll = async () => {
        try {
            const [expRes, catRes] = await Promise.all([
                apiClient.get('/api/expenses'),
                apiClient.get('/api/expenses/categories')
            ])
            const expData = expRes.data.expenses || expRes.data
            setExpenses(Array.isArray(expData) ? expData : [])
            setCategories(Array.isArray(catRes.data) ? catRes.data : [])
        } catch (err) {
            console.error('Error fetching expense data:', err)
        }
    }

    const resetTab = () => {
        setError("")
        setSuccess("")
        setSelectedHead("")
        setSelectedSubcategory("")
        setAmount("")
        setDescription("")
        setEditingId(null)
        setNewHead("")
        setNewSubcategory("")
    }

    // ---- Subcategories for selected head ----
    const subcategories = categories.find(c => c.head === selectedHead)?.subcategories || []

    // ---- Create Category Handler ----
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newHead.trim() || !newSubcategory.trim()) {
            setError("Both category and subcategory names are required.")
            return
        }
        setLoading(true)
        setError("")
        setSuccess("")
        try {
            await apiClient.post('/api/expenses/categories', {
                head: newHead.trim(),
                subcategory: newSubcategory.trim()
            })
            setSuccess(`✓ Subcategory "${newSubcategory.trim()}" added under "${newHead.trim()}"`)
            setNewHead("")
            setNewSubcategory("")
            await fetchAll()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error creating category')
        } finally {
            setLoading(false)
        }
    }

    // ---- Add / Edit Expense Handler ----
    const handleSubmitExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedHead) { setError("Please select a category."); return }
        if (!selectedSubcategory) { setError("Please select a subcategory."); return }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError("Please enter a valid amount."); return }

        setLoading(true)
        setError("")
        try {
            const payload = {
                type: 'expense',
                head: selectedHead,
                category: selectedSubcategory,
                amount: parseFloat(amount),
                description: description.trim() || undefined
            }
            if (editingId) {
                await apiClient.put(`/api/expenses/${editingId}`, payload)
            } else {
                await apiClient.post('/api/expenses', payload)
            }
            await fetchAll()
            setSelectedHead("")
            setSelectedSubcategory("")
            setAmount("")
            setDescription("")
            setEditingId(null)
            setError("")
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving expense')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (expense: Expense) => {
        setActiveTab("add-expense")
        setEditingId(expense._id)
        setSelectedHead(expense.head)
        setSelectedSubcategory(expense.category || "")
        setAmount(expense.amount.toString())
        setDescription(expense.description || "")
        setError("")
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this expense?')) return
        try {
            await apiClient.delete(`/api/expenses/${id}`)
            await fetchAll()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error deleting expense')
        }
    }

    // ---- Display Metrics ----
    const realExpenses = expenses.filter(e => e.amount > 0)
    const filteredExpenses = realExpenses.filter(e => {
        const s = `${e.head} ${e.category || ''} ${e.description || ''}`.toLowerCase()
        return s.includes(searchQuery.toLowerCase())
    })
    const totalExpenses = realExpenses.reduce((sum, e) => sum + e.amount, 0)
    const now = new Date()
    const thisMonthTotal = realExpenses
        .filter(e => {
            const d = new Date(e.createdAt || '')
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        })
        .reduce((sum, e) => sum + e.amount, 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] w-[85vw] h-[90vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden">

                {/* ── Header ── */}
                <DialogHeader className="px-8 py-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-3xl font-bold">Expense Management</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                {/* ── Summary Bar ── */}
                <div className="px-8 py-4 border-b bg-muted/20 flex flex-wrap gap-8 shrink-0 justify-center">
                    <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                        <div className="bg-primary/10 p-3 rounded-full"><Receipt className="h-6 w-6 text-primary" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                            <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                        <div className="bg-orange-500/10 p-3 rounded-full"><TrendingUp className="h-6 w-6 text-orange-500" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">This Month</p>
                            <p className="text-2xl font-bold text-orange-600">${thisMonthTotal.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                        <div className="bg-blue-500/10 p-3 rounded-full"><CalendarDays className="h-6 w-6 text-blue-500" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Entries</p>
                            <p className="text-2xl font-bold">{realExpenses.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                        <div className="bg-purple-500/10 p-3 rounded-full"><Tag className="h-6 w-6 text-purple-500" /></div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Categories</p>
                            <p className="text-2xl font-bold">{categories.length}</p>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-8 flex flex-col gap-8">

                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(""); setSuccess("") }} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-14 bg-muted/50 rounded-xl p-1 mb-6">
                            <TabsTrigger value="add-expense" className="text-base rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <PlusCircle className="h-4 w-4" />
                                {editingId ? 'Edit Expense' : 'Add Today Expense'}
                            </TabsTrigger>
                            <TabsTrigger value="create-category" className="text-base rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Manage Categories
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Error / Success ── */}
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription className="text-base">{error}</AlertDescription>
                            </Alert>
                        )}
                        {success && (
                            <Alert className="mb-4 border-green-500/30 bg-green-500/10">
                                <AlertDescription className="text-base text-green-600">{success}</AlertDescription>
                            </Alert>
                        )}

                        {/* ══════════════════════════════════════
                            TAB 1 — Add Today Expense
                        ══════════════════════════════════════ */}
                        <TabsContent value="add-expense" className="mt-0">
                            <div className="bg-card rounded-xl border shadow-sm p-8">
                                <h2 className="text-2xl font-semibold mb-2">
                                    {editingId ? 'Edit Expense' : 'Add New Expense'}
                                </h2>
                                <p className="text-muted-foreground mb-6 text-sm">
                                    Select a category and subcategory, enter the amount, and optionally add a note.
                                </p>

                                {categories.length === 0 ? (
                                    <div className="text-center py-10 border-2 border-dashed rounded-xl">
                                        <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                                        <p className="text-lg font-semibold">No categories yet</p>
                                        <p className="text-muted-foreground mb-4">Go to "Manage Categories" to create your first category.</p>
                                        <Button variant="outline" onClick={() => setActiveTab("create-category")}>
                                            Create a Category
                                        </Button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitExpense} className="space-y-6">
                                        {/* Category + Subcategory row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Category *</Label>
                                                <Select
                                                    value={selectedHead}
                                                    onValueChange={(val) => { setSelectedHead(val); setSelectedSubcategory("") }}
                                                >
                                                    <SelectTrigger className="h-12 text-base">
                                                        <SelectValue placeholder="Pick a category..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map(cat => (
                                                            <SelectItem key={cat._id} value={cat.head} className="text-base py-3">
                                                                {cat.head}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Subcategory *</Label>
                                                <Select
                                                    value={selectedSubcategory}
                                                    onValueChange={setSelectedSubcategory}
                                                    disabled={!selectedHead}
                                                >
                                                    <SelectTrigger className="h-12 text-base">
                                                        <SelectValue placeholder={selectedHead ? "Pick a subcategory..." : "Select category first"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {subcategories.length === 0 ? (
                                                            <div className="p-3 text-sm text-muted-foreground">No subcategories. Add one in "Manage Categories".</div>
                                                        ) : (
                                                            subcategories.map(sub => (
                                                                <SelectItem key={sub} value={sub} className="text-base py-3">{sub}</SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Amount + Description row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Amount ($) *</Label>
                                                <Input
                                                    className="h-12 text-base font-semibold"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-base font-medium">Note (Optional)</Label>
                                                <Input
                                                    className="h-12 text-base"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="e.g. Monthly electric bill"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t flex gap-4">
                                            <Button type="submit" disabled={loading} className="flex-1 h-14 text-lg font-medium">
                                                {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Log Expense'}
                                            </Button>
                                            {editingId && (
                                                <Button type="button" variant="outline" onClick={() => { resetTab() }} className="h-14 px-8 text-base">
                                                    Cancel Edit
                                                </Button>
                                            )}
                                        </div>
                                    </form>
                                )}
                            </div>
                        </TabsContent>

                        {/* ══════════════════════════════════════
                            TAB 2 — Manage Categories
                        ══════════════════════════════════════ */}
                        <TabsContent value="create-category" className="mt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                                {/* Left: Create form */}
                                <div className="bg-card rounded-xl border shadow-sm p-8">
                                    <h2 className="text-2xl font-semibold mb-2">Add Category / Subcategory</h2>
                                    <p className="text-muted-foreground mb-6 text-sm">
                                        Type a category name and a subcategory name. If the category already exists, the subcategory will be added to it.
                                    </p>
                                    <form onSubmit={handleCreateCategory} className="space-y-6">
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">Category Name *</Label>
                                            <Input
                                                className="h-12 text-base"
                                                value={newHead}
                                                onChange={(e) => setNewHead(e.target.value)}
                                                placeholder="e.g. Utilities, Transport, Office"
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">If this category exists already, the subcategory will just be added to it.</p>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">Subcategory Name *</Label>
                                            <Input
                                                className="h-12 text-base"
                                                value={newSubcategory}
                                                onChange={(e) => setNewSubcategory(e.target.value)}
                                                placeholder="e.g. Electric Bill, Fuel, Pens"
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={loading || !newHead.trim() || !newSubcategory.trim()}
                                            className="w-full h-12 text-base font-medium"
                                        >
                                            {loading ? 'Saving...' : 'Save Category'}
                                        </Button>
                                    </form>
                                </div>

                                {/* Right: Existing categories */}
                                <div className="bg-card rounded-xl border shadow-sm p-8">
                                    <h2 className="text-2xl font-semibold mb-6">Existing Categories</h2>
                                    {categories.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">No categories yet. Create one!</p>
                                    ) : (
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                            {categories.map(cat => (
                                                <div key={cat._id} className="border rounded-lg p-4">
                                                    <p className="font-semibold text-base mb-2">{cat.head}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {cat.subcategories.map(sub => (
                                                            <span key={sub} className="text-sm bg-muted px-3 py-1 rounded-full text-muted-foreground">
                                                                {sub}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* ── Expense List ── */}
                    <div className="flex flex-col gap-6 mb-12">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-semibold">Expense Records ({realExpenses.length})</h2>
                            <div className="relative w-80">
                                <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                                <Input
                                    className="h-12 pl-12 text-base rounded-full bg-muted/50 border-transparent"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search expenses..."
                                />
                            </div>
                        </div>

                        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-base font-semibold py-4 px-6">Date</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6">Category</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6">Subcategory</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6">Note</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6 text-right">Amount</TableHead>
                                        <TableHead className="text-base font-semibold py-4 px-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-16 text-muted-foreground text-lg">
                                                No expenses found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredExpenses.map(expense => (
                                            <TableRow key={expense._id} className="text-base group">
                                                <TableCell className="py-5 px-6 text-muted-foreground whitespace-nowrap">
                                                    {expense.createdAt ? format(new Date(expense.createdAt), 'MMM dd, yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="py-5 px-6 font-semibold">{expense.head}</TableCell>
                                                <TableCell className="py-5 px-6 text-muted-foreground">{expense.category || '-'}</TableCell>
                                                <TableCell className="py-5 px-6 text-muted-foreground italic truncate max-w-[180px]">
                                                    {expense.description || '-'}
                                                </TableCell>
                                                <TableCell className="py-5 px-6 text-right font-semibold text-lg">
                                                    ${expense.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-5 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="h-10 w-10 hover:bg-muted">
                                                            <Edit2 className="h-5 w-5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(expense._id)} className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive">
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
