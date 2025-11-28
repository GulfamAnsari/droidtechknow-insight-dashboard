// src/components/Chart.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from "recharts";

type Candle = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ChartType = "candlestick" | "line" | "area" | "bar";

interface ChartProps {
  symbol: string;
  range?: string;
  interval?: string;
}

export default function Chart({
  symbol,
  range = "1d",
  interval = "5m",
}: ChartProps) {
  const [data, setData] = useState<Candle[]>([]);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const [meta, setMeta] = useState<any>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
      );
      const json = await res.json();
      const chartResult = json.chart.result?.[0];
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

  useEffect(() => {
    fetchData();
  }, [symbol, range, interval]);

  // Live update every 500ms
  useEffect(() => {
    if (liveUpdate) {
      intervalRef.current = setInterval(fetchData, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [liveUpdate]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-IN", { hour12: false });

  const renderCandles = () => {
    return data.map((d, i) => {
      const isGreen = d.close >= d.open;
      const color = isGreen ? "#22c55e" : "#ef4444";
      const w = 8;
      return (
        <React.Fragment key={i}>
          {/* High-Low line */}
          <Bar
            dataKey={() => d.high}
            fill={color}
            isAnimationActive={false}
            barSize={1}
          />
          {/* Candle body */}
          <Bar
            dataKey={() => d.close}
            fill={color}
            isAnimationActive={false}
            barSize={w}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="p-4 w-full max-w-[1200px] mx-auto space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">{symbol} Chart</h2>
        <div className="flex gap-2 flex-wrap">
          {["candlestick", "line", "area", "bar"].map((type) => (
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
          <label className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              checked={liveUpdate}
              onChange={(e) => setLiveUpdate(e.target.checked)}
            />
            Live update (500ms)
          </label>
        </div>
      </div>

      {hoverCandle && (
        <div className="border p-2 rounded bg-gray-50 w-full max-w-[400px] absolute z-50 pointer-events-none">
          <div>Time: {formatTime(hoverCandle.t)}</div>
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

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={data}
          onMouseMove={(state: any) => {
            if (state.isTooltipActive && state.activePayload)
              setHoverCandle(state.activePayload[0].payload);
          }}
          onMouseLeave={() => setHoverCandle(null)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            tickFormatter={(t) => formatTime(t)}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis yAxisId="price" domain={["auto", "auto"]} />
          <YAxis
            yAxisId="volume"
            orientation="right"
            domain={["auto", "auto"]}
            hide
          />
          <Tooltip
            wrapperStyle={{ position: "relative" }}
            labelFormatter={(t) => formatTime(t)}
            formatter={(v: any, name: string) => [v, name]}
          />

          {chartType === "line" && <Line yAxisId="price" dataKey="close" stroke="#3b82f6" dot={false} />}
          {chartType === "area" && <Area yAxisId="price" dataKey="close" stroke="#3b82f6" fill="#93c5fd" />}
          {chartType === "bar" && <Bar yAxisId="price" dataKey="close" fill="#3b82f6" />}
          {chartType === "candlestick" && renderCandles()}

          <Brush dataKey="t" height={30} stroke="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
