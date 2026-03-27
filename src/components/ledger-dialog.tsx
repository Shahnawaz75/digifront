import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Search, X, Users, Wallet, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { format } from "date-fns"

interface BookingProduct {
    category: string
    subcategory?: string[]
    quantity: number
    unitPrice: number
    totalPrice: number
}

interface BookingHistory {
    _id: string
    shortId: string
    customerName: string
    totalCost: number
    amountPaid: number
    remainingBalance: number
    createdAt: string
    jobDescription?: string
    departments?: string[]
    materialConsume?: string
    materialDetails?: string
    materialCost?: number
    cuttingCost?: number
    discount?: number
    paymentMethod?: string
    paymentStatus?: string
    products?: BookingProduct[]
    productSubtotal?: number
    urgency?: string
    status?: string
    bookerId?: { name: string }
}

interface LedgerCustomer {
    _id: string
    name: string
    phone: string
    totalBalance: number
    bookingHistory?: BookingHistory[]
}

interface LedgerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LedgerDialog({ open, onOpenChange }: LedgerDialogProps) {
    const [customers, setCustomers] = useState<LedgerCustomer[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    const [name, setName] = useState("")
    const [phone, setPhone] = useState("")

    const [selectedCustomer, setSelectedCustomer] = useState<LedgerCustomer | null>(null)
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)

