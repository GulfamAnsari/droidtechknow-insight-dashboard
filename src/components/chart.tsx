import React, { useEffect, useState, useRef } from "react";
import ReactApexChart from "react-apexcharts";

export default function Chart({ symbol }) {
  const [series, setSeries] = useState<any[]>([]);

  // Dropdown states
  const [range, setRange] = useState("1d");
  const [interval, setIntervalValue] = useState("5m"); // default

  const [options] = useState<any>({
    chart: {
      id: "candlestick",
      animations: {
        enabled: true,
        dynamicAnimation: { speed: 500 }
      }
    },
    xaxis: { type: "datetime" },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#4ade80",
          downward: "#ef4444"
        }
      }
    },
    tooltip: { theme: "dark" }
  });

  const intervalRef = useRef<any>(null);

  const fetchChart = async () => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;

    const res = await fetch(url);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return;

    const { timestamp, indicators } = result;
    const quote = indicators?.quote?.[0];
    if (!quote) return;

    const data = timestamp.map((t: number, i: number) => [
      t * 1000,
      quote.open[i],
      quote.high[i],
      quote.low[i],
      quote.close[i],
    ]);

    setSeries([{ data }]);
  };

  // Fetch when symbol, range, or interval changes
  useEffect(() => {
    fetchChart();
  }, [symbol, range, interval]);

  return (
    <div
      style={{
        background: "#1a1a1a",
        padding: 10,
        borderRadius: 8,
        position: "relative",
        color: "white"
      }}
    >
      {/* ---------------- FILTERS ---------------- */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 10,
          alignItems: "center"
        }}
      >
        {/* Range Selection */}
        <div>
          <label style={{ marginRight: 6 }}>Range:</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{
              background: "#0d0d0d",
              color: "white",
              border: "1px solid #333",
              padding: "4px 8px",
              borderRadius: 6
            }}
          >
            <option value="1d">1D</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
            <option value="1y">1Y</option>
          </select>
        </div>

        {/* Interval Selection */}
        <div>
          <label style={{ marginRight: 6 }}>Interval:</label>
          <select
            value={interval}
            onChange={(e) => setIntervalValue(e.target.value)}
            style={{
              background: "#0d0d0d",
              color: "white",
              border: "1px solid #333",
              padding: "4px 8px",
              borderRadius: 6
            }}
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="60m">60m</option>
            <option value="1h">1h</option>
            <option value="1d">1d</option>
          </select>
        </div>
      </div>

      {/* ---------------- CHART ---------------- */}
      <ReactApexChart
        options={options}
        series={series}
        type="candlestick"
        height={500}
      />
    </div>
  );
}
