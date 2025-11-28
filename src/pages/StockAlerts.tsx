import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Search, ListPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StockAlert {
  id: string;
  symbol: string;
  threshold: number;
  type: "up" | "down";
  currentPrice?: number;
  triggered: boolean;
  lastChecked?: Date;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

// Nifty 50 stocks with NSE suffix
const NIFTY_50_STOCKS = [
  "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
  "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BPCL.NS", "BHARTIARTL.NS",
  "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DIVISLAB.NS", "DRREDDY.NS",
  "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
  "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS", "ITC.NS",
  "INDUSINDBK.NS", "INFY.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "LT.NS",
  "M&M.NS", "MARUTI.NS", "NTPC.NS", "NESTLEIND.NS", "ONGC.NS",
  "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SHRIRAMFIN.NS", "SBIN.NS",
  "SUNPHARMA.NS", "TCS.NS", "TATACONSUM.NS", "TATAMOTORS.NS", "TATASTEEL.NS",
  "TECHM.NS", "TITAN.NS", "ULTRACEMCO.NS", "UPL.NS", "WIPRO.NS"
];

export default function StockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [alertType, setAlertType] = useState<"up" | "down">("up");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);

  // Fetch current price for a stock
  const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
        return data.chart.result[0].meta.regularMarketPrice;
      }
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
    return null;
  };

  // Search stocks
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchStocks = async () => {
      setIsSearching(true);
      try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=10&newsCount=0`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data?.quotes) {
          const results: SearchResult[] = data.quotes
            .filter((q: any) => q.symbol && q.shortname)
            .map((q: any) => ({
              symbol: q.symbol,
              name: q.shortname || q.longname || q.symbol,
              exchange: q.exchDisp || q.exchange || "",
            }))
            .slice(0, 10);
          
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Error searching stocks:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchStocks, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isMonitoring || alerts.length === 0) return;

    const checkAlerts = async () => {
      for (const alert of alerts) {
        if (alert.triggered) continue;

        try {
          const currentPrice = await fetchCurrentPrice(alert.symbol);
          
          if (currentPrice !== null) {
            setAlerts((prev) =>
              prev.map((a) =>
                a.id === alert.id
                  ? { ...a, currentPrice, lastChecked: new Date() }
                  : a
              )
            );

            const shouldTrigger =
              (alert.type === "up" && currentPrice >= alert.threshold) ||
              (alert.type === "down" && currentPrice <= alert.threshold);

            if (shouldTrigger) {
              setAlerts((prev) =>
                prev.map((a) =>
                  a.id === alert.id ? { ...a, triggered: true } : a
                )
              );
              
              toast.error(
                `Alert: ${alert.symbol} ${alert.type === "up" ? "crossed above" : "dropped below"} ₹${alert.threshold}`,
                {
                  description: `Current price: ₹${currentPrice.toFixed(2)}`,
                  duration: 10000,
                }
              );
            }
          }
        } catch (error) {
          console.error(`Error checking ${alert.symbol}:`, error);
        }
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [alerts, isMonitoring]);

  const addAlert = async (symbol?: string, threshold?: string) => {
    const sym = symbol || newSymbol;
    const thresh = threshold || newThreshold;
    
    if (!sym || !thresh) {
      toast.error("Please fill in all fields");
      return;
    }

    // Fetch current price
    const currentPrice = await fetchCurrentPrice(sym.toUpperCase());

    const alert: StockAlert = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: sym.toUpperCase(),
      threshold: parseFloat(thresh),
      type: alertType,
      triggered: false,
      currentPrice: currentPrice || undefined,
      lastChecked: currentPrice ? new Date() : undefined,
    };

    setAlerts((prev) => [...prev, alert]);
    
    if (!symbol) {
      setNewSymbol("");
      setNewThreshold("");
    }
    
    toast.success(`Alert added for ${alert.symbol}${currentPrice ? ` (Current: ₹${currentPrice.toFixed(2)})` : ""}`);
  };

  const addNifty50Alerts = async () => {
    if (!newThreshold) {
      toast.error("Please set a threshold price first");
      return;
    }

    toast.loading("Adding Nifty 50 stocks...");
    
    for (const symbol of NIFTY_50_STOCKS) {
      await addAlert(symbol, newThreshold);
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast.success("Added all Nifty 50 stocks!");
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alert removed");
  };

  const resetAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, triggered: false } : a))
    );
    toast.success("Alert reset");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Day Trading Alerts</h1>
          <p className="text-muted-foreground">Monitor stocks and get alerts when thresholds are crossed</p>
        </div>
        <Button
          variant={isMonitoring ? "destructive" : "default"}
          onClick={() => setIsMonitoring(!isMonitoring)}
        >
          <Bell className="mr-2 h-4 w-4" />
          {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Alert</CardTitle>
          <CardDescription>Search stocks and configure alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Popover open={openSearch} onOpenChange={setOpenSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSearch}
                    className="w-full justify-between"
                  >
                    {newSymbol || "Search stocks..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search stocks..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching ? "Searching..." : "No stocks found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {searchResults.map((result) => (
                          <CommandItem
                            key={result.symbol}
                            value={result.symbol}
                            onSelect={(value) => {
                              setNewSymbol(value.toUpperCase());
                              setOpenSearch(false);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{result.symbol}</span>
                              <span className="text-xs text-muted-foreground">
                                {result.name} • {result.exchange}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold Price (₹)</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Alert Type</Label>
              <select
                id="type"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as "up" | "down")}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="up">Above Threshold ↑</option>
                <option value="down">Below Threshold ↓</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => addAlert()} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Alert
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={addNifty50Alerts} variant="secondary" className="w-full">
                <ListPlus className="mr-2 h-4 w-4" />
                Add Nifty 50
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Alerts ({alerts.length})</CardTitle>
          <CardDescription>
            {isMonitoring ? "Monitoring active - checking every minute" : "Start monitoring to begin tracking"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No alerts configured. Add your first alert above.
                </div>
              ) : (
                alerts.map((alert) => (
                  <Card key={alert.id} className={alert.triggered ? "border-red-500" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold">{alert.symbol}</h3>
                            {alert.type === "up" ? (
                              <Badge variant="default">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Above ₹{alert.threshold}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Below ₹{alert.threshold}
                              </Badge>
                            )}
                            {alert.triggered && (
                              <Badge variant="destructive" className="animate-pulse">
                                TRIGGERED
                              </Badge>
                            )}
                          </div>
                          {alert.currentPrice !== undefined ? (
                            <div className="text-lg font-semibold">
                              Current: <span className="text-primary">₹{alert.currentPrice.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Waiting for price data...
                            </div>
                          )}
                          {alert.lastChecked && (
                            <div className="text-xs text-muted-foreground">
                              Last checked: {alert.lastChecked.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {alert.triggered && (
                            <Button variant="outline" size="sm" onClick={() => resetAlert(alert.id)}>
                              Reset
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
