

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
  Area,
  ReferenceLine,
  ReferenceDot,
  Customized,
} from "recharts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

type Candle = {
  t: number; // epoch seconds
  time: string; // formatted label
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Props = {
  symbol: string;
  initialRange?: string; // e.g. "1d"
  pollIntervalMs?: number;
  autoLive?: boolean;
};

const UP_COLOR = "#22c55e"; // green
const DOWN_COLOR = "#ef4444"; // red
const VOLUME_COLOR = "#64748b";

export default function AdvancedLiveStockChart({
  symbol,
  initialRange = "1d",
  pollIntervalMs = 5000,
  autoLive = true,
}: Props) {
  const [range, setRange] = useState<string>(initialRange);
  const [data, setData] = useState<Candle[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(autoLive);
  const pollRef = useRef<number | null>(null);

  // Chart type selection
  type ChartType = "candlestick" | "hollow" | "heikin" | "line" | "area" | "bar" | "baseline";
  const [chartType, setChartType] = useState<ChartType>("candlestick");

  // fetch full chart for selected range
  const fetchChart = useCallback(
    async (selRange = range) => {
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
        const open = q.open || [];
        const high = q.high || [];
        const low = q.low || [];
        const close = q.close || [];
        const volume = q.volume || [];

        const mapped: Candle[] = ts
          .map((t, i) => ({
            t,
            time: dayjs.unix(t).tz("Asia/Kolkata").format("HH:mm"),
            open: typeof open[i] === "number" ? open[i] : NaN,
            high: typeof high[i] === "number" ? high[i] : NaN,
            low: typeof low[i] === "number" ? low[i] : NaN,
            close: typeof close[i] === "number" ? close[i] : NaN,
            volume: typeof volume[i] === "number" ? volume[i] : 0,
          }))
          .filter((c) => !Number.isNaN(c.close) && !Number.isNaN(c.open));

        setMeta(r.meta || {});
        setData(mapped);
      } catch (err) {
        console.warn("fetchChart error", err);
      } finally {
        setLoading(false);
      }
    },
    [symbol, range]
  );

  useEffect(() => {
    fetchChart(range);
  }, [fetchChart, range]);

  // live polling to update/merge latest candles
  useEffect(() => {
    if (!isLive) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    // clear old
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
        const newMapped: Candle[] = ts
          .map((t, i) => ({
            t,
            time: dayjs.unix(t).tz("Asia/Kolkata").format("HH:mm"),
            open: typeof q.open?.[i] === "number" ? q.open[i] : NaN,
            high: typeof q.high?.[i] === "number" ? q.high[i] : NaN,
            low: typeof q.low?.[i] === "number" ? q.low[i] : NaN,
            close: typeof q.close?.[i] === "number" ? q.close[i] : NaN,
            volume: typeof q.volume?.[i] === "number" ? q.volume[i] : 0,
          }))
          .filter((c) => !Number.isNaN(c.close) && !Number.isNaN(c.open));

        setMeta(r.meta || {});
        setData((prev) => {
          if (prev.length === 0) return newMapped;
          // Merge by timestamp (keep unique by t)
          const map = new Map<number, Candle>();
          prev.forEach((p) => map.set(p.t, p));
          newMapped.forEach((n) => map.set(n.t, n));
          const merged = Array.from(map.values()).sort((a, b) => a.t - b.t);
          // cap length to avoid huge arrays
          return merged.slice(-1500);
        });
      } catch (e) {
        console.warn("poll err", e);
      }
    }, pollIntervalMs);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [isLive, symbol, range, pollIntervalMs]);

  // derived datasets: heikin-ashi
  const heikinData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const out: Candle[] = [];
    let prevHA: { open: number; close: number } | null = null;
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const haClose = (d.open + d.high + d.low + d.close) / 4;
      const haOpen = prevHA ? (prevHA.open + prevHA.close) / 2 : (d.open + d.close) / 2;
      const haHigh = Math.max(d.high, haOpen, haClose);
      const haLow = Math.min(d.low, haOpen, haClose);
      const hd: Candle = {
        t: d.t,
        time: d.time,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: d.volume,
      };
      out.push(hd);
      prevHA = { open: haOpen, close: haClose };
    }
    return out;
  }, [data]);

  // choose data to render based on chartType
  const chartData = useMemo(() => {
    switch (chartType) {
      case "heikin":
        return heikinData;
      default:
        return data;
    }
  }, [chartType, data, heikinData]);

  // tick interval for X axis (to avoid overcrowding)
  const tickInterval = Math.max(1, Math.floor(Math.max(1, (chartData.length || 1) / 8)));

  // custom Candles renderer (inside component so it closes over chartType)
  function CandlesCustomized(props: any) {
    // props contains xAxisMap, yAxisMap, width, height, data (but not necessarily the same data object)
    try {
      const { xAxisMap, yAxisMap, width } = props as any;
      const xAxis = xAxisMap && xAxisMap[0];
      const yAxis = yAxisMap && (yAxisMap["price"] || yAxisMap[0]);
      if (!xAxis || !yAxis) return null;
      const xScale = xAxis.scale;
      const yScale = yAxis.scale;
      const rows = chartData.length || 1;
      const candleWidth = Math.max(3, Math.min(14, (width / Math.max(1, rows)) * 0.6));

      return (
        <g>
          {chartData.map((d: Candle, i: number) => {
            // position x using scale on index
            const x = xScale(i);
            const openY = yScale(d.open);
            const closeY = yScale(d.close);
            const highY = yScale(d.high);
            const lowY = yScale(d.low);
            const isUp = d.close >= d.open;
            const color = isUp ? UP_COLOR : DOWN_COLOR;

            // handle hollow candle: hollow if up (stroke green, fill transparent)
            const isHollow = chartType === "hollow";
            // handle baseline: we'll still render candles but also a baseline reference elsewhere
            // heikin uses chartData already transformed

            // For hollow: fill "transparent" (or background) for up; fill red for down
            const fillColor = isHollow ? (isUp ? "transparent" : color) : color;
            const strokeColor = isHollow ? color : color;

            // minimal height to be visible
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));

            return (
              <g key={String(d.t)}>
                {/* wick */}
                <line
                  x1={x}
                  x2={x}
                  y1={highY}
                  y2={lowY}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
                {/* body */}
                <rect
                  x={x - candleWidth / 2}
                  y={Math.min(openY, closeY)}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                />
              </g>
            );
          })}
        </g>
      );
    } catch (err) {
      return null;
    }
  }

  // helper to render baseline style (line with shaded area below / above)
  function BaselineArea() {
    // baseline is first close value
    if (!chartData || chartData.length === 0) return null;
    const base = chartData[0].close;
    return <ReferenceLine y={base} stroke="#7c3aed" strokeDasharray="4 4" label={{ value: `Baseline ${base}`, position: "right" }} />;
  }

  // tooltip formatter
  const tooltipFormatter = (value: any, name: any, props: any) => {
    if (name === "volume") return [value?.toLocaleString?.() ?? value, "Volume"];
    return [value, name];
  };

  // UI: chart type options
  const CHART_TYPES: { key: ChartType; label: string }[] = [
    { key: "candlestick", label: "Candlestick" },
    { key: "hollow", label: "Hollow Candle" },
    { key: "heikin", label: "Heikin-Ashi" },
    { key: "line", label: "Line" },
    { key: "area", label: "Area" },
    { key: "bar", label: "Bar" },
    { key: "baseline", label: "Baseline" },
  ];

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{meta?.longName ?? symbol} <small style={{ color: "#6b7280", marginLeft: 6 }}>{meta?.symbol ?? symbol}</small></h2>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{meta?.fullExchangeName ?? ""} • {meta?.currency ?? ""}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} /> Live
          </label>
          <button onClick={() => fetchChart(range)} style={{ padding: "6px 10px" }}>Refresh</button>
        </div>
      </div>

      {/* meta row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10, marginBottom: 12 }}>
        <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>Current: <b>₹{meta?.regularMarketPrice ?? "—"}</b></div>
        <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>Prev Close: <b>₹{meta?.previousClose ?? "—"}</b></div>
        <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>Day: <b>₹{meta?.regularMarketDayLow ?? "—"} - ₹{meta?.regularMarketDayHigh ?? "—"}</b></div>
        <div style={{ background: "#f8fafc", padding: 8, borderRadius: 6 }}>52w: <b>₹{meta?.fiftyTwoWeekLow ?? "—"} - ₹{meta?.fiftyTwoWeekHigh ?? "—"}</b></div>
      </div>

      {/* controls: ranges + chart type */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        { (meta?.validRanges ?? ["1d","5d","1mo","3mo","6mo","1y","5y","10y","max"]).map((r: string) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: r === range ? "1px solid #7c3aed" : "1px solid #e6eef9",
              background: r === range ? "#7c3aed" : "transparent",
              color: r === range ? "#fff" : "#0f172a",
              cursor: "pointer"
            }}
          >
            {r}
          </button>
        )) }

        <div style={{ width: 12 }} />

        {/* chart type select */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.key}
              onClick={() => setChartType(ct.key)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: chartType === ct.key ? "1px solid #7c3aed" : "1px solid #e6eef9",
                background: chartType === ct.key ? "#7c3aed" : "transparent",
                color: chartType === ct.key ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontSize: 13
              }}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* chart area */}
      <div style={{ height: 480, borderRadius: 10, background: "#ffffff", padding: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 0 }}>
            <CartesianGrid stroke="#eef2ff" />
            {/* IMPORTANT: give axes ids so Customized can access scales */}
            <XAxis dataKey="time" xAxisId={0} tick={{ fontSize: 11 }} interval={tickInterval} />
            <YAxis yAxisId="price" tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <YAxis yAxisId="vol" orientation="right" hide />

            <Tooltip formatter={tooltipFormatter} />

            {/* Volume bars */}
            <Bar dataKey="volume" yAxisId="vol" barSize={12} fill={VOLUME_COLOR} opacity={0.25} />

            {/* Depending on chartType, render */}
            {chartType === "line" && <Line dataKey="close" stroke="#0ea5e9" dot={false} />}
            {chartType === "area" && <Area dataKey="close" stroke="#0ea5e9" fill="#bae6fd" dot={false} />}
            {chartType === "bar" && <Bar dataKey="close" barSize={10} fill="#60a5fa" />}

            {/* Baseline draws both baseline line and also default candlesticks/line */}
            {chartType === "baseline" && <Line dataKey="close" stroke="#7c3aed" dot={false} />}
            {chartType === "baseline" && <BaselineArea />}

            {/* Candlestick / hollow / heikin use custom renderer */}
            {(chartType === "candlestick" || chartType === "hollow" || chartType === "heikin") && (
              <>
                {/* the Customized component must be given axis ids so its props contain scales */}
                <Customized component={<CandlesCustomized />} xAxisId={0} yAxisId={"price"} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- Helper subcomponent used above ---------- */
/* BaselineArea uses chartData via closure; but to keep simple we create a small component */
function BaselineArea() {
  // placeholder - Recharts ReferenceLine will be placed in main render (not used as separate component)
  return null;
}
