import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface StockAlert {
  id: string;
  symbol: string;
  threshold: number;
  type: "up" | "down";
  currentPrice?: number;
  triggered: boolean;
  lastChecked?: Date;
}

export default function StockAlerts() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [newSymbol, setNewSymbol] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [alertType, setAlertType] = useState<"up" | "down">("up");
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isMonitoring || alerts.length === 0) return;

    const checkAlerts = async () => {
      for (const alert of alerts) {
        if (alert.triggered) continue;

        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${alert.symbol}?interval=1m`;
          const response = await fetch(url);
          const data = await response.json();

          if (data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
            const currentPrice = data.chart.result[0].meta.regularMarketPrice;
            
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
                `Alert: ${alert.symbol} ${alert.type === "up" ? "crossed above" : "dropped below"} $${alert.threshold}`,
                {
                  description: `Current price: $${currentPrice.toFixed(2)}`,
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

  const addAlert = () => {
    if (!newSymbol || !newThreshold) {
      toast.error("Please fill in all fields");
      return;
    }

    const alert: StockAlert = {
      id: Math.random().toString(36).substr(2, 9),
      symbol: newSymbol.toUpperCase(),
      threshold: parseFloat(newThreshold),
      type: alertType,
      triggered: false,
    };

    setAlerts((prev) => [...prev, alert]);
    setNewSymbol("");
    setNewThreshold("");
    toast.success(`Alert added for ${alert.symbol}`);
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
          <CardDescription>Configure stock symbol and price threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Stock Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold Price ($)</Label>
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
                <option value="up">Price Goes Up</option>
                <option value="down">Price Goes Down</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={addAlert} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Alert
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
                                Above ${alert.threshold}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Below ${alert.threshold}
                              </Badge>
                            )}
                            {alert.triggered && (
                              <Badge variant="destructive" className="animate-pulse">
                                TRIGGERED
                              </Badge>
                            )}
                          </div>
                          {alert.currentPrice !== undefined && (
                            <div className="text-sm text-muted-foreground">
                              Current Price: <span className="font-semibold">${alert.currentPrice.toFixed(2)}</span>
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
