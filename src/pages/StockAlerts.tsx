// src/components/StockAlertsPct.tsx
import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
  ListPlus,
  Star,
  BarChart,
} from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Modal from "@/components/modal";
import Chart from "@/components/chart";

/* ----------------------------- Types --------------------------------- */
interface StockAlert {
  id: string;
  symbol: string;
  thresholdPercent: number;
  initialPrice: number;
  currentPrice?: number;
  triggeredUp: boolean;
  triggeredDown: boolean;
  lastChecked?: Date;
}

interface SearchResult {
  symbol: string;
  name?: string;
  exchange?: string;
}

/* -------------------------- Constants -------------------------------- */
const NIFTY_50_STOCKS = [
  "ADANIENT.NS","ADANIPORTS.NS","APOLLOHOSP.NS","ASIANPAINT.NS","AXISBANK.NS",
  "BAJAJ-AUTO.NS","BAJFINANCE.NS","BAJAJFINSV.NS","BPCL.NS","BHARTIARTL.NS",
  "BRITANNIA.NS","CIPLA.NS","COALINDIA.NS","DIVISLAB.NS","DRREDDY.NS",
  "EICHERMOT.NS","GRASIM.NS","HCLTECH.NS","HDFCBANK.NS","HDFCLIFE.NS",
  "HEROMOTOCO.NS","HINDALCO.NS","HINDUNILVR.NS","ICICIBANK.NS","ITC.NS",
  "INDUSINDBK.NS","INFY.NS","JSWSTEEL.NS","KOTAKBANK.NS","LT.NS",
  "M&M.NS","MARUTI.NS","NTPC.NS","NESTLEIND.NS","ONGC.NS","POWERGRID.NS",
  "RELIANCE.NS","SBILIFE.NS","SHRIRAMFIN.NS","SBIN.NS","SUNPHARMA.NS",
  "TCS.NS","TATACONSUM.NS","TATAMOTORS.NS","TATASTEEL.NS","TECHM.NS",
  "TITAN.NS","ULTRACEMCO.NS","UPL.NS","WIPRO.NS",
];

const fallbackBeepDataUri =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

