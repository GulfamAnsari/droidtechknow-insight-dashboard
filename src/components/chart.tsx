// src/components/LiveStockChart.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

interface LiveStockChartProps {
  symbol: string;
  intervalMs?: number;
}

export default function LiveStockChart({ symbol, intervalMs = 500 }: LiveStockChartProps) {
  const [dataPoints, setDataPoints] = useState<{ time: string; price: number }[]>([]);
  const intervalRef = useRef<number>();

  const fetchPrice = async () => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m`;
      const res = await fetch(url);
      const json = await res.json();
      const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number') {
        setDataPoints((prev) => {
          const now = new Date();
          return [...prev, { time: now.toLocaleTimeString(), price }];
        });
      }
    } catch (err) {
      console.warn("Price fetch failed", err);
    }
  };

  useEffect(() => {
    fetchPrice();
    intervalRef.current = window.setInterval(fetchPrice, intervalMs);
    return () => {
      window.clearInterval(intervalRef.current);
    };
  }, [symbol]);

  const chartData = {
    labels: dataPoints.map((d) => d.time),
    datasets: [
      {
        label: symbol,
        data: dataPoints.map((d) => d.price),
        fill: false,
        borderColor: 'rgba(75,192,192,1)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Price (₹)' } },
    },
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
