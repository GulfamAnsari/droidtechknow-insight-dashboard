import React, { useEffect, useState, useRef } from "react";
import ReactApexChart from "react-apexcharts";

export default function Chart({ symbol }) {
  const [series, setSeries] = useState<any[]>([]);

  // Dropdown states
  const [range, setRange] = useState("1d");
  const [interval, setIntervalValue] = useState("5m"); // default
  const [chartType, setChartType] = useState<"candlestick" | "line">("candlestick"); // ✅ chart type
  const [live, setLive] = useState(false); // live toggle

  const intervalRef = useRef<any>(null);

  const [options, setOptions] = useState<any>({
    chart: {
      id: "chart",
      animations: {
        enabled: true,
        dynamicAnimation: { speed: 500 },
      },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#fff" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#fff" },
        formatter: (val: number) => val.toFixed(2), // ✅ 2 decimal points
      },
    },
    tooltip: { theme: "dark" },
    plotOptions: {
      candlestick: {
        colors: {
          upward: "#4ade80",
          downward: "#ef4444",
        },
      },
    },
    stroke: { width: 2 },
  });

  const fetchChart = async () => {
    const url = `https://droidtechknow.com/admin/api/stocks/chart.php?symbol=${symbol}&interval=${interval}&range=${range}`;
    const res = await fetch(url);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return;

    const { timestamp, indicators } = result;
    const quote = indicators?.quote?.[0];
    if (!quote) return;

    if (chartType === "candlestick") {
      const data = timestamp.map((t: number, i: number) => [
        t * 1000,
        quote.open[i],
        quote.high[i],
        quote.low[i],
        quote.close[i],
      ]);
      setSeries([{ data }]);
    } else {
      // line chart: use close prices
      const data = timestamp.map((t: number, i: number) => [t * 1000, quote.close[i]]);
      setSeries([{ name: symbol, data }]);
    }
  };

  // Fetch on symbol, range, interval, or chartType change
  useEffect(() => {
    fetchChart();
  }, [symbol, range, interval, chartType]);

  // Live updates
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(fetchChart, 500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [live, symbol, range, interval, chartType]);

  return (
    <div
      style={{
        background: "#1a1a1a",
        padding: 10,
        borderRadius: 8,
        color: "white",
      }}
    >
      {/* ---------------- FILTERS ---------------- */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
        {/* Range */}
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
              borderRadius: 6,
            }}
          >
            <option value="1d">1D</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
            <option value="1y">1Y</option>
          </select>
        </div>

        {/* Interval */}
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
              borderRadius: 6,
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

        {/* Chart Type */}
        <div>
          <label style={{ marginRight: 6 }}>Chart:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as "candlestick" | "line")}
            style={{
              background: "#0d0d0d",
              color: "white",
              border: "1px solid #333",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            <option value="candlestick">Candlestick</option>
            <option value="line">Line</option>
          </select>
        </div>

        {/* Live */}
        <div>
          <label>
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            Live
          </label>
        </div>
      </div>

      {/* ---------------- CHART ---------------- */}
      <ReactApexChart options={options} series={series} type={chartType} height={500} />
    </div>
  );
}
