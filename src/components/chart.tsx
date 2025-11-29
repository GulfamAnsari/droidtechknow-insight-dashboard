import React, { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Customized,
  Line
} from "recharts";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";

export default function Chart({ symbol, range = "1d" }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState(range);
  const [chartType, setChartType] = useState<"candle" | "line">("candle");

  const intervalRef = useRef<any>(null);

  const fetchChart = async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const res = await fetch(url);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return;

    const { timestamp, indicators, meta } = result;
    const quote = indicators?.quote?.[0];

    const candleData = timestamp.map((t: number, i: number) => ({
      t,
      time: dayjs(t * 1000).format("HH:mm"),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i],
    }));

    setMeta(meta);
    setData(candleData);
    setLoading(false);
  };

  // Fetch data every 500ms
  useEffect(() => {
    fetchChart();
    intervalRef.current = setInterval(fetchChart, 500);

    return () => clearInterval(intervalRef.current);
  }, [symbol, selectedRange]);

  if (loading) return <div className="flex items-center justify-center h-96 text-white">Loading chart...</div>;

  // ---- CUSTOM CANDLESTICK RENDERER ----
  const renderCandles = (props: any) => {
    const { xAxisMap, yAxisMap, offset, data } = props;
    const xScale = xAxisMap[0].scale;
    const yScale = yAxisMap.price.scale;
    const candleWidth = 6;

    return (
      <g>
        {data.map((d: any, i: number) => {
          const x = xScale(i);
          const openY = yScale(d.open);
          const closeY = yScale(d.close);
          const highY = yScale(d.high);
          const lowY = yScale(d.low);
          const isGreen = d.close >= d.open;

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                x2={x}
                y1={highY}
                y2={lowY}
                stroke={isGreen ? "#4ade80" : "#ef4444"}
                strokeWidth={1.5}
              />

              {/* Candle body */}
              <rect
                x={x - candleWidth / 2}
                y={isGreen ? closeY : openY}
                width={candleWidth}
                height={Math.max(2, Math.abs(closeY - openY))}
                fill={isGreen ? "#4ade80" : "#ef4444"}
              />
            </g>
          );
        })}
      </g>
    );
  };

  // Custom tooltip for better hover info
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 text-white p-3 rounded-lg shadow-xl text-sm">
          <div className="font-bold mb-1">{d.time}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-gray-400">Open:</span>
            <span className="font-medium">₹{d.open?.toFixed(2)}</span>
            <span className="text-gray-400">High:</span>
            <span className="font-medium text-green-400">₹{d.high?.toFixed(2)}</span>
            <span className="text-gray-400">Low:</span>
            <span className="font-medium text-red-400">₹{d.low?.toFixed(2)}</span>
            <span className="text-gray-400">Close:</span>
            <span className="font-medium">₹{d.close?.toFixed(2)}</span>
            <span className="text-gray-400">Volume:</span>
            <span className="font-medium">{d.volume?.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* META INFO */}
      <div className="p-4 mb-3 border border-gray-700 rounded-xl bg-gray-800 text-white text-sm grid grid-cols-2 gap-2">
        <div><b>{meta.longName}</b> ({meta.symbol})</div>
        <div>Currency: {meta.currency}</div>
        <div>Day High: ₹{meta.regularMarketDayHigh?.toFixed(2)}</div>
        <div>Day Low: ₹{meta.regularMarketDayLow?.toFixed(2)}</div>
        <div>52w High: ₹{meta.fiftyTwoWeekHigh?.toFixed(2)}</div>
        <div>52w Low: ₹{meta.fiftyTwoWeekLow?.toFixed(2)}</div>
        <div>Prev Close: ₹{meta.previousClose?.toFixed(2)}</div>
        <div>Price: <span className="text-green-400 font-bold">₹{meta.regularMarketPrice?.toFixed(2)}</span></div>
      </div>

      {/* CHART TYPE TOGGLE */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={chartType === "candle" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("candle")}
        >
          Candlestick
        </Button>
        <Button
          variant={chartType === "line" ? "default" : "outline"}
          size="sm"
          onClick={() => setChartType("line")}
        >
          Line Chart
        </Button>
      </div>

      {/* CHART */}
      <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800" style={{ height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="time" 
              interval={20} 
              stroke="#666"
              tick={{ fill: '#888', fontSize: 12 }}
            />
            <YAxis 
              yAxisId="price" 
              domain={["auto", "auto"]} 
              stroke="#666"
              tick={{ fill: '#888', fontSize: 12 }}
            />
            <YAxis yAxisId="vol" orientation="right" hide domain={[0, "auto"]} />

            <Tooltip content={<CustomTooltip />} />

            {/* Volume bars at bottom */}
            <Bar
              yAxisId="vol"
              dataKey="volume"
              barSize={4}
              fill="#4ade80"
              opacity={0.3}
            />

            {/* Conditional chart type */}
            {chartType === "candle" ? (
              <Customized yAxisId="price" xAxisId={0} data={data} component={renderCandles} />
            ) : (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#4ade80"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
