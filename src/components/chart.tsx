// Chart.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  Customized,
  Line,
  Area,
  Bar,
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

export default function Chart({
  symbol = "TCS.NS",
  range = "1d",
  interval = "5m",
}) {
  const [data, setData] = useState<Candle[]>([]);
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ candle: Candle; x: number; y: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

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

      const formatted: Candle[] = timestamps
        .map((t, i) => {
          const candle = {
            t: t * 1000,
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i],
            volume: quotes.volume[i],
          };
          // Remove any candle with null/undefined value
          return Object.values(candle).every((v) => v != null) ? candle : null;
        })
        .filter(Boolean) as Candle[];

      setData(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol, range, interval]);

  useEffect(() => {
    if (liveUpdate) {
      intervalRef.current = setInterval(fetchData, 500);
    } else if (intervalRef.current) clearInterval(intervalRef.current);

    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [liveUpdate]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString("en-IN", { hour12: false });

  const Candlestick = (props: any) => {
    const { xAxisMap, yAxisMap, width } = props;
    if (!xAxisMap || !yAxisMap || !data.length) return null;

    const xScale = xAxisMap[0].scale;
    const yScale = yAxisMap.price.scale;
    const candleWidth = Math.max(3, Math.min(12, (width / data.length) * 0.6));

    return (
      <g>
        {data.map((d, i) => {
          if (d.open == null || d.close == null || d.high == null || d.low == null) return null;
          const x = xScale(i);
          const openY = yScale(d.open);
          const closeY = yScale(d.close);
          const highY = yScale(d.high);
          const lowY = yScale(d.low);
          const isGreen = d.close >= d.open;
          const color = isGreen ? "#22c55e" : "#ef4444";

          return (
            <g key={d.t}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth={1} />
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
  };

  return (
    <div className="p-4 w-full max-w-[1200px] mx-auto space-y-4 relative">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-bold">{symbol} Chart</h2>
        <div className="flex gap-2 flex-wrap">
          {["candlestick", "line", "area", "bar"].map((type) => (
            <button
              key={type}
              className={`px-3 py-1 rounded ${chartType === type ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setChartType(type as ChartType)}
            >
              {type.toUpperCase()}
            </button>
          ))}
          <label className="flex items-center gap-2 ml-2">
            <input type="checkbox" checked={liveUpdate} onChange={(e) => setLiveUpdate(e.target.checked)} />
            Live update (500ms)
          </label>
        </div>
      </div>

      {hoverInfo && (
        <div
          style={{
            position: "fixed",
            left: hoverInfo.x + 15,
            top: hoverInfo.y + 15,
            pointerEvents: "none",
            background: "rgba(255,255,255,0.9)",
            border: "1px solid #ccc",
            padding: 8,
            borderRadius: 4,
            fontSize: 12,
            zIndex: 1000,
          }}
        >
          <div>Time: {formatTime(hoverInfo.candle.t)}</div>
          <div>O: {hoverInfo.candle.open.toFixed(2)}</div>
          <div>H: {hoverInfo.candle.high.toFixed(2)}</div>
          <div>L: {hoverInfo.candle.low.toFixed(2)}</div>
          <div>C: {hoverInfo.candle.close.toFixed(2)}</div>
          <div>V: {hoverInfo.candle.volume.toLocaleString()}</div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={data}
          onMouseMove={(state: any) => {
            if (state.isTooltipActive && state.activePayload) {
              setHoverInfo({
                candle: state.activePayload[0].payload,
                x: state.chartX,
                y: state.chartY,
              });
            }
          }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="t" tickFormatter={formatTime} domain={["dataMin", "dataMax"]} />
          <YAxis yAxisId="price" domain={["auto", "auto"]} />
          <YAxis yAxisId="volume" orientation="right" hide />

          {chartType === "line" && <Line yAxisId="price" dataKey="close" stroke="#3b82f6" dot={false} />}
          {chartType === "area" && <Area yAxisId="price" dataKey="close" stroke="#3b82f6" fill="#93c5fd" />}
          {chartType === "bar" && <Bar yAxisId="price" dataKey="close" fill="#3b82f6" />}
          {chartType === "candlestick" && <Customized component={Candlestick} />}

          <Brush dataKey="t" height={30} stroke="#8884d8" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
