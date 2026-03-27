import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import apiClient from "@/lib/api-client"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { ProductDialog } from "@/components/product-dialog"
import { LedgerDialog } from "@/components/ledger-dialog"
import { ExpenseDialog } from "@/components/expense-dialog"
import { ProductSelectionDialog } from "@/components/product-selection-dialog"
import { LedgerCustomerSelectionDialog } from "@/components/ledger-customer-selection-dialog"
import { BalanceSheetDialog } from "@/components/balance-sheet-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Upload, Calendar, Clock, Search, Loader2, BarChart3, Printer, Package, Users, DollarSign, FileText, Wallet } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Designer {
    id: string
    username: string
    name?: string
}

interface Booking {
    id: string
    _id?: string
    customerName: string
    customerContact?: string
    jobDescription: string
    status: string
    createdAt: string
    deliveryDate: string
    shortId: string
    totalCost?: number
}

interface Stats {
    totalBookings: number
    completedBookings: number
    pendingBookings: number
    daily: number
    weekly: number
    monthly: number
}

export default function BookerDashboard() {
    const { role } = useAuth()
    const { socket } = useSocket()
    const [designers, setDesigners] = useState<Designer[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingDesigners] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        customerName: "",
        customerContact: "",
        departments: [] as string[],
        jobDescription: "",
        materialConsume: "",
        materialDetails: "",
        designerId: "",
        deliveryDate: "",
        urgency: false,
        materialCost: "",
        cuttingCost: "",
    })
    const [clientPicture, setClientPicture] = useState<File | null>(null)
    const [clientFile, setClientFile] = useState<File | null>(null)
    const clientFileRef = useRef<HTMLInputElement>(null)
    const clientPictureRef = useRef<HTMLInputElement>(null)

    // Dashboard State
    const [stats, setStats] = useState<Stats>({
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        daily: 0,
        weekly: 0,
        monthly: 0
    })
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loadingBookings, setLoadingBookings] = useState(false)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [newBookingId, setNewBookingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [loadingStats] = useState(false)

    // Sidebar and Dialog State
    const [activeView, setActiveView] = useState<'booking' | 'products' | 'ledger' | 'expense'>('booking')
    const [productDialogOpen, setProductDialogOpen] = useState(false)
    const [ledgerDialogOpen, setLedgerDialogOpen] = useState(false)
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
    const [productSelectionOpen, setProductSelectionOpen] = useState(false)
    const [ledgerCustomerSelectionOpen, setLedgerCustomerSelectionOpen] = useState(false)
    const [balanceSheetOpen, setBalanceSheetOpen] = useState(false)

    // New Booking Features State
    const [selectedProducts, setSelectedProducts] = useState<any[]>([])
    const [customerType, setCustomerType] = useState<'normal' | 'ledger'>('normal')
    const [selectedLedgerCustomer, setSelectedLedgerCustomer] = useState<any>(null)
    const [discount, setDiscount] = useState("0")
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash')
    const [amountPaid, setAmountPaid] = useState("")
    const [bankScreenshot, setBankScreenshot] = useState<File | null>(null)
    const bankScreenshotRef = useRef<HTMLInputElement>(null)

    // Client Items State
    const [clientItems, setClientItems] = useState<{ description: string; price: number }[]>([])
    const [newClientItemDesc, setNewClientItemDesc] = useState("")
    const [newClientItemPrice, setNewClientItemPrice] = useState("")

    useEffect(() => {
        const fetchDesigners = async () => {
            try {
                const response = await apiClient.get("/api/users/designers")
                setDesigners(response.data)
            } catch (err) {
                console.error("Failed to fetch designers")
            }
        }
        fetchDesigners()
    }, [])

    useEffect(() => {
        if (!socket) return

        const handleUpdate = () => {
            console.log("Received booking update")
            const fetchStats = async () => {
                try {
                    const response = await apiClient.get("/api/bookings/stats")
                    setStats(response.data)
                } catch (err) {
                    console.error("Failed to fetch stats:", err)
                }
            }

            const fetchBookings = async () => {
                try {
                    setLoadingBookings(true)
                    const response = await apiClient.get(`/api/bookings/my?month=${selectedMonth}&year=${selectedYear}`)
                    setBookings(response.data)
                } catch (err) {
                    console.error("Failed to fetch bookings:", err)
                } finally {
                    setLoadingBookings(false)
                }
            }

            fetchStats()
            fetchBookings()
        }

        socket.on("booking_created", handleUpdate)
        socket.on("booking_updated", handleUpdate)

        return () => {
            socket.off("booking_created", handleUpdate)
            socket.off("booking_updated", handleUpdate)
        }
    }, [socket, selectedMonth, selectedYear])

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await apiClient.get("/api/bookings/stats")
                setStats(response.data)
            } catch (err) {
                console.error("Failed to fetch stats:", err)
            }
        }

        const fetchBookings = async () => {
            try {
                setLoadingBookings(true)
                const response = await apiClient.get(`/api/bookings/my?month=${selectedMonth}&year=${selectedYear}`)
                setBookings(response.data)
            } catch (err) {
                console.error("Failed to fetch bookings:", err)
            } finally {
                setLoadingBookings(false)
            }
        }

        if (role === "booker") {
            fetchStats()
            fetchBookings()
        }
    }, [role, selectedMonth, selectedYear])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }))
    }

    const handleDepartmentToggle = (dept: string) => {
        setFormData((prev) => ({
            ...prev,
            departments: prev.departments.includes(dept)
                ? prev.departments.filter((d) => d !== dept)
                : [...prev.departments, dept],
        }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "picture" | "file") => {
        if (e.target.files && e.target.files[0]) {
            if (type === "picture") {
                setClientPicture(e.target.files[0])
            } else {
                setClientFile(e.target.files[0])
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess(false)

        try {
            const form = new FormData()

            // Customer information
            const finalCustomerName = customerType === 'ledger' && selectedLedgerCustomer
                ? selectedLedgerCustomer.name
                : formData.customerName
            const finalCustomerContact = customerType === 'ledger' && selectedLedgerCustomer
                ? selectedLedgerCustomer.phone
                : formData.customerContact

            form.append("customerName", finalCustomerName)
            form.append("customerContact", finalCustomerContact)
            form.append("departments", JSON.stringify(formData.departments))
            form.append("jobDescription", formData.jobDescription)
            form.append("materialConsume", formData.materialConsume)
            form.append("materialDetails", formData.materialDetails)
            form.append("designerId", formData.designerId)
            form.append("deliveryDate", formData.deliveryDate)
            form.append("urgency", formData.urgency.toString())
            form.append("materialCost", formData.materialCost)
            form.append("cuttingCost", formData.cuttingCost)

            // New fields - Products
            const isDigicut = formData.materialConsume === "Digicut"
            
            // Map client items to match product schema if material is Client
            const mappedClientProducts = clientItems.map(item => ({
                category: "Client Item",
                subcategory: [item.description],
                quantity: 1,
                unitPrice: item.price,
                totalPrice: item.price
            }))

            const finalProducts = isDigicut ? selectedProducts : mappedClientProducts
            const productSubtotal = finalProducts.reduce((sum, p) => sum + p.totalPrice, 0)

            form.append("products", JSON.stringify(finalProducts))
            form.append("productSubtotal", productSubtotal.toString())

            // New fields - Customer Type & Ledger
            form.append("customerType", customerType)
            if (customerType === 'ledger' && selectedLedgerCustomer) {
                form.append("ledgerCustomerId", selectedLedgerCustomer._id)
            }

            // New fields - Payment & Discount
            form.append("discount", discount || "0")
            form.append("paymentMethod", paymentMethod)
            form.append("amountPaid", amountPaid || "0")

            const totalCost = Math.max(0,
                (Number(formData.materialCost) || 0) +
                (Number(formData.cuttingCost) || 0) +
                productSubtotal -
                (Number(discount) || 0)
            )
            const remainingBalance = Math.max(0, totalCost - (Number(amountPaid) || 0))

            form.append("totalCost", totalCost.toString())
            form.append("remainingBalance", remainingBalance.toString())
            form.append("paymentStatus", remainingBalance === 0 ? "paid" : (Number(amountPaid) > 0 ? "partial" : "unpaid"))

            // File uploads
            if (clientPicture) {
                form.append("clientPicture", clientPicture)
            }
            if (clientFile) {
                form.append("clientFile", clientFile)
            }
            if (bankScreenshot && paymentMethod === 'bank') {
                form.append("bankScreenshot", bankScreenshot)
            }

            const response = await apiClient.post("/api/bookings", form, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            setSuccess(true)
            setNewBookingId(response.data.shortId || response.data._id)

            // Refresh stats and bookings
            const statsRes = await apiClient.get("/api/bookings/stats")
            setStats(statsRes.data)
            const bookingsRes = await apiClient.get(`/api/bookings/my?month=${selectedMonth}&year=${selectedYear}`)
            setBookings(bookingsRes.data)

            // Reset form
            setFormData({
                customerName: "",
                customerContact: "",
                departments: [],
                jobDescription: "",
                materialConsume: "Digicut",
                materialDetails: "",
                designerId: "",
                deliveryDate: "",
                urgency: false,
                materialCost: "",
                cuttingCost: "",
            })
            setClientPicture(null)
            setClientFile(null)
            setSelectedProducts([])
            setClientItems([])
            setCustomerType('normal')
            setSelectedLedgerCustomer(null)
            setDiscount("0")
            setPaymentMethod('cash')
            setAmountPaid("")
            setBankScreenshot(null)

            if (clientPictureRef.current) clientPictureRef.current.value = ""
            if (clientFileRef.current) clientFileRef.current.value = ""
            if (bankScreenshotRef.current) bankScreenshotRef.current.value = ""

            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            setError("Failed to create booking. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = (booking: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const content = `
            <html>
                <head>
                    <title>Booking Details - ${booking.shortId || booking._id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .id { font-size: 1.2em; font-weight: bold; color: #666; }
                        .section { margin-bottom: 15px; }
                        .label { font-weight: bold; display: inline-block; width: 150px; }
                        .value { display: inline-block; }
                        .total { font-size: 1.5em; font-weight: bold; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="${window.location.origin}/digicut-logo.png" alt="Digicut" style="height: 80px; margin-bottom: 15px;" />
                        <h1>Manufacturing Booking</h1>
                        <div class="id">Booking ID: ${booking.shortId || booking._id}</div>
                    </div>
                    <div class="section"><span class="label">Customer Name:</span><span class="value">${booking.customerName}</span></div>
                    <div class="section"><span class="label">Contact:</span><span class="value">${booking.customerContact}</span></div>
                    <div class="section"><span class="label">Departments:</span><span class="value">${booking.departments.join(', ')}</span></div>
                    <div class="section"><span class="label">Job Description:</span><span class="value">${booking.jobDescription}</span></div>
                    <div class="section"><span class="label">Material:</span><span class="value">${booking.materialConsume} (${booking.materialDetails || 'N/A'})</span></div>
                    <div class="section"><span class="label">Delivery Date:</span><span class="value">${new Date(booking.deliveryDate).toLocaleString()}</span></div>
                    <div class="section"><span class="label">Urgency:</span><span class="value">${booking.urgency}</span></div>
                    <div class="section"><span class="label">Material Cost:</span><span class="value">${booking.materialCost}</span></div>
                    <div class="section"><span class="label">Cutting Cost:</span><span class="value">${booking.cuttingCost}</span></div>
                    <div class="total"><span class="label">Total Cost:</span><span class="value">${booking.totalCost}</span></div>
                    <script>
                        window.onload = () => { 
                            window.print();
                            // window.close(); // Removed to prevent immediate closing
                        }
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    }

    const filteredBookings = bookings.filter(b =>
        (b.shortId && b.shortId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const departments = ["CNC", "CO2 Laser", "Fiber Laser", "Bender", "Outsource"]

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <NavHeader title="Booker Dashboard" />

            {/* Dialogs */}
            <ProductDialog open={productDialogOpen} onOpenChange={setProductDialogOpen} />
            <LedgerDialog open={ledgerDialogOpen} onOpenChange={setLedgerDialogOpen} />
            <ExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
            <ProductSelectionDialog
                open={productSelectionOpen}
                onOpenChange={setProductSelectionOpen}
                onProductsSelected={setSelectedProducts}
                initialProducts={selectedProducts}
            />
            <LedgerCustomerSelectionDialog
                open={ledgerCustomerSelectionOpen}
                onOpenChange={setLedgerCustomerSelectionOpen}
                onCustomerSelected={(customer) => {
                    setSelectedLedgerCustomer(customer)
                    setFormData(prev => ({
                        ...prev,
                        customerName: customer.name,
                        customerContact: customer.phone
                    }))
                }}
            />
            <BalanceSheetDialog open={balanceSheetOpen} onOpenChange={setBalanceSheetOpen} />

            <div className="flex flex-1">
                {/* Sidebar Navigation */}
                <aside className="w-64 bg-card border-r border-border p-4 space-y-2">
                    <h2 className="text-lg font-bold mb-4 px-3">Menu</h2>

                    <Button
                        variant={activeView === 'booking' ? 'default' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setActiveView('booking')}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Booking
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setProductDialogOpen(true)}
                    >
                        <Package className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setLedgerDialogOpen(true)}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Ledger
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setExpenseDialogOpen(true)}
                    >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Expense
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setBalanceSheetOpen(true)}
                    >
                        <Wallet className="mr-2 h-4 w-4" />
                        Balance Sheet
                    </Button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {/* Statistics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Today's Bookings</CardTitle>
                                <Clock className="h-4 w-4 text-accent" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.daily}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                                <Calendar className="h-4 w-4 text-accent" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.weekly}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                                <BarChart3 className="h-4 w-4 text-accent" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.monthly}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {success && (
                        <Alert className="mb-6 bg-green-900/20 border-green-500/50">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertTitle className="text-green-400">Success!</AlertTitle>
                            <AlertDescription className="text-green-400">
                                Booking created successfully! <br />
                                <span className="font-mono font-bold">Booking ID: {newBookingId}</span>
                            </AlertDescription>
                        </Alert>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Card className="border-border">
                        <CardHeader>
                            <CardTitle>Create New Booking</CardTitle>
                            <CardDescription>Fill in the details to create a new manufacturing booking</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Customer Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Customer Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-foreground">Customer Name</Label>
                                            <Input
                                                name="customerName"
                                                value={customerType === 'ledger' && selectedLedgerCustomer ? selectedLedgerCustomer.name : formData.customerName}
                                                onChange={handleInputChange}
                                                placeholder="John Doe"
                                                className="mt-2 bg-input border-border"
                                                disabled={customerType === 'ledger' && selectedLedgerCustomer !== null}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-foreground">Customer Contact</Label>
                                            <Input
                                                name="customerContact"
                                                value={customerType === 'ledger' && selectedLedgerCustomer ? selectedLedgerCustomer.phone : formData.customerContact}
                                                onChange={handleInputChange}
                                                placeholder="john@example.com / +1234567890"
                                                className="mt-2 bg-input border-border"
                                                disabled={customerType === 'ledger' && selectedLedgerCustomer !== null}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Type Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Customer Type</h3>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="normal"
                                                checked={customerType === 'normal'}
                                                onChange={(e) => {
                                                    setCustomerType('normal')
                                                    setSelectedLedgerCustomer(null)
                                                    setFormData(prev => ({ ...prev, customerName: '', customerContact: '' }))
                                                }}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-foreground">Normal User</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="ledger"
                                                checked={customerType === 'ledger'}
                                                onChange={(e) => setCustomerType('ledger')}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-foreground">Ledger User</span>
                                        </label>
                                    </div>
                                    {customerType === 'ledger' && (
                                        <div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setLedgerCustomerSelectionOpen(true)}
                                                className="w-full"
                                            >
                                                <Users className="mr-2 h-4 w-4" />
                                                {selectedLedgerCustomer ? `Selected: ${selectedLedgerCustomer.name}` : 'Select Ledger Customer'}
                                            </Button>
                                            {selectedLedgerCustomer && (
                                                <div className="mt-2 p-3 bg-muted rounded-lg">
                                                    <p className="text-sm"><strong>Name:</strong> {selectedLedgerCustomer.name}</p>
                                                    <p className="text-sm"><strong>Phone:</strong> {selectedLedgerCustomer.phone}</p>
                                                    <p className="text-sm"><strong>Current Balance:</strong> ${selectedLedgerCustomer.totalBalance.toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>


                                {/* Departments */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Department</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {departments.map((dept) => (
                                            <button
                                                key={dept}
                                                type="button"
                                                onClick={() => handleDepartmentToggle(dept)}
                                                disabled={formData.departments.includes("Outsource") && dept !== "Outsource"}
                                                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${formData.departments.includes(dept)
                                                    ? "border-accent bg-accent/10 text-accent"
                                                    : "border-border bg-card text-foreground hover:border-accent/50"
                                                    } ${formData.departments.includes("Outsource") && dept !== "Outsource"
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : ""
                                                    }`}
                                            >
                                                {dept}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Job Description */}
                                <div>
                                    <Label className="text-foreground">Job Description</Label>
                                    <textarea
                                        name="jobDescription"
                                        value={formData.jobDescription}
                                        onChange={handleInputChange}
                                        placeholder="Describe the job in detail..."
                                        className="mt-2 w-full p-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                        rows={4}
                                        required
                                    />
                                </div>

                                {/* Material */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Material</h3>
                                    <div className="flex gap-4">
                                        {["Digicut", "Client"].map((option) => (
                                            <label key={option} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="materialConsume"
                                                    value={option}
                                                    checked={formData.materialConsume === option}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        if (option === 'Digicut') setClientItems([]);
                                                        if (option === 'Client') setSelectedProducts([]);
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-foreground">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                    
                                    {formData.materialConsume === "Digicut" && (
                                        <div className="p-4 border rounded-xl bg-accent/5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold text-foreground">Digicut Products</h4>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => setProductSelectionOpen(true)}
                                                >
                                                    <Package className="mr-2 h-4 w-4" />
                                                    Add Digicut Product
                                                </Button>
                                            </div>
                                            {selectedProducts.length > 0 ? (
                                                <div className="border rounded-lg p-4 space-y-2 bg-card">
                                                    {selectedProducts.map((product, index) => (
                                                        <div key={index} className="flex justify-between items-center text-sm">
                                                            <span>{product.category} - {product.subcategory?.join(', ')}</span>
                                                            <span>Qty: {product.quantity} × ${product.unitPrice} = ${product.totalPrice.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 border-t font-semibold flex justify-between">
                                                        <span>Digicut Subtotal:</span>
                                                        <span>${selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground italic p-2">No Digicut products added yet. Click the button above to select products from inventory.</div>
                                            )}
                                        </div>
                                    )}

                                    {formData.materialConsume === "Client" && (
                                        <div className="p-4 border rounded-xl bg-accent/5 space-y-4">
                                            <h4 className="font-semibold text-foreground">Client Provided Items</h4>
                                            
                                            {/* Add Client Item Form */}
                                            <div className="flex items-end gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-sm">Item Description *</Label>
                                                    <Input
                                                        value={newClientItemDesc}
                                                        onChange={e => setNewClientItemDesc(e.target.value)}
                                                        placeholder="Describe client item..."
                                                    />
                                                </div>
                                                <div className="w-32 space-y-2">
                                                    <Label className="text-sm">Price (Optional)</Label>
                                                    <Input
                                                        type="number"
                                                        value={newClientItemPrice}
                                                        onChange={e => setNewClientItemPrice(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <Button 
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        if (!newClientItemDesc.trim()) return;
                                                        setClientItems([...clientItems, { 
                                                            description: newClientItemDesc.trim(), 
                                                            price: Number(newClientItemPrice) || 0 
                                                        }]);
                                                        setNewClientItemDesc("");
                                                        setNewClientItemPrice("");
                                                    }}
                                                    disabled={!newClientItemDesc.trim()}
                                                >
                                                    Add Item
                                                </Button>
                                            </div>

                                            {/* Client Items List */}
                                            {clientItems.length > 0 && (
                                                <div className="border rounded-lg p-4 space-y-2 bg-card">
                                                    {clientItems.map((item, index) => (
                                                        <div key={index} className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    type="button"
                                                                    className="text-destructive hover:font-bold text-xs px-1"
                                                                    onClick={() => setClientItems(clientItems.filter((_, i) => i !== index))}
                                                                >
                                                                    ✕
                                                                </button>
                                                                <span>{item.description}</span>
                                                            </div>
                                                            <span>${item.price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="pt-2 border-t font-semibold flex justify-between">
                                                        <span>Client Items Subtotal:</span>
                                                        <span>${clientItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cost Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Cost Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-foreground">Material Cost</Label>
                                            <Input
                                                type="number"
                                                name="materialCost"
                                                value={formData.materialCost}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                className="mt-2 bg-input border-border"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-foreground">Cutting Cost</Label>
                                            <Input
                                                type="number"
                                                name="cuttingCost"
                                                value={formData.cuttingCost}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                className="mt-2 bg-input border-border"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-foreground">Product Subtotal</Label>
                                            <Input
                                                type="number"
                                                value={
                                                    formData.materialConsume === 'Digicut' 
                                                        ? selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0)
                                                        : clientItems.reduce((sum, item) => sum + item.price, 0)
                                                }
                                                className="mt-2 bg-muted border-border cursor-not-allowed text-primary font-semibold"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Discount & Payment */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-foreground">Discount & Payment</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-foreground">Discount Amount</Label>
                                            <Input
                                                type="number"
                                                value={discount}
                                                onChange={(e) => setDiscount(e.target.value)}
                                                placeholder="0.00"
                                                className="mt-2 bg-input border-border"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-foreground">Total Cost (After Discount)</Label>
                                            <Input
                                                type="number"
                                                value={Math.max(0, 
                                                    (Number(formData.materialCost) || 0) + 
                                                    (Number(formData.cuttingCost) || 0) + 
                                                    (formData.materialConsume === 'Digicut' 
                                                        ? selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0)
                                                        : clientItems.reduce((sum, item) => sum + item.price, 0)) - 
                                                    (Number(discount) || 0))}
                                                className="mt-2 bg-muted border-border cursor-not-allowed font-bold"
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-foreground">Payment Method</Label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    value="cash"
                                                    checked={paymentMethod === 'cash'}
                                                    onChange={(e) => setPaymentMethod('cash')}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-foreground">Cash</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    value="bank"
                                                    checked={paymentMethod === 'bank'}
                                                    onChange={(e) => setPaymentMethod('bank')}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-foreground">Bank Transfer</span>
                                            </label>
                                        </div>

                                        <div>
                                            <Label className="text-foreground">Amount Paid</Label>
                                            <Input
                                                type="number"
                                                value={amountPaid}
                                                onChange={(e) => setAmountPaid(e.target.value)}
                                                placeholder="Enter amount paid"
                                                className="mt-2 bg-input border-border"
                                                required
                                            />
                                        </div>

                                        {paymentMethod === 'bank' && (
                                            <div>
                                                <Label className="text-foreground">Bank Payment Screenshot</Label>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Input
                                                        ref={bankScreenshotRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => setBankScreenshot(e.target.files?.[0] || null)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => bankScreenshotRef.current?.click()}
                                                        className="border-border bg-secondary text-foreground hover:bg-secondary/80"
                                                    >
                                                        <Upload className="h-4 w-4 mr-2" />
                                                        Upload Screenshot
                                                    </Button>
                                                    <span className="text-sm text-muted-foreground">
                                                        {bankScreenshot?.name || "No file selected"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 bg-muted rounded-lg">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Total Cost:</span>
                                                <span className="font-semibold">${Math.max(0, (Number(formData.materialCost) || 0) + (Number(formData.cuttingCost) || 0) + selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0) - (Number(discount) || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Amount Paid:</span>
                                                <span className="font-semibold">${(Number(amountPaid) || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t">
                                                <span className="font-bold">Remaining Balance:</span>
                                                <span className={`font-bold ${Math.max(0, (Number(formData.materialCost) || 0) + (Number(formData.cuttingCost) || 0) + selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0) - (Number(discount) || 0) - (Number(amountPaid) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    ${Math.max(0, (Number(formData.materialCost) || 0) + (Number(formData.cuttingCost) || 0) + selectedProducts.reduce((sum, p) => sum + p.totalPrice, 0) - (Number(discount) || 0) - (Number(amountPaid) || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Designer */}
                                <div>
                                    <Label className="text-foreground">Assign Designer</Label>
                                    <Select
                                        value={formData.designerId || ""}
                                        onValueChange={(value) => setFormData((prev) => ({ ...prev, designerId: value || "" }))}
                                        disabled={loadingDesigners}
                                    >
                                        <SelectTrigger className="mt-2 bg-input border-border">
                                            <SelectValue placeholder={loadingDesigners ? "Loading designers..." : "Select a designer"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            {designers.map((designer) => (
                                                <SelectItem key={designer.id} value={designer.id}>
                                                    {designer.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* File Uploads */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-foreground">Client Picture</Label>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Input
                                                ref={clientPictureRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(e, "picture")}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => clientPictureRef.current?.click()}
                                                className="border-border bg-secondary text-foreground hover:bg-secondary/80"
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Choose File
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                {clientPicture?.name || "No file selected"}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-foreground">Client File</Label>
                                        <div className="mt-2 flex items-center gap-2">
                                            <Input
                                                ref={clientFileRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.dwg,.dxf,.step"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(e, "file")}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => clientFileRef.current?.click()}
                                                className="border-border bg-secondary text-foreground hover:bg-secondary/80"
                                            >
                                                <Upload className="h-4 w-4 mr-2" />
                                                Choose File
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                {clientFile?.name || "No file selected"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Delivery & Urgency */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-foreground">Delivery Date</Label>
                                        <Input
                                            name="deliveryDate"
                                            type="datetime-local"
                                            value={formData.deliveryDate}
                                            onChange={handleInputChange}
                                            className="mt-2 bg-input border-border"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="urgency"
                                                checked={formData.urgency}
                                                onChange={handleInputChange}
                                                className="w-4 h-4"
                                            />
                                            <span className="text-foreground font-medium">Mark as Urgent</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Booking...
                                        </>
                                    ) : (
                                        "Create Booking"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Booking List */}
                    <Card className="mt-8 border-border">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>My Bookings</CardTitle>
                                    <CardDescription>View and manage your manufacturing bookings</CardDescription>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <Select
                                        value={selectedMonth.toString()}
                                        onValueChange={(val) => setSelectedMonth(Number(val))}
                                    >
                                        <SelectTrigger className="w-[140px] bg-input border-border">
                                            <SelectValue placeholder="Month" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                                <SelectItem key={m} value={m.toString()}>
                                                    {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={selectedYear.toString()}
                                        onValueChange={(val) => setSelectedYear(Number(val))}
                                    >
                                        <SelectTrigger className="w-[100px] bg-input border-border">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[2024, 2025, 2026].map((y) => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by ID or Name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 bg-input border-border"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingBookings ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Booking ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Total Cost</TableHead>
                                            <TableHead>Delivery</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBookings.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No bookings found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBookings.map((booking) => (
                                                <TableRow key={booking._id}>
                                                    <TableCell className="font-mono text-xs font-bold text-accent">
                                                        {booking.shortId || (booking._id || "").substring(0, 8) + '...'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{booking.customerName}</div>
                                                        <div className="text-xs text-muted-foreground">{booking.customerContact}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase ${booking.status === 'completed' ? 'bg-green-600 text-white' :
                                                            booking.status === 'production' ? 'bg-blue-600 text-white' :
                                                                'bg-yellow-500 text-gray-900'
                                                            }`}>
                                                            {booking.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-medium">${booking.totalCost}</TableCell>
                                                    <TableCell className="text-xs">
                                                        {new Date(booking.deliveryDate).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handlePrint(booking)}
                                                            className="hover:text-accent"
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </main>
            </div>
            <Footer />
        </div>
    )
}
