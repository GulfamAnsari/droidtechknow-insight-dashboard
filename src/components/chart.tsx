// AdvancedLiveStockChart.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Line,
  ReferenceLine,
  ReferenceDot,
  Customized,
  Area,
} from "recharts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { toast } from "sonner";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

type Candle = {
  t: number; // epoch seconds
  time: string; // formatted
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Props = {
  symbol: string;
  initialRange?: string; // "1d", "5d", ...
  pollIntervalMs?: number;
  // optional buy/sell markers (timestamp epoch seconds or index) example: [{t: 1764322320, type: "buy"}]
  markers?: { t: number; type: "buy" | "sell"; label?: string }[];
  // alerts
  alerts?: { id: string; price: number; label?: string }[];
};

function safeNum(v: any) {
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}




/* ---------- Custom Candlestick renderer using Customized ---------- */
function CandlesCustomized(props: any) {
  const { xAxisMap, yAxisMap, data, width } = props;

  const xAxis = xAxisMap[0];
  const yAxis = yAxisMap.price;

  if (!xAxis || !yAxis) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  const candleWidth = Math.max(4, Math.min(12, (width / data.length) * 0.6));

  return (
    <g>
      {data.map((d, i) => {
        if (!d) return null;

        const x = xScale(i);
        const openY = yScale(d.open);
        const closeY = yScale(d.close);
        const highY = yScale(d.high);
        const lowY = yScale(d.low);

        const isGreen = d.close >= d.open;
        const color = isGreen ? "#22c55e" : "#ef4444";

        return (
          <g key={d.t}>
            {/* wick */}
            <line
              x1={x}
              x2={x}
              y1={highY}
              y2={lowY}
              stroke={color}
              strokeWidth={1}
            />

            {/* body */}
            <rect
              x={x - candleWidth / 2}
              y={Math.min(openY, closeY)}
              width={candleWidth}
              height={Math.max(1, Math.abs(closeY - openY))}
              fill={color}
              stroke={color}
            />
          </g>
        );
      })}
    </g>
  );
}


/* ---------- Crosshair & Hover renderer ---------- */
function CrosshairCustomized({ x, y, activeIndex, data, yAxisMap, xAxisMap }: any) {
  if (!data || activeIndex == null) return null;
  try {
    const xScale = xAxisMap[0].scale;
    const yScale = yAxisMap.price.scale;
    const px = xScale(activeIndex);
    const d: Candle = data[activeIndex];
    const py = yScale(d.close);
    return (
      <g>
        <line x1={px} x2={px} y1={0} y2={yScale.range ? yScale.range()[0] : 0} stroke="#888" strokeDasharray="4 4" />
        <line x1={0} x2={xScale.range ? xScale.range()[1] : 0} y1={py} y2={py} stroke="#888" strokeDasharray="4 4" />
      </g>
    );
  } catch {
    return null;
  }
}

/* ---------- Main Component ---------- */
export default function AdvancedLiveStockChart({
  symbol,
  initialRange = "1d",
  pollIntervalMs = 5000,
  markers = [],
  alerts = []
}: Props) {
  const [meta, setMeta] = useState<any>(null);
  const [data, setData] = useState<Candle[]>([]);
  const [range, setRange] = useState(initialRange);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pollRef = useRef<number | null>(null);

  const [showMACD, setShowMACD] = useState(true);

  // crosshair
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // alerts triggered map
  const triggeredRef = useRef<Record<string, boolean>>({});

  // fetch chart from Yahoo
  const fetchChart = useCallback(async (selRange = range) => {
    setLoading(true);
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${selRange}&interval=5m`;
      const res = await fetch(url);
      const json = await res.json();
      const r = json?.chart?.result?.[0];
      if (!r) {
        setLoading(false);
        return;
      }
      const ts: number[] = r.timestamp || [];
      const q = r.indicators?.quote?.[0] || {};
      const quoteOpen = q.open || [];
      const quoteHigh = q.high || [];
      const quoteLow = q.low || [];
      const quoteClose = q.close || [];
      const quoteVol = q.volume || [];
      const mapped: Candle[] = ts.map((t, i) => ({
        t,
        time: dayjs.unix(t).tz("Asia/Kolkata").format("HH:mm"),
        open: safeNum(quoteOpen[i]) ?? 0,
        high: safeNum(quoteHigh[i]) ?? 0,
        low: safeNum(quoteLow[i]) ?? 0,
        close: safeNum(quoteClose[i]) ?? 0,
        volume: safeNum(quoteVol[i]) ?? 0,
      })).filter(d=>d.t && !Number.isNaN(d.close));
      setMeta(r.meta || {});
      setData(mapped);
    } catch (err) {
      console.warn("fetchChart err", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, range]);

  useEffect(() => {
    // initial fetch
    fetchChart(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, range]);

  // live polling: fetch and merge latest points
  useEffect(() => {
    if (!isLive) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=5m`;
        const res = await fetch(url);
        const json = await res.json();
        const r = json?.chart?.result?.[0];
        if (!r) return;
        const ts: number[] = r.timestamp || [];
        const q = r.indicators?.quote?.[0] || {};
        const newMapped: Candle[] = ts.map((t, i) => ({
          t,
          time: dayjs.unix(t).tz("Asia/Kolkata").format("HH:mm"),
          open: safeNum(q.open?.[i]) ?? 0,
          high: safeNum(q.high?.[i]) ?? 0,
          low: safeNum(q.low?.[i]) ?? 0,
          close: safeNum(q.close?.[i]) ?? 0,
          volume: safeNum(q.volume?.[i]) ?? 0,
        })).filter(d=>d.t && !Number.isNaN(d.close));
        // merge: replace tail of data with newMapped (they are in ascending time)
        setData((prev) => {
          if (prev.length === 0) return newMapped;
          const mergedMap = new Map<number, Candle>();
          prev.forEach((p) => mergedMap.set(p.t, p));
          newMapped.forEach((n) => mergedMap.set(n.t, n));
          const merged = Array.from(mergedMap.values()).sort((a,b)=>a.t-b.t);
          // keep last N (Yahoo may give full range; cap to avoid huge arrays)
          return merged.slice(-1000);
        });
        // update meta if changed
        if (r.meta) setMeta(r.meta);
      } catch (err) {
        console.warn("poll err", err);
      }
    }, pollIntervalMs);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); pollRef.current = null; };
  }, [isLive, symbol, range, pollIntervalMs]);

  // compute indicators
  const closes = useMemo(() => data.map((d) => d.close), [data]);

  // alert detection
  useEffect(() => {
    if (!alerts || alerts.length === 0 || data.length === 0) return;
    const last = data[data.length - 1];
    alerts.forEach((al) => {
      if (triggeredRef.current[al.id]) return;
      // check cross
      if (last.close >= al.price && (!triggeredRef.current[al.id])) {
        triggeredRef.current[al.id] = true;
        toast.success(`Price crossed above alert ${al.label ?? al.id}: ₹${al.price}`);
      } else if (last.close <= al.price && (!triggeredRef.current[al.id])) {
        triggeredRef.current[al.id] = true;
        toast.error(`Price crossed below alert ${al.label ?? al.id}: ₹${al.price}`);
      }
    });
  }, [alerts, data]);

  // theme colors
  const colors = useMemo(() => {
    if (theme === "dark") {
      return {
        bg: "#0f172a",
        text: "#e6eef8",
        grid: "#1f2937",
        up: "#16a34a",
        down: "#ef4444",
        sma: "#facc15",
        ema: "#60a5fa",
        macd: "#a78bfa",
        vol: "#64748b",
      };
    }
    return {
      bg: "#ffffff",
      text: "#0f172a",
      grid: "#e6edf3",
      up: "#16a34a",
      down: "#ef4444",
      sma: "#b45309",
      ema: "#1e40af",
      macd: "#7c3aed",
      vol: "#94a3b8",
    };
  }, [theme]);

  // handle mouse for crosshair
  const handleMouseMove = (e: any) => {
    if (!e || !e.activeTooltipIndex && e.activeTooltipIndex !== 0) {
      setActiveIndex(null);
    } else {
      setActiveIndex(e.activeTooltipIndex);
    }
  };

  // small helper to format numbers
  const fmt = (n?: number | null) => (n == null ? "—" : (Math.round((n! + Number.EPSILON) * 100) / 100).toLocaleString());

  // choose xAxis tick interval to avoid crowding
  const tickInterval = Math.max(1, Math.floor(Math.max(1, data.length / 8)));

  return (
    <div style={{ color: colors.text }}>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{meta?.longName ?? symbol} <span style={{ color: "#9ca3af", fontSize: 12 }}>({meta?.symbol ?? symbol})</span></h2>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{meta?.fullExchangeName} • {meta?.currency}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} /> Live
          </label>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={theme === "dark"} onChange={(e) => setTheme(e.target.checked ? "dark" : "light")} /> Dark
          </label>
          <button onClick={() => fetchChart(range)} style={{ padding: "6px 10px" }}>Refresh</button>
        </div>
      </div>

      {/* meta + small stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: 8,
        marginBottom: 12,
        background: theme === "dark" ? "#071031" : "#f8fafc",
        padding: 8,
        borderRadius: 8
      }}>
        <div>Current: <b>₹{fmt(meta?.regularMarketPrice)}</b></div>
        <div>Prev Close: <b>₹{fmt(meta?.previousClose)}</b></div>
        <div>Day Range: <b>₹{fmt(meta?.regularMarketDayLow)} - ₹{fmt(meta?.regularMarketDayHigh)}</b></div>
        <div>52w: <b>₹{fmt(meta?.fiftyTwoWeekLow)} - ₹{fmt(meta?.fiftyTwoWeekHigh)}</b></div>
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        { (meta?.validRanges ?? ["1d","5d","1mo","3mo","6mo","1y","5y","10y","max"]).map((r: string) => (
          <button key={r} onClick={() => setRange(r)} style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: range === r ? `1px solid ${colors.sma}` : `1px solid ${colors.grid}`,
            background: range === r ? colors.sma : "transparent",
            color: range === r ? "#000" : colors.text,
            cursor: "pointer"
          }}>{r}</button>
        )) }
        <div style={{ width: 12 }} />
      </div>

      {/* top chart: candles + indicators + volume */}
      <div >
        <ResponsiveContainer width="100%" >
          <ComposedChart
            data={data}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setActiveIndex(null)}
            margin={{ top: 10, right: 60, left: 10, bottom: 0 }}
          >
            <CartesianGrid stroke={colors.grid} />
            <XAxis dataKey="time" xAxisId={0} />

