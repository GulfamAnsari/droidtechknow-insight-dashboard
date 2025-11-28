import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  Customized
} from "recharts";
import dayjs from "dayjs";

export default function Chart({ symbol, range = "1d" }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [selectedRange, setSelectedRange] = useState(range);

  const fetchChart = async () => {
    setLoading(true);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=${selectedRange}`;
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

  useEffect(() => {
    fetchChart();
  }, [symbol, selectedRange]);

  if (loading) return <div>Loading chart...</div>;

  const ranges = meta?.validRanges ?? ["1d", "5d", "1mo", "3mo", "6mo", "1y", "max"];

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
                stroke={isGreen ? "#0cc90c" : "#ff3d3d"}
                strokeWidth={1}
              />

              {/* Candle body */}
              <rect
                x={x - candleWidth / 2}
                y={isGreen ? closeY : openY}
                width={candleWidth}
                height={Math.max(2, Math.abs(closeY - openY))}
                fill={isGreen ? "#0cc90c" : "#ff3d3d"}
              />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="w-full">
      {/* META INFO */}
      <div className="p-4 mb-3 border rounded-xl bg-gray-100 text-sm grid grid-cols-2 gap-2">
        <div><b>{meta.longName}</b> ({meta.symbol})</div>
        <div>Currency: {meta.currency}</div>
        <div>Day High: {meta.regularMarketDayHigh}</div>
        <div>Day Low: {meta.regularMarketDayLow}</div>
        <div>52w High: {meta.fiftyTwoWeekHigh}</div>
        <div>52w Low: {meta.fiftyTwoWeekLow}</div>
        <div>Prev Close: {meta.previousClose}</div>
        <div>Price: {meta.regularMarketPrice}</div>
      </div>

      {/* RANGE SELECTOR */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ranges.map((r: string) => (
          <button
            key={r}
            className={`px-3 py-1 rounded-full border ${
              selectedRange === r ? "bg-black text-white" : "bg-white"
            }`}
            onClick={() => setSelectedRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* CHART */}
      <div style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" interval={20} />
            <YAxis yAxisId="price" domain={["auto", "auto"]} />
            <YAxis yAxisId="vol" orientation="right" hide domain={[0, "auto"]} />

            <Tooltip />

            {/* Volume bars */}
            <Bar
              yAxisId="vol"
              dataKey="volume"
              barSize={20}
              fill="#8884d8"
              opacity={0.2}
            />

            {/* Candlestick renderer */}
            <Customized yAxisId="price" xAxisId={0} data={data} component={renderCandles} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
