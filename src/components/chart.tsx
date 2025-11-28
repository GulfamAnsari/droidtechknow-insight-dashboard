// src/components/Chart.tsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";

type Candle = {
  t: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ChartType =
  | "candlestick"
  | "hollow"
  | "heikin"
  | "line"
  | "area"
  | "bar"
  | "baseline";

interface ChartProps {
  symbol: string;
  range?: string; // default "1d"
  interval?: string; // default "5m"
}

export default function AdvancedLiveStockChart({
  symbol,
  range = "1d",
  interval = "5m",
}: ChartProps) {
  const [data, setData] = useState<Candle[]>([]);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [meta, setMeta] = useState<any>(null);
  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
            symbol
          )}?interval=${interval}&range=${range}`
        );
        const json = await res.json();
        const chartResult = json.chart.result[0];
        if (!chartResult) return;

        const timestamps: number[] = chartResult.timestamp || [];
        const quotes = chartResult.indicators.quote[0];
        const formatted: Candle[] = timestamps.map((t, i) => ({
          t: t * 1000,
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i],
        }));

        setData(formatted);
        setMeta(chartResult.meta);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [symbol, range, interval]);

  // Heikin Ashi transformation
  const heikinData = data.map((c, i) => {
    if (i === 0) return c;
    const prev = heikinData[i - 1];
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = (prev.open + prev.close) / 2;
    return { ...c, open, close };
  });

  const displayedData = chartType === "heikin" ? heikinData : data;

  // Custom candlestick renderer
  const renderCandles = () => {
    const width = 8;
    return displayedData.map((d, i) => {
      const isGreen = d.close >= d.open;
      const color = isGreen ? "#22c55e" : "#ef4444";
      const x = i;
      return (
        <g key={d.t}>
          <line
            x1={x}
            x2={x}
            y1={d.high}
            y2={d.low}
            stroke={color}
            strokeWidth={1}
          />
          <rect
            x={x - width / 2}
            y={Math.min(d.open, d.close)}
            width={width}
            height={Math.max(1, Math.abs(d.close - d.open))}
            fill={color}
          />
        </g>
      );
    });
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-IN", { hour12: false });

  return (
    <div className="p-4 space-y-4 w-full max-w-[1200px] mx-auto">
      {/* Header & Chart Type Selector */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-xl font-bold">{symbol} Chart</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            "candlestick",
            "hollow",
            "heikin",
            "line",
            "area",
            "bar",
            "baseline",
          ].map((type) => (
            <button
              key={type}
              className={`px-3 py-1 rounded ${
                chartType === type ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
              onClick={() => setChartType(type as ChartType)}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Hover Info Box */}
      {hoverCandle && (
        <div className="border p-2 rounded bg-gray-50 w-full max-w-[400px]">
          <div>Time: {formatDate(hoverCandle.t)}</div>
          <div>Open: {hoverCandle.open.toFixed(2)}</div>
          <div>High: {hoverCandle.high.toFixed(2)}</div>
          <div>Low: {hoverCandle.low.toFixed(2)}</div>
          <div>Close: {hoverCandle.close.toFixed(2)}</div>
          <div>Volume: {hoverCandle.volume.toLocaleString()}</div>
          {meta && (
            <div>
              Range: {range} | Interval: {interval} | Currency: {meta.currency}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={displayedData}
          onMouseMove={(state: any) => {
            if (state.isTooltipActive && state.activePayload) {
              setHoverCandle(state.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => setHoverCandle(null)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tickFormatter={(t) => formatDate(t)}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip
            labelFormatter={(t) => formatDate(t)}
            formatter={(v: any, name: string) => [v, name]}
          />

          {/* Chart Types */}
          {chartType === "line" && (
            <Line dataKey="close" stroke="#3b82f6" dot={false} />
          )}
          {chartType === "area" && (
            <Area dataKey="close" stroke="#3b82f6" fill="#93c5fd" />
          )}
          {chartType === "bar" && <Bar dataKey="close" fill="#3b82f6" />}
          {(chartType === "candlestick" ||
            chartType === "hollow" ||
            chartType === "heikin") &&
            renderCandles()}

          <Brush dataKey="t" height={30} stroke="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
