import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, TrendingUp, TrendingDown, Wallet, FileText, ArrowLeft } from "lucide-react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Booking {
    _id: string
    shortId: string
    customerName: string
    totalCost: number
    amountPaid: number
    remainingBalance: number
    createdAt: string
    status: string
    products: any[]
}

interface Expense {
    _id: string
    head: string
    category?: string
    amount: number
    description?: string
    createdAt?: string
    date?: string
}

interface BalanceSheetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function BalanceSheetDialog({ open, onOpenChange }: BalanceSheetDialogProps) {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState("daily") // 'daily', 'weekly', 'monthly'

    const [selectedItem, setSelectedItem] = useState<{ type: 'booking' | 'expense', data: any } | null>(null)

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open, period]) // Exhaustive deps warning suppressed intentionally because fetchData relies on `period` which is in deps

    const fetchData = async () => {
        setLoading(true)
        try {
            const today = new Date()
            let startDate: Date
            let endDate: Date

            if (period === "daily") {
                startDate = startOfDay(today)
                endDate = endOfDay(today)
            } else if (period === "weekly") {
                startDate = startOfWeek(today, { weekStartsOn: 1 })
                endDate = endOfWeek(today, { weekStartsOn: 1 })
            } else {
                startDate = startOfMonth(today)
                endDate = endOfMonth(today)
            }

            const startDateStr = startDate.toISOString()
            const endDateStr = endDate.toISOString()

            const [bookingsRes, expensesRes] = await Promise.all([
                apiClient.get(`/api/bookings/my?startDate=${startDateStr}&endDate=${endDateStr}`),
                apiClient.get(`/api/expenses?startDate=${startDateStr}&endDate=${endDateStr}`)
            ])

            setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : [])

            const expData = expensesRes.data.expenses || expensesRes.data
            setExpenses(Array.isArray(expData) ? expData : [])

            setSelectedItem(null)
        } catch (error) {
            console.error("Error fetching balance sheet data:", error)
        } finally {
            setLoading(false)
        }
    }

    const totalIncome = bookings.reduce((sum, b) => sum + (b.totalCost || 0), 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const netBalance = totalIncome - totalExpenses

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[90vw] w-[90vw] h-[95vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden">
                <DialogHeader className="px-8 py-5 border-b bg-muted/30 shrink-0 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-3xl font-bold tracking-tight">Balance Sheet</DialogTitle>
                        <p className="text-muted-foreground mt-1 text-sm">Official Accounting Statement</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Controls */}
                    <div className="px-8 py-4 border-b flex justify-between items-center bg-card shrink-0">
                        <Tabs value={period} onValueChange={setPeriod} className="w-[400px]">
                            <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 rounded-lg p-1">
                                <TabsTrigger value="daily" className="text-base rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Daily</TabsTrigger>
                                <TabsTrigger value="weekly" className="text-base rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Weekly</TabsTrigger>
                                <TabsTrigger value="monthly" className="text-base rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Monthly</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* High-level summary pills */}
                        <div className="flex gap-4">
                            <div className="px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold text-lg">${totalIncome.toFixed(2)}</span>
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" />
                                <span className="font-semibold text-lg">${totalExpenses.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto w-full p-8 bg-muted/10">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="animate-spin text-primary rounded-full h-8 w-8 border-b-2 border-primary"></span>
                            </div>
                        ) : selectedItem ? (
                            <div className="bg-card border rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
                                <Button variant="ghost" className="mb-6 -ml-4" onClick={() => setSelectedItem(null)}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ledger
                                </Button>
                                <h3 className="text-2xl font-bold mb-6 pb-4 border-b flex items-center gap-2">
                                    <FileText className="h-6 w-6" />
                                    {selectedItem.type === 'booking' ? 'Income Detail (Booking)' : 'Expense Detail'}
                                </h3>
                                
                                {selectedItem.type === 'booking' ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-y-4 text-base">
                                            <div className="text-muted-foreground font-medium">Invoice No:</div>
                                            <div className="font-semibold">{selectedItem.data.shortId}</div>
                                            <div className="text-muted-foreground font-medium">Customer:</div>
                                            <div className="font-semibold">{selectedItem.data.customerName}</div>
                                            <div className="text-muted-foreground font-medium">Date:</div>
                                            <div>{format(new Date(selectedItem.data.createdAt), "MMM dd, yyyy HH:mm")}</div>
                                            <div className="text-muted-foreground font-medium my-4 border-t pt-4">Total Amount:</div>
                                            <div className="font-bold text-green-600 text-lg my-4 border-t pt-4">${selectedItem.data.totalCost?.toFixed(2)}</div>
                                            <div className="text-muted-foreground font-medium">Amount Paid:</div>
                                            <div className="font-semibold">${selectedItem.data.amountPaid?.toFixed(2)}</div>
                                            <div className="text-muted-foreground font-medium">Outstanding Balance:</div>
                                            <div className="font-semibold text-red-500">${selectedItem.data.remainingBalance?.toFixed(2)}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-y-4 text-base">
                                            <div className="text-muted-foreground font-medium">Category / Head:</div>
                                            <div className="font-semibold">{selectedItem.data.head}</div>
                                            <div className="text-muted-foreground font-medium">Subcategory:</div>
                                            <div className="font-semibold">{selectedItem.data.category || "-"}</div>
                                            <div className="text-muted-foreground font-medium">Date:</div>
                                            <div>{format(new Date(selectedItem.data.createdAt || selectedItem.data.date), "MMM dd, yyyy")}</div>
                                            <div className="text-muted-foreground font-medium">Description:</div>
                                            <div className="italic text-muted-foreground">{selectedItem.data.description || "N/A"}</div>
                                            <div className="text-muted-foreground font-medium my-4 border-t pt-4">Amount:</div>
                                            <div className="font-bold text-red-600 text-lg my-4 border-t pt-4">${selectedItem.data.amount?.toFixed(2)}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-7xl mx-auto">
                                {/* Accounting Ledger View */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-2 rounded-xl overflow-hidden shadow-sm bg-card mb-8">
                                    
                                    {/* Left Column: INCOME */}
                                    <div className="border-r-2 flex flex-col h-[500px]">
                                        <div className="bg-green-50 dark:bg-green-950/30 p-4 border-b-2">
                                            <h2 className="text-xl font-bold text-green-800 dark:text-green-300 text-center tracking-widest uppercase">Income (Credit)</h2>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50 sticky top-0">
                                                    <TableRow>
                                                        <TableHead className="font-bold w-[120px]">Date</TableHead>
                                                        <TableHead className="font-bold">Particulars</TableHead>
                                                        <TableHead className="font-bold text-right w-[150px]">Amount ($)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {bookings.map(b => (
                                                        <TableRow key={b._id} className="cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-900/10" onClick={() => setSelectedItem({ type: 'booking', data: b })}>
                                                            <TableCell className="text-muted-foreground text-sm">{format(new Date(b.createdAt), 'MM/dd/yyyy')}</TableCell>
                                                            <TableCell>
                                                                <div className="font-medium text-foreground">{b.customerName}</div>
                                                                <div className="text-xs text-muted-foreground">ID: {b.shortId}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-green-600 font-semibold">{(b.totalCost || 0).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {bookings.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">No income records found for this period</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div className="bg-muted p-4 border-t-2 flex justify-between items-center shrink-0">
                                            <span className="font-bold text-lg uppercase text-muted-foreground">Total Income</span>
                                            <span className="font-bold text-2xl text-green-600">${totalIncome.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Right Column: EXPENSES */}
                                    <div className="flex flex-col h-[500px]">
                                        <div className="bg-red-50 dark:bg-red-950/30 p-4 border-b-2">
                                            <h2 className="text-xl font-bold text-red-800 dark:text-red-300 text-center tracking-widest uppercase">Expenses (Debit)</h2>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <Table>
                                                <TableHeader className="bg-muted/50 sticky top-0">
                                                    <TableRow>
                                                        <TableHead className="font-bold w-[120px]">Date</TableHead>
                                                        <TableHead className="font-bold">Particulars</TableHead>
                                                        <TableHead className="font-bold text-right w-[150px]">Amount ($)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {expenses.map(e => (
                                                        <TableRow key={e._id} className="cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-900/10" onClick={() => setSelectedItem({ type: 'expense', data: e })}>
                                                            <TableCell className="text-muted-foreground text-sm">{format(new Date(e.createdAt || e.date || new Date()), 'MM/dd/yyyy')}</TableCell>
                                                            <TableCell>
                                                                <div className="font-medium text-foreground">{e.head}</div>
                                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{e.description || e.category || 'No description'}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-red-600 font-semibold">{(e.amount || 0).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {expenses.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">No expense records found for this period</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <div className="bg-muted p-4 border-t-2 flex justify-between items-center shrink-0">
                                            <span className="font-bold text-lg uppercase text-muted-foreground">Total Expenses</span>
                                            <span className="font-bold text-2xl text-red-600">${totalExpenses.toFixed(2)}</span>
                                        </div>
                                    </div>

                                </div>

                                {/* Bottom Line / Net Balance */}
                                <div className={`border-2 rounded-2xl p-6 shadow-sm flex items-center justify-between ${netBalance >= 0 ? 'bg-green-100/50 border-green-200 dark:bg-green-950/20 dark:border-green-900' : 'bg-red-100/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-full ${netBalance >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            <Wallet className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-foreground">Net Closing Balance</h4>
                                            <p className="text-sm text-muted-foreground">Income minus Expenses</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-4xl font-black ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}
                                        </div>
                                        <div className={`text-sm font-semibold mt-1 ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            {netBalance >= 0 ? 'PROFIT' : 'LOSS'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
