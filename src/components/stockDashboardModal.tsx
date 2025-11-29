import React, { useState, useEffect } from "react";
import Chart from "@/components/chart";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

interface StockDashboardModalProps {
  localSymbols: { symbol: string; name?: string }[];
}

const LAYOUTS = { 4: 2, 9: 3, 16: 4 };

export default function StockDashboardModal({ localSymbols }: StockDashboardModalProps) {
  const [open, setOpen] = useState(false);
  const [charts, setCharts] = useState<{ symbol: string; name?: string }[]>([]);
  const [layout, setLayout] = useState<4 | 9 | 16>(4);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Load charts from localStorage
  useEffect(() => {
    const savedCharts = localStorage.getItem("stockDashboardCharts");
    if (savedCharts) setCharts(JSON.parse(savedCharts));
  }, []);

  // Save charts to localStorage
  useEffect(() => {
    localStorage.setItem("stockDashboardCharts", JSON.stringify(charts));
  }, [charts]);
  // ---------------- Local search logic ----------------
  useEffect(() => {
    const q = searchQuery.trim().toUpperCase();

    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
console.log(localSymbols)

    const results = (localSymbols || [])
      .filter((s) => {
        const sym = (s.symbol || "").toUpperCase();
        const name = (s.name || "").toUpperCase();
        return sym.replace(".NS", "").startsWith(q) || name.includes(q);
      })
      .slice(0, 20)
      .map((s) => ({ symbol: s.symbol, name: s.name }));
console.log(results)
    setSearchResults(results);
    // setIsSearching(false);
  }, [searchQuery, localSymbols]);

  const addChart = (symbol: string, name?: string) => {
    if (!charts.find((c) => c.symbol === symbol)) {
      setCharts([...charts, { symbol, name }]);
    }
    setSearchQuery("");
  };

  const removeChart = (symbol: string) => {
    setCharts(charts.filter((c) => c.symbol !== symbol));
  };

  const cols = LAYOUTS[layout];
  const rows = LAYOUTS[layout];
  const chartGrid = Array.from({ length: layout }, (_, i) => charts[i] || null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Stock Dashboard</Button>

      {open && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-[#111] text-white z-[9999] flex flex-col">
          {/* TOP CONTROLS */}
          <div className="flex gap-3 p-3 items-center bg-[#1a1a1a] flex-nowrap">
            {/* Search input */}
            <div className="flex-1">
              <Command>
                <CommandInput
                  placeholder="Search NSE Symbol..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="bg-gray-800 text-white px-2 py-1 rounded w-full"
                />
                <CommandList>
                  {searchQuery.length >= 2 && searchResults.length === 0 && (
                    <CommandEmpty>No results</CommandEmpty>
                  )}
                  <CommandGroup>
                    {searchResults.map((r) => (
                      <CommandItem key={r.symbol} onSelect={() => addChart(r.symbol, r.name)}>
                        <div className="flex flex-col">
                          <span className="font-medium">{r.symbol}</span>
                          <span className="text-xs text-muted-foreground">{r.name ?? "NSE"}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Layout tags */}
            <div className="flex gap-2">
              {[4, 9, 16].map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={layout === l ? "default" : "outline"}
                  onClick={() => setLayout(l as 4 | 9 | 16)}
                >
                  {l === 4 ? "2×2" : l === 9 ? "3×3" : "4×4"}
                </Button>
              ))}
            </div>

            {/* Close button */}
            <Button variant="destructive" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>

          {/* CHART GRID */}
          <div
            className="grid flex-1 gap-3 p-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {chartGrid.map((chart, idx) => (
              <div key={idx} className="relative w-full h-full bg-[#222] rounded flex flex-col">
                {chart && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 z-10"
                      onClick={() => removeChart(chart.symbol)}
                    >
                      X
                    </Button>
                    <div className="text-center font-semibold p-1 bg-[#111] rounded-t">
                      {chart.name ?? chart.symbol}
                    </div>
                    <div className="flex-1">
                      <Chart symbol={chart.symbol} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
