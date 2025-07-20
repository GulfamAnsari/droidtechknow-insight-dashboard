import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, DollarSign, TrendingDown, TrendingUp, Calendar, Info, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EmailTransaction {
  from: string;
  subject: string;
  date: string;
  messageId: string;
  html: string;
}

interface ParsedTransaction {
  email: EmailTransaction;
  amount?: number;
  type?: "debited" | "credited";
  merchant?: string;
  parsedDate: string;
}

// Regex patterns for transaction parsing
const TRANSACTION_PATTERNS = {
  // Amount patterns
  amount: [
    /(?:Rs\.?\s*|₹\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(?:INR\s*|rupees?\s*)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:rs\.?|₹|inr|rupees?)/gi
  ],
  
  // Debit patterns
  debit: [
    /debited|deducted|withdrawn|paid|spent|charged|purchase|transaction|bill/gi,
    /amount\s+(?:of\s+)?(?:rs\.?\s*|₹\s*)?[\d,.]+ (?:has been )?(?:debited|deducted|withdrawn)/gi
  ],
  
  // Credit patterns
  credit: [
    /credited|deposited|received|refund|cashback|reward|bonus/gi,
    /amount\s+(?:of\s+)?(?:rs\.?\s*|₹\s*)?[\d,.]+ (?:has been )?(?:credited|deposited)/gi
  ],
  
  // Merchant patterns
  merchant: [
    /(?:at|from|to|merchant)\s+([A-Za-z][A-Za-z0-9\s&\-\.]{2,50})/gi,
    /transaction\s+(?:at|with)\s+([A-Za-z][A-Za-z0-9\s&\-\.]{2,50})/gi,
    /purchase\s+(?:at|from)\s+([A-Za-z][A-Za-z0-9\s&\-\.]{2,50})/gi
  ]
};

const ExpenseManager = () => {
  const [emailTransactions, setEmailTransactions] = useState<EmailTransaction[]>([]);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter parameters
  const [startDate, setStartDate] = useState("2025-07-01");
  const [endDate, setEndDate] = useState("2025-07-20");
  const [allowedSenders, setAllowedSenders] = useState(false);
  const [labelIds, setLabelIds] = useState("INBOX");

  const parseEmailContent = (email: EmailTransaction): ParsedTransaction => {
    const content = `${email.subject} ${email.html}`.toLowerCase();
    
    // Extract amount
    let amount: number | undefined;
    for (const pattern of TRANSACTION_PATTERNS.amount) {
      const match = pattern.exec(content);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        amount = parseFloat(amountStr);
        break;
      }
    }
    
    // Determine transaction type
    let type: "debited" | "credited" | undefined;
    const isDebit = TRANSACTION_PATTERNS.debit.some(pattern => pattern.test(content));
    const isCredit = TRANSACTION_PATTERNS.credit.some(pattern => pattern.test(content));
    
    if (isDebit && !isCredit) type = "debited";
    else if (isCredit && !isDebit) type = "credited";
    
    // Extract merchant
    let merchant: string | undefined;
    for (const pattern of TRANSACTION_PATTERNS.merchant) {
      const match = pattern.exec(content);
      if (match) {
        merchant = match[1].trim();
        break;
      }
    }
    
    // Fallback merchant from email sender
    if (!merchant) {
      const fromMatch = email.from.match(/<([^>]+)>/);
      if (fromMatch) {
        merchant = fromMatch[1].split('@')[0].replace(/[-_.]/g, ' ');
      } else {
        merchant = email.from.split('<')[0].trim();
      }
    }
    
    return {
      email,
      amount,
      type,
      merchant,
      parsedDate: new Date(email.date).toLocaleDateString()
    };
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({
        route: 'transactions',
        startDate,
        endDate,
        allowedSenders: allowedSenders.toString(),
        labelIds
      });
      
      const response = await fetch(`https://droidtechknow.com/admin/api/auth/google-auth.php?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data: EmailTransaction[] = await response.json();
        setEmailTransactions(data);
        
        // Parse transactions
        const parsed = data.map(parseEmailContent);
        setParsedTransactions(parsed);
      } else if (response.status === 401) {
        toast.error("Please authenticate with Google to view transactions");
      } else {
        toast.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error("Failed to fetch transactions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions();
  };

  const handleApplyFilters = () => {
    setIsLoading(true);
    fetchTransactions();
  };

  // Calculate totals from parsed transactions
  const transactionsWithAmounts = parsedTransactions.filter(t => t.amount && t.type);
  
  const totalDebited = transactionsWithAmounts
    .filter(t => t.type === 'debited')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCredited = transactionsWithAmounts
    .filter(t => t.type === 'credited')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netAmount = totalCredited - totalDebited;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Manager</h1>
          <p className="text-muted-foreground">Track your transactions from Gmail</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoading || isRefreshing}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Configure transaction search parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labelIds">Label IDs</Label>
              <Input
                id="labelIds"
                value={labelIds}
                onChange={(e) => setLabelIds(e.target.value)}
                placeholder="INBOX"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="allowedSenders"
                checked={allowedSenders}
                onCheckedChange={setAllowedSenders}
              />
              <Label htmlFor="allowedSenders">Allowed Senders Only</Label>
            </div>
          </div>
          <Button onClick={handleApplyFilters} disabled={isLoading}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debited</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalDebited.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Money spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credited</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalCredited.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Money received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Overall balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Email Transactions ({parsedTransactions.length} found)
          </CardTitle>
          <CardDescription>
            Transactions extracted from Gmail using regex patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : parsedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions found</p>
              <p className="text-sm">Try adjusting your filters or check your Gmail authentication</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedTransactions.map((transaction, index) => (
                  <TableRow key={transaction.email.messageId || index}>
                    <TableCell className="font-medium">{transaction.parsedDate}</TableCell>
                    <TableCell className="max-w-32 truncate" title={transaction.email.from}>
                      {transaction.email.from.split('<')[0].trim() || transaction.email.from}
                    </TableCell>
                    <TableCell className="max-w-48 truncate" title={transaction.email.subject}>
                      {transaction.email.subject}
                    </TableCell>
                    <TableCell>{transaction.merchant || "Unknown"}</TableCell>
                    <TableCell>
                      {transaction.type ? (
                        <Badge variant={transaction.type === 'debited' ? 'destructive' : 'default'}>
                          {transaction.type === 'debited' ? 'Debited' : 'Credited'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unknown</Badge>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'debited' ? 'text-red-600' : 
                      transaction.type === 'credited' ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      {transaction.amount ? (
                        <>
                          {transaction.type === 'debited' ? '-' : transaction.type === 'credited' ? '+' : ''}
                          ₹{transaction.amount.toFixed(2)}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Email Content</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">Subject:</h4>
                              <p>{transaction.email.subject}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">From:</h4>
                              <p>{transaction.email.from}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">Date:</h4>
                              <p>{transaction.email.date}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">HTML Content:</h4>
                              <div 
                                className="border p-4 max-h-96 overflow-auto bg-muted"
                                dangerouslySetInnerHTML={{ __html: transaction.email.html }}
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseManager;