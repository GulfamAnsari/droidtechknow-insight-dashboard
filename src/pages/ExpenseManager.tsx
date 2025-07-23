import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Calendar,
  Info,
  Eye,
  Bell,
  CreditCard,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
  paymentMode?: string;
}

function extractTextFromHtml(htmlString) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlString;
  return tempDiv.textContent || tempDiv.innerText || "";
}

// Enhanced regex patterns for bank transaction parsing
const TRANSACTION_PATTERNS = {
  // Amount patterns - comprehensive patterns for Indian banks
  amount: [
    // Bank specific amount patterns
    /(?:RS|INR|MRP)\.?\s*([\d,]+(?:\.\d{1,2})?)/i
  ],

  // Debit patterns - bank-specific language
  // Debit patterns - enhanced for bank transaction language
  debit: [
    // Core debit keywords
    /\b(?:debited|deducted|withdrawn|paid|spent|charged|purchased|billed|using your\s+([A-Za-z& ]+?)\s+Credit Card|auto[- ]?debit(?:ed)?)\b/gi,

    // Payment activity (send/made)
    /\b(?:payment made|money sent|transferred to|fund transferred|using your credit card|has been debited|used for payment)\b/gi,

    // Other debit-related usage
    /\b(?:card.*?used|transaction.*?processed|using your.*?credit card|purchase.*?made|emi.*?debited|loan.*?deducted)\b/gi,
    /\b(?:insurance.*?premium|utility.*?payment|recharge.*?successful|atm withdrawal|cash withdrawn)\b/gi
  ],

  credit: [
    // Core credit indicators
    /\b(?:credited|deposited|received(?! from you)|refund(?:ed)?|cashback|bonus|salary|reversal)\b/gi,

    // Descriptive credits
    /\b(?:money received from|amount added|fund(?:s)? credited|interest credited|dividend paid|refund processed)\b/gi,

    // Other valid credit triggers
    /\b(?:transferred from|received from|deposit(?:ed)?|loan credited|income received|upi received)\b/gi
  ],

  // Merchant patterns - enhanced for Indian context
  merchant: [
    // Enhanced merchant detection patterns
    /(?:at|to|from|via)\s+([A-Za-z0-9&.\s-]{3,40})(?:\s+(?:on|for|with)|$)/gi,
    /(?:paid\s+to|transaction\s+at|purchase\s+at|payment\s+to)\s+([A-Za-z0-9&.\s-]{3,40})/gi,
    /(?:merchant|store|shop):\s*([A-Za-z0-9&.\s-]{3,40})/gi,
    /([A-Z][A-Za-z0-9\s&.-]{2,30})\s+(?:payment|transaction|purchase|bill)/gi,
    /\b([A-Z][A-Za-z0-9\s&.-]{2,25})\s+(?:UPI|card|online)/gi
  ],

  // Payment mode patterns
  paymentMode: [
    /\b(?:upi|credit card|debit card|net banking|wallet|cash|cheque|neft|rtgs|imps)\b/gi,
    /\b(?:visa|mastercard|rupay|american express|amex)\b/gi,
    /\b(?:paytm|phonepe|googlepay|amazon pay|freecharge)\b/gi
  ]
};

const ExpenseManager = () => {
  const [emailTransactions, setEmailTransactions] = useState<
    EmailTransaction[]
  >([]);
  const [parsedTransactions, setParsedTransactions] = useState<
    ParsedTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [billReminders, setBillReminders] = useState([]);

  // Filter parameters
  const [dateRange, setDateRange] = useState("30days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allowedSenders, setAllowedSenders] = useState(true);
  const [labelIds, setLabelIds] = useState("INBOX");
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // Bank list for filtering
  const banksList = [
    "HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Bank",
    "PNB", "BOB", "Canara Bank", "Yes Bank", "IDFC First Bank",
    "IndusInd Bank", "RBL Bank", "Federal Bank", "Citi Bank", "Standard Chartered"
  ];

  // Calculate date range based on selection
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (range) {
      case "7days":
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { start: sevenDaysAgo.toISOString().split('T')[0], end: today };
      case "30days":
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { start: thirtyDaysAgo.toISOString().split('T')[0], end: today };
      case "3months":
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { start: threeMonthsAgo.toISOString().split('T')[0], end: today };
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: thirtyDaysAgo.toISOString().split('T')[0], end: today };
    }
  };

  // Initialize with 30 days default
  useEffect(() => {
    const { start, end } = getDateRange("30days");
    setStartDate(start);
    setEndDate(end);
  }, []);

  const parseEmailContent = (email: EmailTransaction): ParsedTransaction => {
    const content = `${email.subject} ${extractTextFromHtml(
      email.html
    )}`.toLowerCase();

    // Extract amount
    let amount: number | undefined;
    for (const pattern of TRANSACTION_PATTERNS.amount) {
      const match = pattern.exec(content);
      if (match) {
        const amountStr = match[1].replace(/,/g, "");
        amount = parseFloat(amountStr);
        break;
      }
    }

    // Determine transaction type
    let type: "debited" | "credited" | undefined;
    const isDebit = TRANSACTION_PATTERNS.debit.find((pattern) =>
      pattern.test(content)
    );
    const isCredit = TRANSACTION_PATTERNS.credit.find((pattern) =>
      pattern.test(content)
    );
    console.log(isDebit, isCredit);

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
        merchant = fromMatch[1].split("@")[0].replace(/[-_.]/g, " ");
      } else {
        merchant = email.from.split("<")[0].trim();
      }
    }

    // Extract payment mode
    let paymentMode: string | undefined;
    for (const pattern of TRANSACTION_PATTERNS.paymentMode) {
      const match = pattern.exec(content);
      if (match) {
        paymentMode = match[0].trim();
        break;
      }
    }

    return {
      email,
      amount,
      type,
      merchant,
      paymentMode,
      parsedDate: new Date(email.date).toLocaleDateString()
    };
  };

  const fetchTransactions = async () => {
    try {
      const { start, end } = getDateRange(dateRange);
      const params = new URLSearchParams({
        route: "transactions",
        startDate: start,
        endDate: end,
        allowedSenders: allowedSenders.toString(),
        labelIds,
        ...(selectedBanks.length > 0 && { banks: selectedBanks.join(',') })
      });

      const response = await fetch(
        `https://droidtechknow.com/admin/api/auth/google-auth.php?${params}`,
        {
          credentials: "include"
        }
      );

      if (response.ok) {
        const data: EmailTransaction[] = await response.json();
        setEmailTransactions(data);
        setIsAuthenticated(true);

        // Parse transactions
        const parsed = data.map(parseEmailContent);
        setParsedTransactions(parsed);

        // Extract bill reminders from email data
        const bills = extractBillReminders(data);
        setBillReminders(bills);
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        toast.error("Please authenticate with Google to view transactions");
      } else {
        toast.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Extract bill reminders from email data
  const extractBillReminders = (emails: EmailTransaction[]) => {
    const billKeywords = ['total amount due', 'minimum due', 'bses yamuna', 'credit card', 'credit card'];
    const bills = [];

    emails.forEach(email => {
      const content = `${email.subject} ${extractTextFromHtml(email.html)}`.toLowerCase();
      const hasBillKeyword = billKeywords.some(keyword => content.includes(keyword));
      
      if (hasBillKeyword) {
        // Extract amount and due date from email content
        const amountMatch = content.match(/(?:RS|INR|MRP)\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
        const dueDateMatch = content.match(/due\s+(?:date|on)?\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
        
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        const dueDate = dueDateMatch ? dueDateMatch[1] : null;
        
        if (amount > 0) {
          bills.push({
            id: email.messageId,
            merchant: email.from.split('<')[0].trim(),
            amount: amount,
            dueDate: dueDate,
            type: 'bill'
          });
        }
      }
    });

    return bills.slice(0, 5); // Return top 5 bills
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

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value !== "custom") {
      const { start, end } = getDateRange(value);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleGoogleSignIn = () => {
    window.location.href = 'https://droidtechknow.com/admin/api/auth/google-auth.php?route=auth';
  };

  // Calculate totals from parsed transactions
  const transactionsWithAmounts = parsedTransactions.filter(
    (t) => t.amount && t.type
  );

  const totalDebited = transactionsWithAmounts
    .filter((t) => t.type === "debited")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCredited = transactionsWithAmounts
    .filter((t) => t.type === "credited")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netAmount = totalCredited - totalDebited;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b">
      <div className="flex-1 overflow-auto p-8 w-full">
        <div className="max-w-8xl mx-auto">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Expense Manager</h1>
              <p className="text-muted-foreground">
                Track your transactions from Gmail
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              size="sm"
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Authentication Check */}
          {!isAuthenticated ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center space-y-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Sign in to Google</h3>
                    <p className="text-gray-600 mt-2">
                      Access your Gmail transaction data securely
                    </p>
                  </div>
                  <Button 
                    onClick={handleGoogleSignIn} 
                    className="relative h-12 px-8 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filters */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="min-w-0">
                      <Select value={dateRange} onValueChange={handleDateRangeChange}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7days">Last 7 days</SelectItem>
                          <SelectItem value="30days">Last 30 days</SelectItem>
                          <SelectItem value="3months">Last 3 months</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {dateRange === "custom" && (
                      <>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-32 h-8 text-xs"
                        />
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-32 h-8 text-xs"
                        />
                      </>
                    )}
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          Banks ({selectedBanks.length})
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2">
                        <div className="space-y-2 max-h-48 overflow-auto">
                          {banksList.map((bank) => (
                            <div key={bank} className="flex items-center space-x-2">
                              <Checkbox
                                id={bank}
                                checked={selectedBanks.includes(bank)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedBanks([...selectedBanks, bank]);
                                  } else {
                                    setSelectedBanks(selectedBanks.filter(b => b !== bank));
                                  }
                                }}
                              />
                              <Label htmlFor={bank} className="text-xs font-normal">
                                {bank}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    
                    <Input
                      value={labelIds}
                      onChange={(e) => setLabelIds(e.target.value)}
                      placeholder="INBOX"
                      className="w-20 h-8 text-xs"
                    />
                    
                    <div className="flex items-center space-x-1">
                      <Switch
                        id="allowedSenders"
                        checked={allowedSenders}
                        onCheckedChange={setAllowedSenders}
                        className="scale-75"
                      />
                      <Label htmlFor="allowedSenders" className="text-xs">Bank Only</Label>
                    </div>
                    
                    <Button onClick={handleApplyFilters} disabled={isLoading} size="sm" className="h-8 text-xs">
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Summary Cards */}
          {isAuthenticated && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Debited
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalDebited.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Money spent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Credited
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalCredited.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Money received</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Net Amount
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    netAmount >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ₹{netAmount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Overall balance</p>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Transactions Table */}
          {isAuthenticated && (
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
            <CardContent className="overflow-hidden">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : parsedTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions found</p>
                  <p className="text-sm">
                    Try adjusting your filters or check your Gmail
                    authentication
                  </p>
                </div>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedTransactions.map((transaction, index) => (
                        <TableRow key={transaction.email.messageId || index}>
                          <TableCell className="font-medium">
                            {transaction.parsedDate}
                          </TableCell>
                          <TableCell
                            className="max-w-32 truncate"
                            title={transaction.email.from}
                          >
                            {transaction.email.from.split("<")[0].trim() ||
                              transaction.email.from}
                          </TableCell>
                          <TableCell
                            className="max-w-48 truncate"
                            title={transaction.email.subject}
                          >
                            {transaction.email.subject}
                          </TableCell>
                          <TableCell>
                            {transaction.merchant || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {transaction.paymentMode ? (
                              <Badge variant="outline" className="text-xs">
                                {transaction.paymentMode}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {transaction.type ? (
                               <Badge
                                 variant={
                                   transaction.type === "debited"
                                     ? "destructive"
                                     : "secondary"
                                 }
                                 className={
                                   transaction.type === "credited"
                                     ? "bg-green-100 text-green-800 hover:bg-green-200"
                                     : ""
                                 }
                               >
                                 {transaction.type === "debited"
                                   ? "Debited"
                                   : "Credited"}
                               </Badge>
                            ) : (
                              <Badge variant="secondary">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              transaction.type === "debited"
                                ? "text-red-600"
                                : transaction.type === "credited"
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {transaction.amount ? (
                              <>
                                {transaction.type === "debited"
                                  ? "-"
                                  : transaction.type === "credited"
                                  ? "+"
                                  : ""}
                                ₹{transaction.amount.toFixed(2)}
                              </>
                            ) : (
                              "N/A"
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
                                    <h4 className="font-semibold">
                                      HTML Content:
                                    </h4>
                                    <div
                                      className="border p-4 max-h-96 overflow-auto bg-muted"
                                      dangerouslySetInnerHTML={{
                                        __html: transaction.email.html
                                      }}
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
                </div>
              )}
            </CardContent>
            </Card>
          )}
            </div>

            {/* Bill Reminders Sidebar */}
            <div className="w-80">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Bill Reminders
                  </CardTitle>
                  <CardDescription>
                    Upcoming due bills and payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {billReminders.length > 0 ? (
                      billReminders.map((bill, index) => (
                        <div key={bill.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="font-medium text-sm">{bill.merchant}</p>
                              <p className="text-xs text-muted-foreground">Bill Reminder</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm text-red-600">₹{bill.amount?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {bill.dueDate || "Due soon"}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No bill reminders found</p>
                        <p className="text-xs">Bills will appear here when detected from emails</p>
                      </div>
                    )}
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    View All Bills
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManager;
