import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import apiClient from "@/lib/api-client"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    AlertCircle,
    CheckCircle,
    Loader2,
    TrendingUp,
    TrendingDown,
    Wallet,
    Users,
    Briefcase,
    DollarSign,
    UserPlus,
    Lock,
    Search,
    FileText,
    Download,
    X,
    Image as ImageIcon,
    History,
    ChevronDown,
    ChevronRight,
    Calendar
} from "lucide-react"
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts"

interface TodayDeadline {
    _id: string
    customerName: string
    jobDescription: string
    operatorDeadline: string
    operatorUrgency: string
    status: string
    departments: string[]
}

interface ProgressData {
    bookerName?: string
    designerName?: string
    operatorName?: string
    totalBookings?: number
    completedBookings?: number
    pendingBookings?: number
    totalRevenue?: number
    completedDesigns?: number
    pendingDesigns?: number
    assignedBookings?: number
    completedJobs?: number
    inProgressJobs?: number
}

interface MonthlyStats {
    totalBookings: number
    completedBookings: number
    pendingBookings: number
    revenue: {
        totalRevenue: number
        totalMaterialCost: number
        totalCuttingCost: number
    }
    profit: number
    departmentStats: Array<{ _id: string; count: number }>
    statusStats: Array<{ _id: string; count: number }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function AdminDashboard() {
    const { role } = useAuth()
    const { socket } = useSocket()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    const [todayDeadlines, setTodayDeadlines] = useState<TodayDeadline[]>([])
    const [bookerProgress, setBookerProgress] = useState<ProgressData[]>([])
    const [designerProgress, setDesignerProgress] = useState<ProgressData[]>([])
    const [operatorProgress, setOperatorProgress] = useState<ProgressData[]>([])
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)