<YAxis yAxisId="price" domain={["auto", "auto"]} />

<YAxis yAxisId="vol" orientation="right" hide />

            <Tooltip contentStyle={{ background: theme === "dark" ? "#0b1220" : "#fff", borderRadius: 6, borderColor: colors.grid }} />

            {/* Volume bars */}
            <Bar dataKey="volume" yAxisId="vol" barSize={8} fill={colors.vol} opacity={0.25} />

         
            {/* price alert lines */}
            { alerts?.map((al) => (
              <ReferenceLine key={al.id} y={al.price} stroke="#f97316" strokeDasharray="3 3" label={{position:"right", value:al.label ?? `Alert ${al.price}`, fill: colors.text}} />
            )) }

            {/* buy/sell markers */}
            { markers?.map((m, idx) => {
              const idxFound = data.findIndex(d=>d.t === m.t);
              if (idxFound === -1) return null;
              const d = data[idxFound];
              return (
                <ReferenceDot key={idx} x={d.time} y={d.close} r={5} fill={m.type==="buy" ? "#06b981" : "#ef4444"} stroke="#fff" />
              );
            })}

            {/* custom candles */}
            <Customized
  component={<CandlesCustomized />}
  xAxisId={0}
  yAxisId="price"
/>

            {/* crosshair overlay (we use customized via activeIndex) */}
            <Customized component={<CrosshairCustomized data={data} activeIndex={activeIndex} />} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* small OHLC readout + last price change */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: colors.text }}>
          <div>
            { activeIndex != null && data[activeIndex] ? (
              <>
                <b>{data[activeIndex].time}</b> &nbsp;
                O: ₹{fmt(data[activeIndex].open)} H: ₹{fmt(data[activeIndex].high)} L: ₹{fmt(data[activeIndex].low)} C: ₹{fmt(data[activeIndex].close)}
              </>
            ) : (
              <>Last: <b>₹{fmt(data[data.length-1]?.close)}</b> • Vol: {data[data.length-1]?.volume?.toLocaleString()}</>
            ) }
          </div>

          <div style={{ fontSize: 13 }}>
            <button onClick={()=>{ setData([]); fetchChart(range); }} style={{ marginRight: 6 }}>Reload</button>
            <button onClick={()=>{ triggeredRef.current = {}; toast("Cleared alert triggers"); }}>Reset Alerts</button>
          </div>
        </div>


      </div>
    </div>
  );
}