    // Payment update state
    const [editingPayment, setEditingPayment] = useState<string | null>(null)
    const [newPaidAmount, setNewPaidAmount] = useState("")
    const [paymentLoading, setPaymentLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetchCustomers()
            setSelectedCustomer(null)
            setExpandedBookingId(null)
            setName("")
            setPhone("")
            setError("")
        }
    }, [open])

    const fetchCustomers = async () => {
        try {
            const response = await apiClient.get('/api/ledger')
            setCustomers(response.data)
        } catch (err) {
            console.error('Error fetching ledger customers:', err)
        }
    }

    const fetchCustomerDetails = async (id: string) => {
        setLoading(true)
        try {
            const response = await apiClient.get(`/api/ledger/${id}`)
            setSelectedCustomer(response.data)
            setExpandedBookingId(null)
        } catch (err) {
            console.error('Error fetching customer details:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        try {
            await apiClient.post('/api/ledger', { name, phone })
            await fetchCustomers()
            setName("")
            setPhone("")
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error saving customer')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return
        try {
            await apiClient.delete(`/api/ledger/${id}`)
            await fetchCustomers()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error deleting customer')
        }
    }

    const handleUpdatePayment = async (bookingId: string) => {
        if (!newPaidAmount || isNaN(Number(newPaidAmount))) return
        setPaymentLoading(true)
        try {
            await apiClient.put(`/api/bookings/${bookingId}/payment`, {
                amountPaid: Number(newPaidAmount)
            })
            // Refresh customer details
            if (selectedCustomer) {
                await fetchCustomerDetails(selectedCustomer._id)
            }
            await fetchCustomers()
            setEditingPayment(null)
            setNewPaidAmount("")
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating payment')
        } finally {
            setPaymentLoading(false)
        }
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    )

    const totalOutstanding = customers.reduce((sum, c) => sum + (c.totalBalance || 0), 0)

    const getStatusChip = (status: string) => {
        const colors: Record<string, string> = {
            paid: 'bg-green-100 text-green-700 border-green-200',
            partial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            unpaid: 'bg-red-100 text-red-700 border-red-200',
        }
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${colors[status] || 'bg-muted text-muted-foreground'}`}>
                {status}
            </span>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] w-[85vw] h-[90vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden">
                <DialogHeader className="px-8 py-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-3xl font-bold">
                        {selectedCustomer ? (
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedCustomer(null)} className="h-9 w-9">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                {selectedCustomer.name}
                            </div>
                        ) : "Ledger Management"}
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                {/* Summary Bar */}
                <div className="px-8 py-4 border-b bg-muted/20 flex flex-wrap gap-8 shrink-0 justify-center">
                    {selectedCustomer ? (
                        <>
                            {/* Customer-specific summary */}
                            {(() => {
                                const bookings = selectedCustomer.bookingHistory || []
                                const grandTotal = bookings.reduce((s, b) => s + (b.totalCost || 0), 0)
                                const grandPaid = bookings.reduce((s, b) => s + (b.amountPaid || 0), 0)
                                const grandUnpaid = bookings.reduce((s, b) => s + (b.remainingBalance || 0), 0)
                                return (
                                    <>
                                        <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                            <div><p className="text-sm text-muted-foreground">Total Booked</p><p className="text-2xl font-bold">${grandTotal.toFixed(2)}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                            <div><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-green-600">${grandPaid.toFixed(2)}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                            <div><p className="text-sm text-muted-foreground">Total Unpaid</p><p className="text-2xl font-bold text-destructive">${grandUnpaid.toFixed(2)}</p></div>
                                        </div>
                                    </>
                                )
                            })()}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                <div className="bg-primary/10 p-3 rounded-full"><Users className="h-6 w-6 text-primary" /></div>
                                <div><p className="text-sm font-medium text-muted-foreground">Total Customers</p><p className="text-2xl font-bold">{customers.length}</p></div>
                            </div>
                            <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                <div className="bg-destructive/10 p-3 rounded-full"><Wallet className="h-6 w-6 text-destructive" /></div>
                                <div><p className="text-sm font-medium text-muted-foreground">Total Outstanding</p><p className="text-2xl font-bold text-destructive">${totalOutstanding.toFixed(2)}</p></div>
                            </div>
                            <div className="flex items-center gap-4 bg-background px-6 py-3 rounded-xl border shadow-sm">
                                <div className="bg-green-500/10 p-3 rounded-full h-12 w-12 flex items-center justify-center">
                                    <span className="text-green-600 font-bold text-xl">✓</span>
                                </div>
                                <div><p className="text-sm font-medium text-muted-foreground">With Balance</p><p className="text-2xl font-bold">{customers.filter(c => c.totalBalance > 0).length}</p></div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-8 flex flex-col gap-8">
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                    {selectedCustomer ? (
                        /* ======================== CUSTOMER DETAIL VIEW ======================== */
                        <div className="flex flex-col gap-4">
                            <h3 className="text-xl font-semibold text-muted-foreground">{selectedCustomer.phone}</h3>

                            {(!selectedCustomer.bookingHistory || selectedCustomer.bookingHistory.length === 0) ? (
                                <div className="text-center py-16 text-muted-foreground border rounded-xl">
                                    No bookings found for this customer.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {selectedCustomer.bookingHistory.map((booking) => {
                                        const isExpanded = expandedBookingId === booking._id
                                        return (
                                            <div key={booking._id} className="border rounded-xl overflow-hidden shadow-sm">
                                                {/* Booking Summary Row */}
                                                <div
                                                    className="flex items-center justify-between px-6 py-4 bg-card hover:bg-muted/30 cursor-pointer transition-colors"
                                                    onClick={() => setExpandedBookingId(isExpanded ? null : booking._id)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 rounded-lg bg-muted">
                                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-base">{format(new Date(booking.createdAt), 'MMM dd, yyyy')}</p>
                                                            <p className="text-sm text-muted-foreground font-mono">{booking.shortId}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-8">
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">Total</p>
                                                            <p className="font-semibold">${(booking.totalCost || 0).toFixed(2)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">Paid</p>
                                                            <p className="font-semibold text-green-600">${(booking.amountPaid || 0).toFixed(2)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                                            <p className={`font-semibold ${(booking.remainingBalance || 0) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                                ${(booking.remainingBalance || 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        {booking.paymentStatus && getStatusChip(booking.paymentStatus)}
                                                    </div>
                                                </div>

                                                {/* Expanded Detail */}
                                                {isExpanded && (
                                                    <div className="px-6 py-5 bg-muted/10 border-t space-y-5">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Job Description</p>
                                                                <p className="font-semibold">{booking.jobDescription || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Departments</p>
                                                                <p className="font-semibold capitalize">{booking.departments?.join(', ') || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Material</p>
                                                                <p className="font-semibold capitalize">{booking.materialConsume || '-'}{booking.materialDetails ? ` (${booking.materialDetails})` : ''}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Material Cost</p>
                                                                <p className="font-semibold">${(booking.materialCost || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Cutting Cost</p>
                                                                <p className="font-semibold">${(booking.cuttingCost || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Discount</p>
                                                                <p className="font-semibold">${(booking.discount || 0).toFixed(2)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Payment Method</p>
                                                                <p className="font-semibold capitalize">{booking.paymentMethod || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Status</p>
                                                                <p className="font-semibold capitalize">{booking.status || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground font-medium">Urgency</p>
                                                                <p className="font-semibold capitalize">{booking.urgency || '-'}</p>
                                                            </div>
                                                            {booking.bookerId && (
                                                                <div>
                                                                    <p className="text-muted-foreground font-medium">Booked By</p>
                                                                    <p className="font-semibold">{booking.bookerId.name}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Products */}
                                                        {booking.products && booking.products.length > 0 && (
                                                            <div>
                                                                <p className="text-sm font-semibold text-muted-foreground mb-2">Products Ordered</p>
                                                                <div className="border rounded-lg overflow-hidden text-sm">
                                                                    <Table>
                                                                        <TableHeader className="bg-muted/50">
                                                                            <TableRow>
                                                                                <TableHead>Category</TableHead>
                                                                                <TableHead>Subcategory</TableHead>
                                                                                <TableHead className="text-right">Qty</TableHead>
                                                                                <TableHead className="text-right">Unit Price</TableHead>
                                                                                <TableHead className="text-right">Total</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {booking.products.map((p, i) => (
                                                                                <TableRow key={i}>
                                                                                    <TableCell>{p.category}</TableCell>
                                                                                    <TableCell>{p.subcategory?.join(', ') || '-'}</TableCell>
                                                                                    <TableCell className="text-right">{p.quantity}</TableCell>
                                                                                    <TableCell className="text-right">${(p.unitPrice || 0).toFixed(2)}</TableCell>
                                                                                    <TableCell className="text-right">${(p.totalPrice || 0).toFixed(2)}</TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Payment Update */}
                                                        {(booking.remainingBalance || 0) > 0 && (
                                                            <div className="border rounded-lg p-4 bg-card">
                                                                <p className="text-sm font-semibold mb-3">Update Payment</p>
                                                                {editingPayment === booking._id ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            className="h-10 w-48"
                                                                            placeholder={`Current paid: $${(booking.amountPaid || 0).toFixed(2)}`}
                                                                            value={newPaidAmount}
                                                                            onChange={e => setNewPaidAmount(e.target.value)}
                                                                        />
                                                                        <Button size="sm" disabled={paymentLoading} onClick={() => handleUpdatePayment(booking._id)}>
                                                                            {paymentLoading ? 'Saving...' : 'Save Payment'}
                                                                        </Button>
                                                                        <Button size="sm" variant="outline" onClick={() => { setEditingPayment(null); setNewPaidAmount("") }}>
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button variant="outline" size="sm" onClick={() => { setEditingPayment(booking._id); setNewPaidAmount((booking.amountPaid || 0).toString()) }}>
                                                                        Record Payment
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}

                                    {/* Grand Totals  */}
                                    {(() => {
                                        const bookings = selectedCustomer.bookingHistory || []
                                        const grandTotal = bookings.reduce((s, b) => s + (b.totalCost || 0), 0)
                                        const grandPaid = bookings.reduce((s, b) => s + (b.amountPaid || 0), 0)
                                        const grandUnpaid = bookings.reduce((s, b) => s + (b.remainingBalance || 0), 0)
                                        return (
                                            <div className="mt-4 border-t-2 border-foreground/20 pt-4 flex justify-end gap-12 text-base font-semibold">
                                                <span>Total: <span className="text-xl font-bold ml-2">${grandTotal.toFixed(2)}</span></span>
                                                <span className="text-green-600">Paid: <span className="text-xl font-bold ml-2">${grandPaid.toFixed(2)}</span></span>
                                                <span className="text-destructive">Unpaid: <span className="text-xl font-bold ml-2">${grandUnpaid.toFixed(2)}</span></span>
                                            </div>
                                        )
                                    })()}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ======================== CUSTOMER LIST VIEW ======================== */
                        <>
                            {/* Add Customer Form */}
                            <div className="bg-card rounded-xl border shadow-sm p-8">
                                <h2 className="text-2xl font-semibold mb-6">Add New Customer</h2>
                                <form onSubmit={handleCreateCustomer} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">Customer Name *</Label>
                                            <Input className="h-12 text-base" value={name} onChange={e => setName(e.target.value)} placeholder="Enter customer name" required />
                                            <p className="text-sm text-muted-foreground">Name must be unique</p>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-base font-medium">Phone Number *</Label>
                                            <Input className="h-12 text-base" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" required />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <Button type="submit" disabled={loading} className="w-full h-14 text-lg font-medium">
                                            Create Customer
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            {/* Customer List */}
                            <div className="flex flex-col gap-6 mb-12">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-semibold">Customer Directory ({customers.length})</h2>
                                    <div className="relative w-80">
                                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            className="h-12 pl-12 text-base rounded-full bg-muted/50 border-transparent"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search by name or phone..."
                                        />
                                    </div>
                                </div>

                                <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-base font-semibold py-4 px-6">Name</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6">Phone</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-right">Outstanding Balance</TableHead>
                                                <TableHead className="text-base font-semibold py-4 px-6 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCustomers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground text-lg">
                                                        No customers found.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredCustomers.map(customer => (
                                                    <TableRow
                                                        key={customer._id}
                                                        className="text-base group cursor-pointer hover:bg-muted/50 transition-colors"
                                                        onClick={() => fetchCustomerDetails(customer._id)}
                                                    >
                                                        <TableCell className="font-semibold py-5 px-6 text-primary">{customer.name}</TableCell>
                                                        <TableCell className="py-5 px-6 text-muted-foreground">{customer.phone}</TableCell>
                                                        <TableCell className={`py-5 px-6 text-right font-semibold text-lg ${customer.totalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                            ${(customer.totalBalance || 0).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="py-5 px-6 text-right">
                                                            <div className="flex items-center justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(customer._id); }}
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
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