    // Bookings state
    const [allBookings, setAllBookings] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null)

    // Audit / Activity state
    const [bookingAuditLogs, setBookingAuditLogs] = useState<any[]>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0])
    const [activityLogs, setActivityLogs] = useState<any[]>([])
    const [activityLoading, setActivityLoading] = useState(false)
    const [expandedActivity, setExpandedActivity] = useState<string | null>(null)

    // Cash Flow state
    const [cashFlowDate, setCashFlowDate] = useState(new Date().toISOString().split('T')[0])
    const [cashFlowData, setCashFlowData] = useState<{ bookings: any[], expenses: any[] }>({ bookings: [], expenses: [] })
    const [cashFlowLoading, setCashFlowLoading] = useState(false)
    const [expandedCashFlowItem, setExpandedCashFlowItem] = useState<{ type: string, id: string } | null>(null)

    // User creation form
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "booker"
    })

    // Password change form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    })

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true)
            const [deadlines, bookers, designers, operators, stats, bookings] = await Promise.all([
                apiClient.get("/api/admin/today-deadlines"),
                apiClient.get(`/api/admin/booker-progress?month=${selectedMonth}&year=${selectedYear}`),
                apiClient.get(`/api/admin/designer-progress?month=${selectedMonth}&year=${selectedYear}`),
                apiClient.get(`/api/admin/operator-progress?month=${selectedMonth}&year=${selectedYear}`),
                apiClient.get(`/api/admin/monthly-stats?month=${selectedMonth}&year=${selectedYear}`),
                apiClient.get(`/api/admin/bookings?month=${selectedMonth}&year=${selectedYear}`)
            ])

            setTodayDeadlines(deadlines.data)
            setBookerProgress(bookers.data)
            setDesignerProgress(designers.data)
            setOperatorProgress(operators.data)
            setMonthlyStats(stats.data)
            setAllBookings(bookings.data)
        } catch (err) {
            console.error("Error fetching dashboard data:", err)
            setError("Failed to load dashboard data")
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, selectedYear])

    // Socket listener
    useEffect(() => {
        if (!socket) return

        const handleUpdate = () => {
            console.log("Received booking update")
            fetchDashboardData()
        }

        socket.on("booking_created", handleUpdate)
        socket.on("booking_updated", handleUpdate)

        return () => {
            socket.off("booking_created", handleUpdate)
            socket.off("booking_updated", handleUpdate)
        }
    }, [socket, fetchDashboardData])

    useEffect(() => {
        if (role === "admin") {
            fetchDashboardData()
        }
    }, [role, fetchDashboardData])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        try {
            await apiClient.post("/api/admin/create-user", newUser)
            setSuccess(`User ${newUser.name} created successfully!`)
            setNewUser({ name: "", email: "", password: "", role: "booker" })
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create user")
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError("New passwords do not match")
            return
        }

        try {
            await apiClient.put("/api/admin/change-password", {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            })
            setSuccess("Password changed successfully!")
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
            setTimeout(() => setSuccess(""), 3000)
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to change password")
        }
    }

    // Filter bookings based on search query
    const filteredBookings = allBookings.filter((booking) => {
        const query = searchQuery.toLowerCase()
        return (
            booking.customerName?.toLowerCase().includes(query) ||
            booking.shortId?.toLowerCase().includes(query) ||
            booking._id?.toLowerCase().includes(query)
        )
    })

    // Fetch audit logs for a single booking
    const fetchBookingAudit = async (bookingId: string) => {
        setAuditLoading(true)
        setBookingAuditLogs([])
        try {
            const res = await apiClient.get(`/api/audit/booking/${bookingId}`)
            setBookingAuditLogs(res.data)
        } catch (err) {
            console.error('Error fetching booking audit:', err)
        } finally {
            setAuditLoading(false)
        }
    }

    // Fetch activity logs for selected date
    const fetchActivityLogs = async (date: string) => {
        setActivityLoading(true)
        try {
            const res = await apiClient.get(`/api/audit?date=${date}`)
            setActivityLogs(res.data)
        } catch (err) {
            console.error('Error fetching activity logs:', err)
        } finally {
            setActivityLoading(false)
        }
    }

    // Fetch cash flow for selected date
    const fetchCashFlow = async (date: string) => {
        setCashFlowLoading(true)
        try {
            const start = new Date(date)
            start.setHours(0, 0, 0, 0)
            const end = new Date(date)
            end.setHours(23, 59, 59, 999)

            const [bookingsRes, expensesRes] = await Promise.all([
                apiClient.get(`/api/bookings/my?startDate=${start.toISOString()}&endDate=${end.toISOString()}`),
                apiClient.get(`/api/expenses?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
            ])

            setCashFlowData({
                bookings: Array.isArray(bookingsRes.data) ? bookingsRes.data : [],
                expenses: Array.isArray(expensesRes.data?.expenses) ? expensesRes.data.expenses : Array.isArray(expensesRes.data) ? expensesRes.data : []
            })
        } catch (err) {
            console.error('Error fetching cash flow:', err)
        } finally {
            setCashFlowLoading(false)
        }
    }

    if (role !== "admin") {
        return <div className="text-center p-8 text-destructive">Unauthorized</div>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <NavHeader title="Admin Dashboard" />

            <main className="p-6 max-w-7xl mx-auto">
                {success && (
                    <Alert className="mb-6 bg-green-900/20 border-green-500/50">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="overview" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="bookings">Bookings</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                            <TabsTrigger value="users">User Management</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                            <TabsTrigger value="activity" onClick={() => fetchActivityLogs(activityDate)}>
                                <History className="h-4 w-4 mr-1" />
                                Activity
                            </TabsTrigger>
                            <TabsTrigger value="cash-flow" onClick={() => fetchCashFlow(cashFlowDate)}>
                                <Wallet className="h-4 w-4 mr-1" />
                                Cash Flow
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex gap-2">
                            <Select
                                value={selectedMonth.toString()}
                                onValueChange={(val) => setSelectedMonth(parseInt(val))}
                            >
                                <SelectTrigger className="w-[140px] bg-card border-border">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={m.toString()}>
                                            {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(val) => setSelectedYear(parseInt(val))}
                            >
                                <SelectTrigger className="w-[100px] bg-card border-border">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026].map((y) => (
                                        <SelectItem key={y} value={y.toString()}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{monthlyStats?.totalBookings || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {monthlyStats?.completedBookings || 0} completed
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        ${monthlyStats?.revenue.totalRevenue.toFixed(2) || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Profit: ${monthlyStats?.profit.toFixed(2) || 0}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Pending Work</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{monthlyStats?.pendingBookings || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        {todayDeadlines.length} due today
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-border">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {bookerProgress.length + designerProgress.length + operatorProgress.length}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {bookerProgress.length}B / {designerProgress.length}D / {operatorProgress.length}O
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Today's Deadlines */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle>Today's Deadlines</CardTitle>
                                <CardDescription>{todayDeadlines.length} jobs due today</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {todayDeadlines.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No deadlines today</p>
                                ) : (
                                    <div className="space-y-2">
                                        {todayDeadlines.map((job) => (
                                            <div
                                                key={job._id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-semibold text-foreground">{job.customerName}</p>
                                                    <p className="text-sm text-muted-foreground truncate">{job.jobDescription}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {job.departments.join(", ")}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {job.operatorUrgency === 'urgent' && (
                                                        <span className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white font-semibold">
                                                            Urgent
                                                        </span>
                                                    )}
                                                    <span className={`text-xs px-3 py-1.5 rounded-md font-semibold ${job.status === 'design' ? 'bg-yellow-500 text-gray-900' :
                                                        job.status === 'production' ? 'bg-blue-600 text-white' :
                                                            'bg-green-600 text-white'
                                                        }`}>
                                                        {job.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Bookings Tab */}
                    <TabsContent value="bookings" className="space-y-6">
                        {/* Search Bar */}
                        <Card className="border-border">
                            <CardContent className="pt-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by customer name, booking ID, or short ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bookings List */}
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle>All Bookings</CardTitle>
                                <CardDescription>{filteredBookings.length} bookings found</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {filteredBookings.map((booking) => (
                                        <div
                                            key={booking._id}
                                            onClick={() => setSelectedBooking(booking)}
                                            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-foreground">{booking.customerName}</p>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                                                        {booking.shortId}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{booking.jobDescription}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span>Booker: {booking.bookerId?.name || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>Designer: {booking.designerId?.name || 'Not assigned'}</span>
                                                    <span>•</span>
                                                    <span>Operator: {booking.operatorId?.name || 'Not assigned'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-3 py-1.5 rounded-md font-semibold ${booking.status === 'design' ? 'bg-yellow-500 text-gray-900' :
                                                    booking.status === 'production' ? 'bg-blue-600 text-white' :
                                                        booking.status === 'in_progress' ? 'bg-purple-600 text-white' :
                                                            'bg-green-600 text-white'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                                {booking.operatorUrgency === 'urgent' && (
                                                    <span className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white font-semibold">
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Booking Detail Modal */}
                        {selectedBooking && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-border">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle>Booking Details</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <span className="font-mono">{selectedBooking.shortId}</span>
                                                <span>•</span>
                                                <span>{selectedBooking.customerName}</span>
                                            </CardDescription>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedBooking(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Booker Information */}
                                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Booker Information
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Created By</p>
                                                    <p className="font-medium">{selectedBooking.bookerId?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Customer Contact</p>
                                                    <p className="font-medium">{selectedBooking.customerContact}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Departments</p>
                                                    <p className="font-medium">{selectedBooking.departments?.join(', ')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Material</p>
                                                    <p className="font-medium">{selectedBooking.materialConsume}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-muted-foreground">Job Description</p>
                                                    <p className="font-medium">{selectedBooking.jobDescription}</p>
                                                </div>
                                                {selectedBooking.materialDetails && (
                                                    <div className="col-span-2">
                                                        <p className="text-muted-foreground">Material Details</p>
                                                        <p className="font-medium">{selectedBooking.materialDetails}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-muted-foreground">Delivery Date</p>
                                                    <p className="font-medium">{new Date(selectedBooking.deliveryDate).toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Urgency</p>
                                                    <p className="font-medium capitalize">{selectedBooking.urgency}</p>
                                                </div>
                                            </div>

                                            {/* Customer Files */}
                                            {(selectedBooking.clientFile || selectedBooking.clientPicture) && (
                                                <div className="mt-4 pt-4 border-t border-border">
                                                    <p className="text-muted-foreground text-sm mb-2">Customer Files</p>
                                                    <div className="flex gap-2">
                                                        {selectedBooking.clientFile && (
                                                            <a
                                                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${selectedBooking.clientFile}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-3 py-2 rounded bg-secondary hover:bg-secondary/80 text-sm"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                Client File
                                                                <Download className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                        {selectedBooking.clientPicture && (
                                                            <a
                                                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${selectedBooking.clientPicture}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-3 py-2 rounded bg-secondary hover:bg-secondary/80 text-sm"
                                                            >
                                                                <ImageIcon className="h-4 w-4" />
                                                                Client Picture
                                                                <Download className="h-3 w-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Designer Information */}
                                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                Designer Information
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Assigned Designer</p>
                                                    <p className="font-medium">{selectedBooking.designerId?.name || 'Not assigned'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Operator Deadline</p>
                                                    <p className="font-medium">
                                                        {selectedBooking.operatorDeadline
                                                            ? new Date(selectedBooking.operatorDeadline).toLocaleString()
                                                            : 'Not set'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Operator Urgency</p>
                                                    <p className="font-medium capitalize">{selectedBooking.operatorUrgency || 'normal'}</p>
                                                </div>
                                            </div>

                                            {/* Design Files */}
                                            {selectedBooking.designFiles && selectedBooking.designFiles.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-border">
                                                    <p className="text-muted-foreground text-sm mb-2">Design Files</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedBooking.designFiles.map((file: string, idx: number) => (
                                                            <a
                                                                key={idx}
                                                                href={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${file}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 px-3 py-2 rounded bg-secondary hover:bg-secondary/80 text-sm"
                                                            >
                                                                <FileText className="h-4 w-4" />
                                                                Design File {idx + 1}
                                                                <Download className="h-3 w-3" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Operator Information */}
                                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" />
                                                Operator Status
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Assigned Operator</p>
                                                    <p className="font-medium">{selectedBooking.operatorId?.name || 'Not assigned'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Status</p>
                                                    <p className="font-medium capitalize">{selectedBooking.status}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Start Time</p>
                                                    <p className="font-medium">
                                                        {selectedBooking.startTime
                                                            ? new Date(selectedBooking.startTime).toLocaleString()
                                                            : 'Not started'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">End Time</p>
                                                    <p className="font-medium">
                                                        {selectedBooking.endTime
                                                            ? new Date(selectedBooking.endTime).toLocaleString()
                                                            : 'Not completed'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cost Information */}
                                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" />
                                                Cost Breakdown
                                            </h3>
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Material Cost</p>
                                                    <p className="font-medium">${selectedBooking.materialCost || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Cutting Cost</p>
                                                    <p className="font-medium">${selectedBooking.cuttingCost || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Cost</p>
                                                    <p className="font-medium text-lg">${selectedBooking.totalCost || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Amount Paid</p>
                                                    <p className="font-medium text-green-400">${selectedBooking.amountPaid || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Remaining</p>
                                                    <p className="font-medium text-red-400">${selectedBooking.remainingBalance || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Payment Status</p>
                                                    <p className="font-medium capitalize">{selectedBooking.paymentStatus || 'unpaid'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Edit History */}
                                        <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                                    <History className="h-4 w-4" />
                                                    Edit History
                                                </h3>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => fetchBookingAudit(selectedBooking._id)}
                                                    disabled={auditLoading}
                                                >
                                                    {auditLoading ? 'Loading...' : 'Load History'}
                                                </Button>
                                            </div>
                                            {bookingAuditLogs.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">Click "Load History" to view edits.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {bookingAuditLogs.map((log: any) => (
                                                        <div key={log._id} className="border rounded-lg p-3 bg-card text-sm">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-semibold text-primary">{log.booker?.name || 'Unknown'}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(log.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-muted-foreground mb-2">{log.description}</p>
                                                            {log.changes && log.changes.length > 0 && (
                                                                <div className="space-y-1">
                                                                    {log.changes.map((c: any, i: number) => (
                                                                        <div key={i} className="flex items-center gap-2 text-xs">
                                                                            <span className="font-mono bg-muted px-1 rounded">{c.field}</span>
                                                                            <span className="text-red-400 line-through">{String(c.oldValue)}</span>
                                                                            <span>→</span>
                                                                            <span className="text-green-400 font-semibold">{String(c.newValue)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Department Distribution */}
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle>Department Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={monthlyStats?.departmentStats || []}
                                                dataKey="count"
                                                nameKey="_id"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label
                                            >
                                                {monthlyStats?.departmentStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Status Breakdown */}
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle>Status Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={monthlyStats?.statusStats || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="_id" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Progress Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Booker Progress */}
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle>Booker Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {bookerProgress.map((booker, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                                            <p className="font-semibold text-sm">{booker.bookerName}</p>
                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                <p>Total: {booker.totalBookings}</p>
                                                <p>Completed: {booker.completedBookings}</p>
                                                <p>Revenue: ${booker.totalRevenue?.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Designer Progress */}
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle>Designer Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {designerProgress.map((designer, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                                            <p className="font-semibold text-sm">{designer.designerName}</p>
                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                <p>Assigned: {designer.assignedBookings}</p>
                                                <p>Completed: {designer.completedDesigns}</p>
                                                <p>Pending: {designer.pendingDesigns}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Operator Progress */}
                            <Card className="border-border">
                                <CardHeader>
                                    <CardTitle>Operator Progress</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {operatorProgress.map((operator, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                                            <p className="font-semibold text-sm">{operator.operatorName}</p>
                                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                <p>Completed: {operator.completedJobs}</p>
                                                <p>In Progress: {operator.inProgressJobs}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* User Management Tab */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle>Create New User</CardTitle>
                                <CardDescription>Add a new booker, designer, or operator</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Name</Label>
                                            <Input
                                                value={newUser.name}
                                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                                required
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label>Email</Label>
                                            <Input
                                                type="email"
                                                value={newUser.email}
                                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                required
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label>Password</Label>
                                            <Input
                                                type="password"
                                                value={newUser.password}
                                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                                required
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label>Role</Label>
                                            <Select
                                                value={newUser.role}
                                                onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                            >
                                                <SelectTrigger className="mt-2">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="booker">Booker</SelectItem>
                                                    <SelectItem value="designer">Designer</SelectItem>
                                                    <SelectItem value="machine_operator">Machine Operator</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Create User
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle>Change Admin Password</CardTitle>
                                <CardDescription>Update your admin account password</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <div>
                                        <Label>Current Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            required
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>New Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            required
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label>Confirm New Password</Label>
                                        <Input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            required
                                            className="mt-2"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        <Lock className="mr-2 h-4 w-4" />
                                        Change Password
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Tab */}
                    <TabsContent value="activity" className="space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Daily Activity Log
                                </CardTitle>
                                <CardDescription>View all actions performed on a specific date</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-medium">Select Date:</Label>
                                        <Input
                                            type="date"
                                            value={activityDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setActivityDate(e.target.value)}
                                            className="w-48"
                                        />
                                    </div>
                                    <Button onClick={() => fetchActivityLogs(activityDate)} disabled={activityLoading}>
                                        {activityLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                        Load Activity
                                    </Button>
                                    <span className="text-sm text-muted-foreground">{activityLogs.length} events found</span>
                                </div>

                                {activityLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : activityLogs.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">No activity recorded for this date.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {activityLogs.map((log: any) => {
                                            const isExpanded = expandedActivity === log._id
                                            const actionColors: Record<string, string> = {
                                                booking_created: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                                booking_payment_updated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                                booking_edited: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                                ledger_customer_created: 'bg-green-500/20 text-green-400 border-green-500/30',
                                                ledger_booking_added: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
                                            }
                                            const actionLabel: Record<string, string> = {
                                                booking_created: '📋 Booking Created',
                                                booking_payment_updated: '💳 Payment Updated',
                                                booking_edited: '✏️ Booking Edited',
                                                ledger_customer_created: '👤 Ledger Customer Created',
                                                ledger_booking_added: '📒 Ledger Booking Added',
                                            }
                                            return (
                                                <div key={log._id} className="border rounded-lg overflow-hidden">
                                                    <div
                                                        className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                                        onClick={() => setExpandedActivity(isExpanded ? null : log._id)}
                                                    >
                                                        <div className="flex items-start gap-3 flex-1">
                                                            <div className="mt-0.5">
                                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${actionColors[log.action] || 'bg-muted text-muted-foreground border-muted'}`}>
                                                                        {actionLabel[log.action] || log.action}
                                                                    </span>
                                                                    <span className="font-semibold text-sm">{log.booker?.name || 'Unknown'}</span>
                                                                    {log.bookingId && (
                                                                        <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                                                                            {log.bookingId.shortId}
                                                                        </span>
                                                                    )}
                                                                    {log.ledgerCustomerId && (
                                                                        <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                                                                            {log.ledgerCustomerId.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground shrink-0 ml-4">
                                                            {new Date(log.createdAt).toLocaleTimeString()}
                                                        </span>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="px-12 pb-4 pt-2 bg-muted/10 border-t space-y-3">
                                                            {/* Booking details */}
                                                            {log.bookingId && (
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                                    <div>
                                                                        <p className="text-muted-foreground">Customer</p>
                                                                        <p className="font-semibold">{log.bookingId.customerName}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">Total Cost</p>
                                                                        <p className="font-semibold">${(log.bookingId.totalCost || 0).toFixed(2)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">Amount Paid</p>
                                                                        <p className="font-semibold text-green-400">${(log.bookingId.amountPaid || 0).toFixed(2)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">Remaining</p>
                                                                        <p className="font-semibold text-red-400">${(log.bookingId.remainingBalance || 0).toFixed(2)}</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {/* Ledger customer details */}
                                                            {log.ledgerCustomerId && (
                                                                <div className="text-sm">
                                                                    <p className="text-muted-foreground">Phone</p>
                                                                    <p className="font-semibold">{log.ledgerCustomerId.phone}</p>
                                                                </div>
                                                            )}
                                                            {/* Field changes */}
                                                            {log.changes && log.changes.length > 0 && (
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-semibold text-muted-foreground">Field Changes:</p>
                                                                    {log.changes.map((c: any, i: number) => (
                                                                        <div key={i} className="flex items-center gap-2 text-sm">
                                                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{c.field}</span>
                                                                            <span className="text-red-400 line-through">{String(c.oldValue)}</span>
                                                                            <span className="text-muted-foreground">→</span>
                                                                            <span className="text-green-400 font-semibold">{String(c.newValue)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Cash Flow Tab */}
                    <TabsContent value="cash-flow" className="space-y-6">
                        <Card className="border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="h-5 w-5" />
                                    Daily Cash Flow
                                </CardTitle>
                                <CardDescription>View detailed cash flow breakdown for a specific date</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-sm font-medium">Select Date:</Label>
                                        <Input
                                            type="date"
                                            value={cashFlowDate}
                                            onChange={(e) => setCashFlowDate(e.target.value)}
                                            className="w-48"
                                        />
                                    </div>
                                    <Button onClick={() => fetchCashFlow(cashFlowDate)} disabled={cashFlowLoading}>
                                        {cashFlowLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                                        Load Cash Flow
                                    </Button>
                                    <span className="text-sm text-muted-foreground">{cashFlowData.bookings.length} Income, {cashFlowData.expenses.length} Expense records</span>
                                </div>

                                {cashFlowLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                                                <div className="text-sm text-green-700 dark:text-green-400 font-semibold mb-1 uppercase tracking-wider">Money Made (Income)</div>
                                                <div className="text-3xl font-bold text-green-800 dark:text-green-300">
                                                    ${cashFlowData.bookings.reduce((sum, b) => sum + (b.totalCost || 0), 0).toFixed(2)}
                                                </div>
                                                <div className="text-sm text-green-600 dark:text-green-500 mt-2">
                                                    Total Paid: ${cashFlowData.bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                                                <div className="text-sm text-red-700 dark:text-red-400 font-semibold mb-1 uppercase tracking-wider">Money Given (Expenses)</div>
                                                <div className="text-3xl font-bold text-red-800 dark:text-red-300">
                                                    ${cashFlowData.expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                                                <div className="text-sm text-blue-700 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider">Remaining Money (Unpaid)</div>
                                                <div className="text-3xl font-bold text-blue-800 dark:text-blue-300">
                                                    ${cashFlowData.bookings.reduce((sum, b) => sum + (b.remainingBalance || 0), 0).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transactions List */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg border-b pb-2">Transactions History</h3>
                                            
                                            {cashFlowData.bookings.length === 0 && cashFlowData.expenses.length === 0 && (
                                                <div className="text-center py-8 text-muted-foreground italic">No transactions for this date.</div>
                                            )}

                                            <div className="space-y-2">
                                                {/* Iterate over combined, sorted list */}
                                                {[
                                                    ...cashFlowData.bookings.map(b => ({ ...b, tType: 'income', tDate: new Date(b.createdAt).getTime() })),
                                                    ...cashFlowData.expenses.map(e => ({ ...e, tType: 'expense', tDate: new Date(e.createdAt || e.date).getTime() }))
                                                ].sort((a, b) => b.tDate - a.tDate).map((t: any) => {
                                                    const isIncome = t.tType === 'income';
                                                    const isExpanded = expandedCashFlowItem?.id === t._id && expandedCashFlowItem?.type === t.tType;

                                                    return (
                                                        <div key={`${t.tType}-${t._id}`} className={`border rounded-lg overflow-hidden ${isIncome ? 'border-green-200/50' : 'border-red-200/50'}`}>
                                                            <div 
                                                                className={`flex items-center justify-between p-4 cursor-pointer hover:opacity-80 transition-opacity ${isIncome ? 'bg-green-50/30' : 'bg-red-50/30'}`}
                                                                onClick={() => setExpandedCashFlowItem(isExpanded ? null : { type: t.tType, id: t._id })}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                                    <div className={`p-1.5 rounded-full ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                                        {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-semibold">{isIncome ? t.customerName : t.head}</div>
                                                                        <div className="text-xs text-muted-foreground">{isIncome ? t.shortId : t.category || "General Expense"}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    {isIncome && <span className={`text-xs px-2 py-1 rounded-full ${t.remainingBalance === 0 ? 'bg-green-100 text-green-700' : t.amountPaid > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {t.remainingBalance === 0 ? 'Fully Paid' : t.amountPaid > 0 ? 'Partial' : 'Unpaid'}
                                                                    </span>}
                                                                    <div className={`font-bold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {isIncome ? '+' : '-'}${isIncome ? (t.totalCost || 0).toFixed(2) : (t.amount || 0).toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="p-4 bg-muted/10 border-t text-sm">
                                                                    {isIncome ? (
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                            <div><p className="text-muted-foreground">Booker</p><p className="font-medium">{t.bookerId?.name || "Unknown"}</p></div>
                                                                            <div><p className="text-muted-foreground">Material</p><p className="font-medium">{t.materialConsume}</p></div>
                                                                            <div><p className="text-muted-foreground">Job Description</p><p className="font-medium truncate" title={t.jobDescription}>{t.jobDescription}</p></div>
                                                                            <div><p className="text-muted-foreground">Payment Method</p><p className="font-medium capitalize">{t.paymentMethod || "cash"}</p></div>
                                                                            
                                                                            <div className="col-span-2 md:col-span-4 mt-2 p-3 bg-secondary/50 rounded-lg flex justify-between">
                                                                                <div><span className="text-muted-foreground mr-2">Total Amount:</span><span className="font-bold">${(t.totalCost || 0).toFixed(2)}</span></div>
                                                                                <div><span className="text-muted-foreground mr-2">Paid:</span><span className="font-bold text-green-600">${(t.amountPaid || 0).toFixed(2)}</span></div>
                                                                                <div><span className="text-muted-foreground mr-2">Remaining:</span><span className="font-bold text-red-600">${(t.remainingBalance || 0).toFixed(2)}</span></div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div><p className="text-muted-foreground">Category</p><p className="font-medium">{t.category || "N/A"}</p></div>
                                                                            <div><p className="text-muted-foreground">Description</p><p className="font-medium">{t.description || "N/A"}</p></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </main>
            <Footer />
        </div>
    )
}