/* -------------------------- Component -------------------------------- */
export default function StockAlertsPct() {
  /* -------------------------- State ---------------------------------- */
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"alerts" | "recent">("alerts");

  const [newSymbol, setNewSymbol] = useState("");
  const [newThresholdPct, setNewThresholdPct] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [localSymbols, setLocalSymbols] = useState<any[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingAlertsRef = useRef<Record<string, boolean>>({});

  const [graphModalSymbol, setGraphModalSymbol] = useState<string | null>(null);

  /* --------------------- Load local stocks.json ---------------------- */
  useEffect(() => {
    const loadLocal = async () => {
      try {
        const res = await fetch("/stocks.json");
        const json = await res.json();
        setLocalSymbols(json);
      } catch (err) {
        console.warn("Could not load local symbols:", err);
        setLocalSymbols([]);
      }
    };
    loadLocal();
  }, []);

  /* --------------------- Load from localStorage ---------------------- */
  useEffect(() => {
    try {
      const savedAlerts = localStorage.getItem("pct_alerts_v1");
      const savedRecent = localStorage.getItem("pct_recent_v1");
      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts);
        // convert lastChecked strings back to Date
        const fixed = parsed.map((a: any) => ({ ...a, lastChecked: a.lastChecked ? new Date(a.lastChecked) : undefined }));
        setAlerts(fixed);
      }
      if (savedRecent) setRecent(JSON.parse(savedRecent));
    } catch (e) {
      console.warn("Error reading localStorage", e);
    }
  }, []);

  /* --------------------- Save to localStorage ------------------------ */
  useEffect(() => {
    try {
      localStorage.setItem("pct_alerts_v1", JSON.stringify(alerts));
    } catch (e) {
      console.warn("Error saving alerts to localStorage", e);
    }
  }, [alerts]);

  useEffect(() => {
    try {
      localStorage.setItem("pct_recent_v1", JSON.stringify(recent));
    } catch (e) {
      console.warn("Error saving recent to localStorage", e);
    }
  }, [recent]);

  /* ----------------------- Audio setup -------------------------------- */
  useEffect(() => {
    const audio = new Audio("/alert-beep.mp3");
    audio.onerror = () => {
      audio.src = fallbackBeepDataUri;
    };
    audioRef.current = audio;
  }, []);

  const maybeStopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!Object.values(playingAlertsRef.current).some(Boolean)) {
      audio.loop = false;
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const playAlertSoundLoop = (alertId: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    playingAlertsRef.current[alertId] = true;
    audio.loop = true;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    // automatically stop this alert sound after short while
    setTimeout(() => {
      playingAlertsRef.current[alertId] = false;
      maybeStopAudio();
    }, 8000);
  };

  /* ------------------------ Price Fetch -------------------------------- */
  const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m`;
      const res = await fetch(url);
      const json = await res.json();
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      return typeof price === "number" ? price : null;
    } catch (err) {
      // console.warn("fetchCurrentPrice failed", err);
      return null;
    }
  };

  /* -------------------------- Search Logic ---------------------------- */
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const doSearch = async () => {
      setIsSearching(true);
      const q = searchQuery.trim().toUpperCase();

      // local first
      const local = localSymbols || [];
      try {
        const localMatches = (local || [])
          .filter((s: any) => {
            if (!s) return false;
            const name = (s.name || "").toString().toUpperCase();
            const sym = (s.symbol || "").toString().toUpperCase();
            return name.includes(q) || name.startsWith(q) || sym.replace(".NS", "").startsWith(q);
          })
          .slice(0, 20)
          .map((s: any) => ({ symbol: s.symbol, name: s.name, exchange: "NSE" }));

        if (localMatches.length > 0) {
          if (!cancelled) {
            setSearchResults(localMatches);
            setIsSearching(false);
          }
          return;
        }
      } catch {}

      // fallback to yahoo search
      try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
        const res = await fetch(url);
        const json = await res.json();
        const quotes = json?.quotes || [];
        const results = quotes
          .filter((qobj: any) => typeof qobj.symbol === "string" && qobj.symbol.endsWith(".NS"))
          .map((qobj: any) => ({
            symbol: qobj.symbol,
            name: qobj.shortname || qobj.longname,
            exchange: qobj.exchDisp || "NSE",
          }))
          .slice(0, 10);
        if (!cancelled) setSearchResults(results);
      } catch (err) {
        // fail silently
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    const t = setTimeout(doSearch, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, localSymbols]);

  /* ------------------------ Add single alert -------------------------- */
  const addAlert = async (symbol?: string, thresholdPct?: string) => {
    const sym = (symbol || newSymbol || "").toUpperCase().trim();
    const pctStr = (thresholdPct ?? newThresholdPct).toString().trim();
    if (!sym || !pctStr) return;
    const pct = parseFloat(pctStr);
    if (isNaN(pct)) return;

    // fetch price
    const initialPrice = await fetchCurrentPrice(sym);
    if (initialPrice === null) {
      toast.error("Unable to fetch price for " + sym);
      return;
    }

    const alert: StockAlert = {
      id: (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2),
      symbol: sym,
      thresholdPercent: pct,
      initialPrice,
      currentPrice: initialPrice,
      triggeredUp: false,
      triggeredDown: false,
      lastChecked: new Date(),
    };

    setAlerts((prev) => [...prev, alert]);
    setNewSymbol("");
    setNewThresholdPct("");

    // update recent list: most recent first, unique, cap at 20
    setRecent((prev) => {
      const filtered = prev.filter((s) => s !== sym);
      const next = [sym, ...filtered].slice(0, 20);
      return next;
    });

    toast.success(`Added ${sym} ±${pct}%`);
  };

  /* --------------------- Add NIFTY50 alerts (bulk) -------------------- */
  const addNifty50Alerts = async () => {
    const pctStr = newThresholdPct.trim();
    if (!pctStr) {
      toast.error("Enter threshold % first");
      return;
    }
    const pct = parseFloat(pctStr);
    if (isNaN(pct) || pct <= 0) {
      toast.error("Enter a valid positive %");
      return;
    }

    toast("Adding NIFTY50 alerts (this may take a while)...");
    for (const sym of NIFTY_50_STOCKS) {
      const initialPrice = await fetchCurrentPrice(sym);
      setAlerts((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          symbol: sym,
          thresholdPercent: pct,
          initialPrice: initialPrice ?? 0,
          currentPrice: initialPrice ?? undefined,
          triggeredUp: false,
          triggeredDown: false,
          lastChecked: initialPrice ? new Date() : undefined,
        },
      ]);
      await new Promise((r) => setTimeout(r, 120)); // be nice to API
    }
    toast.success("NIFTY50 alerts added.");
  };

  /* ---------------------- Remove / Reset ------------------------------ */
  const removeAlert = (id: string) => setAlerts((p) => p.filter((a) => a.id !== id));
  const resetAlert = (id: string) => {
    setAlerts((p) => p.map((a) => (a.id === id ? { ...a, triggeredUp: false, triggeredDown: false } : a)));
    playingAlertsRef.current[id] = false;
    maybeStopAudio();
  };

  /* ---------------------- Monitoring loop ----------------------------- */
  useEffect(() => {
    if (!isMonitoring || alerts.length === 0) return;

    let cancelled = false;

    const checkAll = async () => {
      // snapshot to avoid mid-iteration changes
      const snapshot = [...alerts];
      for (const a of snapshot) {
        if (cancelled) break;
        const current = await fetchCurrentPrice(a.symbol);
        if (cancelled || current === null) continue;

        // update current price & lastChecked
        setAlerts((prev) =>
          prev.map((x) => (x.id === a.id ? { ...x, currentPrice: current, lastChecked: new Date() } : x))
        );

        const initial = a.initialPrice === 0 ? current : a.initialPrice;
        const pctChange = ((current - initial) / initial) * 100;

        if (pctChange >= a.thresholdPercent && !a.triggeredUp) {
          setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, triggeredUp: true } : x)));
          playAlertSoundLoop(a.id);
          toast.success(`${a.symbol} ↑ ${pctChange.toFixed(2)}%`);
        }

        if (pctChange <= -a.thresholdPercent && !a.triggeredDown) {
          setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, triggeredDown: true } : x)));
          playAlertSoundLoop(a.id);
          toast.error(`${a.symbol} ↓ ${pctChange.toFixed(2)}%`);
        }
      }
    };

    checkAll();
    const interval = setInterval(checkAll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, alerts]); // re-run when alerts change so we always check current list

  /* ---------------------- Recent helpers ------------------------------ */
  const addToRecent = (sym: string) => {
    setRecent((p) => {
      const next = [sym, ...p.filter((s) => s !== sym)].slice(0, 20);
      return next;
    });
  };

  const removeRecent = (sym: string) => setRecent((p) => p.filter((s) => s !== sym));

  /* ---------------------- Graph modal / live graph -------------------- */
  const showGraphModal = (symbol: string) => {
    setGraphModalSymbol(symbol);
  };

  /* ---------------------- UI ----------------------------------------- */
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Indian Stocks — % Threshold Alerts</h1>
          <p className="text-muted-foreground">
            Threshold as percentage only (±%). Local symbol lookup used first.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant={isMonitoring ? "destructive" : "default"} onClick={() => setIsMonitoring((s) => !s)}>
            <Bell className="mr-2 h-4 w-4" />
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button variant="outline" onClick={() => {
            localStorage.removeItem("pct_alerts_v1");
            localStorage.removeItem("pct_recent_v1");
            setAlerts([]);
            setRecent([]);
            toast.success("Cleared local cached alerts & recent");
          }}>
            Clear Local
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={activeTab === "alerts" ? "default" : "outline"} onClick={() => setActiveTab("alerts")}>Alerts ({alerts.length})</Button>
        <Button variant={activeTab === "recent" ? "default" : "outline"} onClick={() => setActiveTab("recent")}>Recent ({recent.length})</Button>
      </div>

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <>
          {/* Add Alert compact card */}
          <Card>
            <CardHeader>
              <CardTitle>Add Alert</CardTitle>
              <CardDescription>Search NSE symbols (local first) and set % threshold</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Stock Symbol</Label>
                  <Popover open={openSearch} onOpenChange={setOpenSearch}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {newSymbol || "Search NSE..."}
                        <Search className="ml-2 h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0">
                      <Command>
                        <CommandInput placeholder="Search NSE (e.g. TCS)" value={searchQuery} onValueChange={setSearchQuery} />
                        <CommandList>
                          <CommandEmpty>{isSearching ? "Searching..." : "No results."}</CommandEmpty>
                          <CommandGroup>
                            {searchResults.map((r) => (
                              <CommandItem key={r.symbol} value={r.symbol} onSelect={() => { setNewSymbol(r.symbol); setOpenSearch(false); }}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{r.symbol}</span>
                                  <span className="text-xs text-muted-foreground">{r.name ?? "NSE"}</span>
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
                  <Label>Threshold (%)</Label>
                  <Input type="number" step="0.01" value={newThresholdPct} onChange={(e) => setNewThresholdPct(e.target.value)} placeholder="e.g. 2 for ±2%" />
                </div>

                <div></div>

                <div className="flex items-end">
                  <Button className="w-full" onClick={() => addAlert()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Alert
                  </Button>
                </div>

                <div className="flex items-end">
                  <Button variant="secondary" className="w-full" onClick={() => addNifty50Alerts()}>
                    <ListPlus className="mr-2 h-4 w-4" /> Add NIFTY50 (same %)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active alerts (grid 3 per row on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.length === 0 && <div className="text-center py-8 text-muted-foreground col-span-3">No alerts yet.</div>}

            {alerts.map((a) => (
              <Card key={a.id} className={`${a.triggeredUp || a.triggeredDown ? "border-red-500" : ""}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold">{a.symbol}</h3>
                        <Badge>±{a.thresholdPercent}%</Badge>
                        {a.triggeredUp && <Badge variant="default" className="ml-2"><TrendingUp className="mr-1 h-3 w-3" />UP</Badge>}
                        {a.triggeredDown && <Badge variant="destructive" className="ml-2"><TrendingDown className="mr-1 h-3 w-3" />DOWN</Badge>}
                        {/* star to quickly add to recent */}
                        <Button variant="outline" size="sm" onClick={() => addToRecent(a.symbol)}>
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 text-sm">
                        <div>Initial: {a.initialPrice ? `₹${a.initialPrice.toFixed(2)}` : "—"}</div>
                        <div>
                          Current: {a.currentPrice ? `₹${a.currentPrice.toFixed(2)}` : "waiting..."}
                          {a.currentPrice && a.initialPrice ? (
                            <span className="ml-3">({(((a.currentPrice - a.initialPrice) / a.initialPrice) * 100).toFixed(2)}%)</span>
                          ) : null}
                        </div>
                        {a.lastChecked && <div className="text-xs text-muted-foreground">Last checked: {a.lastChecked.toLocaleTimeString()}</div>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => showGraphModal(a.symbol)}><BarChart className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => resetAlert(a.id)}>Reset</Button>
                      <Button variant="destructive" size="sm" onClick={() => removeAlert(a.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* RECENT TAB */}
      {activeTab === "recent" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            <CardDescription>Recently used symbols (saved to localStorage)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px]">
              <div className="space-y-4">
                {recent.length === 0 && <div className="text-center text-muted-foreground py-8">No recent symbols yet.</div>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recent.map((sym) => (
                    <div key={sym} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{sym}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setNewSymbol(sym); setActiveTab("alerts"); }}>
                          Use
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => removeRecent(sym)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

  
      { graphModalSymbol && (
        <Modal onClose={() => setGraphModalSymbol(null)}>
          <Chart symbol={graphModalSymbol} />
        </Modal>
      ) }
    </div>
  );
}
