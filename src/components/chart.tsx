import React, { useEffect, useState, useRef } from "react";
import ReactApexChart from "react-apexcharts";

export default function Chart({ symbol, height }: { symbol: string, height: number }) {
  const [series, setSeries] = useState<any[]>([]);
  const [chartType, setChartType] = useState<"candlestick" | "line">("candlestick");
  const [range, setRange] = useState("1d");
  const [interval, setIntervalValue] = useState("5m");
  const [live, setLive] = useState(false);

  const intervalRef = useRef<any>(null);

  const fetchChart = async () => {
    try {
      const res = await fetch(
        `https://droidtechknow.com/admin/api/stocks/chart.php?symbol=${symbol}&interval=${interval}&range=${range}`
      );
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
        setSeries([{ name: "Candlestick", data }]);
      } else {
        const data = timestamp.map((t: number, i: number) => ({
          x: t * 1000,
          y: parseFloat(quote.close[i].toFixed(2)),
        }));
        setSeries([{ name: "Close Price", data }]);
      }
    } catch (err) {
      console.error("Failed to fetch chart:", err);
    }
  };

  // Fetch chart on symbol, range, interval, chartType change
  useEffect(() => {
    fetchChart();
  }, [symbol, range, interval, chartType]);

  // Live update effect
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(fetchChart, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [live]);

  const options: any = {
    chart: {
      id: "stock-chart",
      animations: { enabled: true, dynamicAnimation: { speed: 500 } },
      background: "#1a1a1a",
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#fff" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#fff" },
        formatter: (val: number) => val.toFixed(2),
      },
    },
    plotOptions: {
      candlestick: {
        colors: { upward: "#4ade80", downward: "#ef4444" },
      },
    },
    tooltip: { theme: "dark" },
    stroke: { curve: "smooth" },
  };

  return (
    <div style={{ background: "#1a1a1a", padding: 10, borderRadius: 8 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
        {/* Chart Type */}
        <div>
          <label style={{ marginRight: 6 }}>Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
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

        {/* Live Update */}
        <div>
          <label style={{ marginLeft: 6 }}>
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

      {/* Chart */}
      <ReactApexChart options={options} series={series} type={chartType} height={height || 500} />
    </div>
  );
}
