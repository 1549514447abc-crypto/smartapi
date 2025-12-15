import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Trade {
  type: 'buy' | 'sell';
  outcome: string;
  price: string;
  amount: number;
  wallet: string;
  whale: boolean;
  time: string;
}

interface OrderBookEntry {
  price: string;
  size: string;
}

interface MarketData {
  title: string;
  platform: string;
  status: string;
  endDate: string;
  volume: string;
  participants: number;
  yesPrice: number;
  noPrice: number;
  yesChange: number;
  noChange: number;
  originalUrl: string;
}

const MarketDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('token_id') || '';

  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ t: number; p: number }[]>([]);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M'>('1D');
  const tradeStreamRef = useRef<HTMLDivElement>(null);

  // Mock data for demo
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setMarket({
        title: 'Russia/Ukraine ceasefire in 2025?',
        platform: 'Polymarket',
        status: 'active',
        endDate: '2025-12-31',
        volume: '$2.1M',
        participants: 1234,
        yesPrice: 94.2,
        noPrice: 5.8,
        yesChange: 2.3,
        noChange: -2.3,
        originalUrl: 'https://polymarket.com/event/russia-x-ukraine-ceasefire-in-2025'
      });

      // Generate price history
      const history = Array.from({ length: 100 }, (_, i) => ({
        t: Date.now() / 1000 - (100 - i) * 3600,
        p: 0.9 + Math.random() * 0.08
      }));
      setPriceHistory(history);

      // Mock order book
      setOrderBook({
        bids: [
          { price: '0.99', size: '36169' },
          { price: '0.98', size: '19675' },
          { price: '0.97', size: '3748' },
        ],
        asks: [
          { price: '0.04', size: '4999' },
          { price: '0.05', size: '2500' },
          { price: '0.06', size: '1200' },
        ]
      });

      // Initial trades
      setTrades([
        { type: 'buy', outcome: 'Yes', price: '94.3', amount: 2007, wallet: '0xf2a...c91', whale: false, time: '刚刚' },
        { type: 'buy', outcome: 'Yes', price: '94.2', amount: 3200, wallet: 'Whale_0x7d1...a78', whale: true, time: '刚刚' },
        { type: 'sell', outcome: 'Yes', price: '93.8', amount: 780, wallet: '0x8d2...c34', whale: false, time: '12s' },
        { type: 'buy', outcome: 'Yes', price: '94.0', amount: 12500, wallet: 'BigWhale_0x5a9...f67', whale: true, time: '30s' },
        { type: 'buy', outcome: 'Yes', price: '94.1', amount: 1450, wallet: '0x4d7...e82', whale: false, time: '45s' },
        { type: 'sell', outcome: 'Yes', price: '93.9', amount: 560, wallet: '0x2c9...f17', whale: false, time: '52s' },
      ]);

      setLoading(false);
    }, 500);
  }, [slug, tokenId]);

  // Live trade simulation
  useEffect(() => {
    if (loading) return;

    const mockTrades = [
      { type: 'buy' as const, outcome: 'Yes', price: '94.3', amount: 1850, wallet: '0xf2a...c91', whale: false },
      { type: 'sell' as const, outcome: 'Yes', price: '94.1', amount: 420, wallet: '0x3b8...d12', whale: false },
      { type: 'buy' as const, outcome: 'No', price: '5.7', amount: 180, wallet: '0x9c4...e45', whale: false },
      { type: 'buy' as const, outcome: 'Yes', price: '94.2', amount: 3200, wallet: 'Whale_0x7d1...a78', whale: true },
      { type: 'sell' as const, outcome: 'No', price: '5.9', amount: 95, wallet: '0x1e6...b23', whale: false },
      { type: 'buy' as const, outcome: 'Yes', price: '94.0', amount: 12500, wallet: 'BigWhale_0x5a9...f67', whale: true },
    ];

    const interval = setInterval(() => {
      const t = mockTrades[Math.floor(Math.random() * mockTrades.length)];
      const newTrade: Trade = {
        ...t,
        amount: t.amount + Math.floor(Math.random() * 800),
        time: '刚刚'
      };
      setTrades(prev => [newTrade, ...prev.slice(0, 9)]);
    }, 4000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [loading]);

  // Price chart data
  const priceChartData = {
    labels: priceHistory.map((_, i) => {
      const date = new Date(priceHistory[i]?.t * 1000);
      return `${date.getHours()}:00`;
    }).filter((_, i) => i % 4 === 0),
    datasets: [
      {
        label: 'Yes',
        data: priceHistory.filter((_, i) => i % 4 === 0).map(h => h.p * 100),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: 'No',
        data: priceHistory.filter((_, i) => i % 4 === 0).map(h => (1 - h.p) * 100),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244,63,94,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };

  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } },
      y: { min: 0, max: 100, grid: { color: '#e2e8f0' }, ticks: { callback: (v: any) => v + '¢', font: { size: 10 } } },
    },
  };

  // Volume chart data
  const volumeLabels = Array.from({ length: 12 }, (_, i) => `${i * 5}m`);
  const volumeChartData = {
    labels: volumeLabels,
    datasets: [
      {
        label: '买入',
        data: volumeLabels.map(() => Math.random() * 8000 + 2000),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 3,
        barPercentage: 0.95,
        categoryPercentage: 0.95,
      },
      {
        label: '卖出',
        data: volumeLabels.map(() => -(Math.random() * 4000 + 1000)),
        backgroundColor: 'rgba(244, 63, 94, 0.85)',
        borderRadius: 3,
        barPercentage: 0.95,
        categoryPercentage: 0.95,
      },
    ],
  };

  const volumeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { stacked: true, grid: { color: '#e2e8f0' }, ticks: { callback: (v: any) => (v >= 0 ? '+' : '') + (v / 1000).toFixed(0) + 'K', font: { size: 10 } } },
    },
  };

  // Spread chart data
  const spreadLabels = Array.from({ length: 12 }, (_, i) => `${i * 2}h`);
  const spreadChartData = {
    labels: spreadLabels,
    datasets: [
      {
        label: 'Poly vs Kalshi',
        data: spreadLabels.map(() => 2 + Math.random() * 2),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: 'Poly vs Opinion',
        data: spreadLabels.map(() => 0.5 + Math.random()),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236,72,153,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };

  const spreadChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const, labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 10 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { min: 0, grid: { color: '#e2e8f0' }, ticks: { callback: (v: any) => v + '%', font: { size: 10 } } },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4 md:p-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center">
            P
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 font-medium">
                {market?.platform}
              </span>
              <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                进行中
              </span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                套利机会
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">{market?.title}</h1>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
              <span>📅 结束: {market?.endDate}</span>
              <span>💰 交易额: {market?.volume}</span>
              <span>👥 参与: {market?.participants?.toLocaleString()}</span>
              <a
                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700"
                target="_blank"
                rel="noopener noreferrer"
                href={market?.originalUrl}
              >
                查看原链 →
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition">
            立即交易
          </button>
        </div>
      </header>

      {/* Price cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
            <span>Yes</span>
            <span className="text-emerald-500">+{market?.yesChange}%</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600">{market?.yesPrice}¢</div>
          <div className="text-xs text-slate-400">≈ {market?.yesPrice}% 概率</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
            <span>No</span>
            <span className="text-rose-500">{market?.noChange}%</span>
          </div>
          <div className="text-3xl font-bold text-rose-600">{market?.noPrice}¢</div>
          <div className="text-xs text-slate-400">≈ {market?.noPrice}% 概率</div>
        </div>
      </div>

      {/* Cross-platform & arbitrage */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">跨平台比价 + 套利</h3>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            实时更新
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="text-left py-2">平台</th>
                  <th className="text-right py-2 text-emerald-600">Yes</th>
                  <th className="text-right py-2 text-rose-600">No</th>
                  <th className="text-right py-2">价差</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50 bg-violet-50">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center">P</span>
                    Polymarket
                  </td>
                  <td className="py-2 text-right font-bold text-emerald-600">94.2¢</td>
                  <td className="py-2 text-right text-rose-600">5.8¢</td>
                  <td className="py-2 text-right text-slate-400">-</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-2 font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">K</span>
                    Kalshi
                  </td>
                  <td className="py-2 text-right font-bold text-emerald-600">97.4¢</td>
                  <td className="py-2 text-right text-rose-600">4.1¢</td>
                  <td className="py-2 text-right text-amber-600 font-bold">3.2%</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-bold flex items-center justify-center">O</span>
                    Opinion
                  </td>
                  <td className="py-2 text-right text-emerald-600">95.1¢</td>
                  <td className="py-2 text-right text-rose-600">5.2¢</td>
                  <td className="py-2 text-right text-slate-500">0.9%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-5 space-y-3 text-sm">
            <div className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-emerald-700 font-semibold">策略 1 · 跨平台</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs">推荐</span>
              </div>
              <div className="text-xs text-slate-700">Poly Buy Yes 94.2¢ → Kalshi Sell Yes 97.4¢</div>
              <div className="text-xs text-emerald-700 font-semibold mt-1">利润 +0.8%</div>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-700">策略 2 · 对冲</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs">备选</span>
              </div>
              <div className="text-xs text-slate-600">Poly Buy Yes + Limitless Buy No，组合成本 100.7¢</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left main charts */}
        <div className="lg:col-span-7 space-y-4">
          {/* Price chart */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">价格走势</h3>
              <div className="flex gap-2 text-xs text-slate-600">
                {(['1D', '1W', '1M'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2 py-1 rounded-lg transition ${
                      timeRange === range ? 'bg-slate-200' : 'bg-slate-100 hover:bg-slate-150'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              <Line data={priceChartData} options={priceChartOptions} />
            </div>
          </div>

          {/* Volume chart */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">交易量走势</h3>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>买入
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-rose-500"></span>卖出
                </span>
              </div>
            </div>
            <div className="h-48">
              <Bar data={volumeChartData} options={volumeChartOptions} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50">
                <div className="text-lg font-bold text-slate-900">156</div>
                <div className="text-slate-500">1h 交易数</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50">
                <div className="text-lg font-bold text-emerald-600">$45.2K</div>
                <div className="text-slate-500">1h 买入</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-50">
                <div className="text-lg font-bold text-rose-600">$18.7K</div>
                <div className="text-slate-500">1h 卖出</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <div className="text-lg font-bold text-amber-600">2.4:1</div>
                <div className="text-slate-500">买卖比</div>
              </div>
            </div>
          </div>

          {/* Spread chart */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">价差历史</h3>
              <span className="text-xs text-slate-500">Poly vs Kalshi / Opinion</span>
            </div>
            <div className="h-44">
              <Line data={spreadChartData} options={spreadChartOptions} />
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-5 space-y-4">
          {/* Order Book */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Order Book</h3>
              <div className="flex gap-2 text-xs text-slate-500">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">Yes</span>
                <span className="px-2 py-1 rounded bg-slate-100">No</span>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto text-xs space-y-2">
              <div className="flex justify-between text-slate-500 pb-1 border-b border-slate-100">
                <span>价格</span>
                <span>数量</span>
              </div>
              {orderBook.bids.map((bid, i) => (
                <div key={i} className={`flex justify-between ${i === 0 ? 'bg-emerald-50 px-2 py-1 rounded' : ''}`}>
                  <span className="text-emerald-600 font-semibold">{(parseFloat(bid.price) * 100).toFixed(1)}¢</span>
                  <span>{parseInt(bid.size).toLocaleString()}</span>
                </div>
              ))}
              {orderBook.asks.map((ask, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-rose-600 font-semibold">{(parseFloat(ask.price) * 100).toFixed(1)}¢</span>
                  <span>{parseInt(ask.size).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Recent Trades</h3>
              <span className="text-xs text-slate-500">最近 1h</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">99.8¢ Yes</span>
                <span className="font-semibold">$1,996</span>
              </div>
              <div className="flex justify-between">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700">99.7¢ Yes</span>
                <span className="font-semibold">$18,550</span>
              </div>
              <div className="flex justify-between">
                <span className="px-2 py-1 rounded bg-rose-100 text-rose-700">1.6¢ No</span>
                <span className="font-semibold">$50</span>
              </div>
              <div className="flex justify-between">
                <span className="px-2 py-1 rounded bg-rose-100 text-rose-700">1.4¢ No</span>
                <span className="font-semibold">$25</span>
              </div>
            </div>
          </div>

          {/* Live Trade Stream */}
          <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">实时交易流</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE
                </span>
              </div>
              <select className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-600">
                <option>全部</option>
                <option>仅买入</option>
                <option>仅卖出</option>
                <option>大单 ≥$1K</option>
              </select>
            </div>

            {/* Buy/Sell Pressure */}
            <div className="mb-3 p-3 rounded-xl bg-slate-50 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500">买卖压力 (1分钟)</span>
                <span className="font-semibold text-emerald-600">买入主导 68%</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all duration-500" style={{ width: '68%' }}></div>
                <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full transition-all duration-500" style={{ width: '32%' }}></div>
              </div>
              <div className="flex justify-between text-[11px] mt-1.5 text-slate-500">
                <span className="text-emerald-600">🟢 买入 $12,450</span>
                <span className="text-rose-600">卖出 $5,830 🔴</span>
              </div>
            </div>

            {/* Trade Stream */}
            <div ref={tradeStreamRef} className="space-y-2 max-h-80 lg:max-h-96 overflow-y-auto text-sm">
              {trades.map((trade, i) => {
                const isBuy = trade.type === 'buy';
                const bgClass = trade.whale
                  ? 'bg-amber-50 border-amber-500'
                  : isBuy
                  ? 'bg-emerald-50 border-emerald-500'
                  : 'bg-rose-50 border-rose-500';
                const textClass = trade.whale
                  ? 'text-amber-600'
                  : isBuy
                  ? 'text-emerald-600'
                  : 'text-rose-600';
                const icon = trade.whale ? '🐳' : isBuy ? '🟢' : '🔴';

                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg border-l-2 ${bgClass} ${i === 0 ? 'animate-pulse-once' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`${textClass} text-lg`}>{icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {isBuy ? 'Buy' : 'Sell'} {trade.outcome} @ {trade.price}¢
                        </div>
                        <div className="text-[11px] text-slate-400">{trade.wallet}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className={`font-bold ${textClass}`}>${trade.amount.toLocaleString()}</div>
                      <div className="text-slate-400">{trade.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">TVL</div>
          <div className="text-2xl font-bold">$100.3K</div>
          <div className="text-xs text-slate-500">Y: $99.7K / N: $557</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">Cash</div>
          <div className="text-2xl font-bold">$183.1K</div>
          <div className="text-xs text-slate-500">Y: $164.8K / N: $18.3K</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">套利评分</div>
          <div className="text-2xl font-bold text-amber-600">78</div>
          <div className="text-xs text-amber-600">价差 3.2%</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-4">
          <div className="text-xs text-slate-500 mb-1">24h 净流入</div>
          <div className="text-2xl font-bold text-emerald-600">+$26.5K</div>
          <div className="text-xs text-slate-500">买入 &gt; 卖出</div>
        </div>
      </div>

      {/* Related markets */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">相关市场</h3>
          <div className="text-xs text-slate-500">横向滚动查看更多</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <a className="min-w-[240px] p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition" href="#">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Will Ukraine retake Crimea by 2025?</span>
              <span className="text-emerald-600 font-bold">12%</span>
            </div>
            <div className="text-xs text-slate-500">$850K 交易额 · 价差 2.1%</div>
          </a>
          <a className="min-w-[240px] p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition" href="#">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">Russia withdraws from Ukraine in 2025?</span>
              <span className="text-emerald-600 font-bold">8%</span>
            </div>
            <div className="text-xs text-slate-500">$420K 交易额 · 价差 0.5%</div>
          </a>
          <a className="min-w-[240px] p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50 transition" href="#">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">NATO troops in Ukraine by end of 2025?</span>
              <span className="text-emerald-600 font-bold">15%</span>
            </div>
            <div className="text-xs text-slate-500">$320K 交易额 · 价差 0.8%</div>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes pulse-once {
          0% { transform: translateX(20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-pulse-once {
          animation: pulse-once 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MarketDetail;
