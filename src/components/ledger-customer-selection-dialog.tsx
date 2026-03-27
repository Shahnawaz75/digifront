import { useState, useEffect } from "react"
import apiClient from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, X, Check } from "lucide-react"

interface LedgerCustomer {
    _id: string
    name: string
    phone: string
    totalBalance: number
}

interface LedgerCustomerSelectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCustomerSelected: (customer: LedgerCustomer) => void
}

export function LedgerCustomerSelectionDialog({
    open,
    onOpenChange,
    onCustomerSelected
}: LedgerCustomerSelectionDialogProps) {
    const [customers, setCustomers] = useState<LedgerCustomer[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open) fetchCustomers()
    }, [open])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const response = await apiClient.get('/api/ledger')
            setCustomers(response.data)
        } catch (err) {
            console.error('Error fetching ledger customers:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectCustomer = (customer: LedgerCustomer) => {
        onCustomerSelected(customer)
        onOpenChange(false)
    }

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[85vw] w-[85vw] h-[90vh] rounded-2xl p-0 flex flex-col bg-background overflow-hidden">
                {/* Header */}
                <DialogHeader className="px-8 py-6 border-b shrink-0 flex flex-row items-center justify-between bg-card text-card-foreground">
                    <DialogTitle className="text-3xl font-bold">Select Customer</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10">
                        <X className="h-6 w-6" />
                    </Button>
                </DialogHeader>

                <div className="flex-1 w-full max-w-5xl mx-auto p-8 flex flex-col gap-8 h-full">
                    {/* Top Panel: Search */}
                    <div className="bg-card rounded-xl border shadow-sm p-8 shrink-0">
                        <h2 className="text-2xl font-semibold mb-6">Find Customer</h2>

                        <div className="relative">
                            <Search className="absolute left-5 top-5 h-6 w-6 text-muted-foreground" />
                            <Input
                                className="h-16 pl-16 text-xl rounded-2xl bg-muted/30 border-2 border-transparent focus:bg-background focus:border-primary transition-all shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or phone number..."
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-between mt-4 px-2">
                            <p className="text-base text-muted-foreground font-medium">
                                Showing {filteredCustomers.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-base text-muted-foreground italic">
                                Click anywhere on a row to select
                            </p>
                        </div>
                    </div>

                    {/* Bottom Panel: Customer Table */}
                    <div className="border rounded-xl bg-card overflow-hidden shadow-sm flex-1 flex flex-col">
                        <div className="overflow-y-auto flex-1 h-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                                    <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
                                    <p className="text-xl font-medium">Loading customers...</p>
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground">
                                    <div className="bg-muted p-6 rounded-full mb-6">
                                        <Search className="h-12 w-12 opacity-50" />
                                    </div>
                                    <p className="text-2xl font-semibold text-foreground mb-2">No customers found</p>
                                    <p className="text-lg">Try adjusting your search query.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-lg font-semibold py-5 px-8 text-foreground w-1/3">Customer Name</TableHead>
                                            <TableHead className="text-lg font-semibold py-5 px-8 text-foreground w-1/3">Phone Number</TableHead>
                                            <TableHead className="text-lg font-semibold py-5 px-8 text-right text-foreground w-1/3">Current Balance</TableHead>
                                            <TableHead className="w-24"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCustomers.map(customer => (
                                            <TableRow
                                                key={customer._id}
                                                className="cursor-pointer hover:bg-primary/5 group transition-colors border-b last:border-0"
                                                onClick={() => handleSelectCustomer(customer)}
                                            >
                                                <TableCell className="font-bold text-xl py-6 px-8 text-foreground group-hover:text-primary transition-colors">
                                                    {customer.name}
                                                </TableCell>
                                                <TableCell className="py-6 px-8 text-lg font-medium text-muted-foreground">
                                                    {customer.phone}
                                                </TableCell>
                                                <TableCell className="py-6 px-8 text-right">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-lg font-bold border ${customer.totalBalance > 0
                                                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                                                        : 'bg-green-500/10 text-green-600 border-green-500/20'
                                                        }`}>
                                                        ${customer.totalBalance.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-6 pr-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="bg-primary text-primary-foreground p-2 rounded-full inline-flex">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}
