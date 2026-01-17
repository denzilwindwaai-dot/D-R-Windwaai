import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { 
  Terminal, 
  Activity, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  Settings, 
  Play, 
  Square,
  Zap,
  Cpu,
  RefreshCw,
  Clock,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  BrainCircuit,
  BarChart3,
  FileText,
  Sparkles,
  Trophy,
  Flame,
  Gem,
  LayoutGrid,
  Download,
  FileJson,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Bitcoin,
  Zap as ZapIcon,
  Target,
  Layers,
  Search,
  Globe
} from 'lucide-react';
import { SYMBOLS, UPDATE_INTERVAL_MS, ANALYSIS_INTERVAL_MS, MAX_CHART_POINTS } from './constants';
import { 
  StockData, 
  TradeType, 
  TradeRecord, 
  Portfolio, 
  EmployeeStatus, 
  IGAccountCredentials, 
  IGConnectionStatus,
  DailyReport,
  MarketAnalysis
} from './types';
import { analyzeMarket, generateDailyBriefing } from './services/geminiService';
import { igService } from './services/igService';

// --- Sub-components ---

const LogEntry: React.FC<{ timestamp: Date; message: string; type: 'info' | 'success' | 'warning' | 'error' }> = ({ timestamp, message, type }) => {
  const colors = {
    info: 'text-blue-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-rose-400'
  };
  return (
    <div className="flex gap-3 text-[11px] py-1.5 border-b border-white/5 font-mono group items-start">
      <span className="text-gray-600 shrink-0 tabular-nums">[{timestamp.toLocaleTimeString([], { hour12: false })}]</span>
      <span className={`${colors[type]} leading-tight`}>{message}</span>
    </div>
  );
};

const StatusBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`} />
    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{label}</span>
  </div>
);

// --- Main App ---

export default function App() {
  const PROFIT_TARGET = 250;

  // Market State
  const [prices, setPrices] = useState<Record<string, StockData[]>>(() => {
    const initial: Record<string, StockData[]> = {};
    SYMBOLS.forEach(s => {
      initial[s.symbol] = [{ time: new Date().toLocaleTimeString(), price: s.initialPrice }];
    });
    return initial;
  });
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0].symbol);
  const [sentimentValue, setSentimentValue] = useState(50);
  const globalSentiment = sentimentValue > 60 ? 'BULLISH' : sentimentValue < 40 ? 'BEARISH' : 'NEUTRAL';
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: 100000,
    assets: SYMBOLS.map(s => ({
      symbol: s.symbol,
      name: s.name,
      quantity: 0,
      avgCost: 0,
      currentPrice: s.initialPrice
    }))
  });

  // UI/Modals State
  const [igStatus, setIgStatus] = useState<IGConnectionStatus>({ isConnected: false, isConnecting: false });
  const [showIgModal, setShowIgModal] = useState(false);
  const [useLiveTrading, setUseLiveTrading] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  // AI/Employee State
  const [status, setStatus] = useState<EmployeeStatus>({
    isMonitoring: false,
    lastAction: 'Idle',
    currentThought: 'Neural engine initialized. Ready for multi-asset surveillance.',
    intelligenceLevel: 95.2,
    skills: ['Web-Grounded Intelligence', 'Parallel Node Analysis', 'Real-time Fund Guard']
  });
  const [activeSources, setActiveSources] = useState<{title: string, uri: string}[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [logs, setLogs] = useState<{timestamp: Date, message: string, type: 'info' | 'success' | 'warning' | 'error'}[]>([]);
  
  // Ref for the latest cash to handle multiple trades in one cycle correctly
  const workingCashRef = useRef(portfolio.cash);
  useEffect(() => {
    workingCashRef.current = portfolio.cash;
  }, [portfolio.cash]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setLogs(prev => [{ timestamp: new Date(), message, type }, ...prev].slice(0, 100));
  }, []);

  // Market Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        SYMBOLS.forEach(config => {
          const history = prev[config.symbol] || [];
          const lastPrice = history.length > 0 ? history[history.length - 1].price : config.initialPrice;
          const sentimentImpact = (sentimentValue - 50) / 1500;
          const change = lastPrice * (config.volatility + sentimentImpact) * (Math.random() - 0.5);
          const newPrice = Math.max(0.01, lastPrice + change);
          
          next[config.symbol] = [
            ...history.slice(-(MAX_CHART_POINTS - 1)),
            { time: new Date().toLocaleTimeString([], { hour12: false }), price: newPrice }
          ];
        });
        return next;
      });
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sentimentValue]);

  // Sync Portfolio current prices
  useEffect(() => {
    setPortfolio(prev => ({
      ...prev,
      assets: prev.assets.map(asset => {
        const history = prices[asset.symbol];
        const latestPrice = history && history.length > 0 ? history[history.length - 1].price : asset.currentPrice;
        return { ...asset, currentPrice: latestPrice };
      })
    }));
  }, [prices]);

  // AUTO-EXIT LOGIC: Check for $250 profit target
  useEffect(() => {
    if (!status.isMonitoring) return;

    portfolio.assets.forEach(asset => {
      if (asset.quantity > 0) {
        const unrealizedPnL = (asset.currentPrice - asset.avgCost) * asset.quantity;
        if (unrealizedPnL >= PROFIT_TARGET) {
          addLog(`PROFIT TARGET REACHED: Closing ${asset.symbol} (+ $${unrealizedPnL.toFixed(2)})`, "success");
          executeTrade(asset.symbol, TradeType.SELL, `Automated Profit Target Exit reached ($${PROFIT_TARGET})`, asset.quantity);
        }
      }
    });
  }, [portfolio.assets, status.isMonitoring]);

  // AI Core Logic - Multi-Asset Scanning with Search
  useEffect(() => {
    if (!status.isMonitoring) return;

    const runAnalysisCycle = async () => {
      setStatus(prev => ({ ...prev, lastAction: 'Surveillance global asset sweep...' }));
      addLog("Initializing global asset sweep with web grounding...", "info");

      const allFoundSources: {title: string, uri: string}[] = [];

      for (const config of SYMBOLS) {
        const symbolData = prices[config.symbol];
        if (!symbolData || symbolData.length < 5) continue;

        const history = symbolData.map(d => d.price);
        const asset = portfolio.assets.find(a => a.symbol === config.symbol)!;

        try {
          addLog(`Gathering external data for ${config.symbol}...`, "info");
          const result: MarketAnalysis = await analyzeMarket(config.symbol, history, workingCashRef.current, asset.quantity, globalSentiment);
          
          if (result.sources) {
            allFoundSources.push(...result.sources);
          }

          if (result.confidence > 0.82) {
            const currentPrice = symbolData[symbolData.length - 1].price;
            const isCrypto = config.symbol !== 'NATGAS';
            const defaultSize = isCrypto ? 0.05 : 100;
            const cost = currentPrice * defaultSize;

            if (result.decision === TradeType.BUY && workingCashRef.current >= cost) {
              setStatus(prev => ({ 
                ...prev, 
                currentThought: `Global signal detected for ${config.symbol}: ${result.reasoning}`,
                lastAction: `Executing BUY: ${config.symbol}`
              }));
              executeTrade(config.symbol, TradeType.BUY, result.reasoning);
              workingCashRef.current -= cost;
            } else if (result.decision === TradeType.SELL && asset.quantity > 0) {
              setStatus(prev => ({ 
                ...prev, 
                currentThought: `Profit capture opportunity for ${config.symbol}: ${result.reasoning}`,
                lastAction: `Executing SELL: ${config.symbol}`
              }));
              executeTrade(config.symbol, TradeType.SELL, result.reasoning);
              workingCashRef.current += cost;
            }
          }
        } catch (err) {
          console.error(`Analysis failed for ${config.symbol}`, err);
        }
      }
      
      setActiveSources(prev => {
        const combined = [...allFoundSources, ...prev];
        const unique = Array.from(new Map(combined.map(s => [s.uri, s])).values()).slice(0, 10);
        return unique;
      });

      setStatus(prev => ({ 
        ...prev, 
        lastAction: 'Surveillance Active',
        intelligenceLevel: Math.min(100, prev.intelligenceLevel + 0.02)
      }));
    };

    const interval = setInterval(runAnalysisCycle, ANALYSIS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [status.isMonitoring, prices, globalSentiment, addLog, portfolio.assets]);

  const executeTrade = async (symbol: string, type: TradeType, reasoning: string, overrideAmount?: number) => {
    const symbolPrices = prices[symbol];
    if (!symbolPrices) return;
    const currentPrice = symbolPrices[symbolPrices.length - 1].price;
    const isLive = useLiveTrading && igStatus.isConnected;

    const isCrypto = symbol !== 'NATGAS';
    const defaultSize = isCrypto ? 0.05 : 100;
    const finalSize = overrideAmount || defaultSize;

    if (isLive) {
      const success = await igService.executeTrade(symbol, type, finalSize);
      if (!success) {
        addLog(`Execution fail: Broker rejected ${symbol} order.`, "error");
        return;
      }
    }
    
    setPortfolio(prev => {
      const nextCash = type === TradeType.BUY ? prev.cash - (currentPrice * finalSize) : prev.cash + (currentPrice * finalSize);
      const nextAssets = prev.assets.map(asset => {
        if (asset.symbol === symbol) {
          const nextQty = type === TradeType.BUY ? asset.quantity + finalSize : asset.quantity - finalSize;
          const nextAvgCost = type === TradeType.BUY 
            ? ((asset.avgCost * asset.quantity) + (currentPrice * finalSize)) / (asset.quantity + finalSize)
            : asset.avgCost;
          return { ...asset, quantity: Math.max(0, nextQty), avgCost: nextAvgCost };
        }
        return asset;
      });
      return { cash: nextCash, assets: nextAssets };
    });

    const newTrade: TradeRecord = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      symbol,
      type,
      price: currentPrice,
      amount: finalSize,
      timestamp: new Date(),
      reasoning,
      source: isLive ? 'IG_LIVE' : 'SIMULATION'
    };

    setTrades(prev => [newTrade, ...prev]);
    addLog(`${isLive ? '[LIVE]' : '[SIM]'} ${type} ${symbol} @ $${currentPrice.toFixed(2)}`, "success");
  };

  const handleIgConnect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const creds: IGAccountCredentials = {
      apiKey: formData.get('apiKey') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      environment: formData.get('environment') as 'DEMO' | 'LIVE'
    };
    setIgStatus(prev => ({ ...prev, isConnecting: true }));
    const success = await igService.connect(creds);
    if (success) {
      setIgStatus({ isConnected: true, isConnecting: false, lastSync: new Date(), environment: creds.environment });
      setShowIgModal(false);
      addLog(`Gateway authorized: ${creds.environment}`, "success");
    } else {
      setIgStatus({ isConnected: false, isConnecting: false });
      addLog("Authentication failure.", "error");
    }
  };

  const handleDownloadTrades = () => {
    if (trades.length === 0) {
      addLog("No telemetry data available for archival.", "warning");
      return;
    }

    const tradeData = trades.map(t => ({
      ID: t.id,
      Timestamp: t.timestamp.toLocaleString(),
      Instrument: t.symbol,
      Directive: t.type,
      Price: t.price,
      Amount: t.amount,
      Channel: t.source || 'SIMULATION',
      Rationale: t.reasoning
    }));

    const summaryData = [
      ["Institutional Dossier", "AuroTrade Specialist v3.5"],
      ["Export Timestamp", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Total Assets (NAV)", totalEquity],
      ["Session Performance", pnl],
      ["Operations Count", trades.length]
    ];

    const portfolioData = portfolio.assets.map(a => ({
      Asset: a.symbol,
      Name: a.name,
      Quantity: a.quantity,
      "Avg Cost": a.avgCost,
      "Current Price": a.currentPrice,
      "Unrealized PnL": (a.currentPrice - a.avgCost) * a.quantity
    }));

    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsTrades = XLSX.utils.json_to_sheet(tradeData);
    const wsPortfolio = XLSX.utils.json_to_sheet(portfolioData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, "Overview");
    XLSX.utils.book_append_sheet(workbook, wsPortfolio, "Portfolio");
    XLSX.utils.book_append_sheet(workbook, wsTrades, "Trade History");

    const fileName = `AuroTrade_Registry_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    addLog(`Registry archive exported as Excel: ${fileName}`, "info");
  };

  const toggleMonitoring = () => {
    const nextState = !status.isMonitoring;
    setStatus(prev => ({ ...prev, isMonitoring: nextState }));
    addLog(nextState ? "Neural core engaged. Initializing multi-asset streams." : "Systems standing down.", nextState ? "info" : "warning");
  };

  const handleGenerateReport = async () => {
    if (trades.length === 0) {
      addLog("Insufficient trade data for intelligence briefing.", "warning");
      return;
    }
    
    addLog("Synthesizing multi-asset market intelligence...", "info");
    try {
      const report = await generateDailyBriefing(trades, pnl);
      setDailyReport(report);
      setShowReport(true);
      addLog("Intelligence briefing generated.", "success");
    } catch (error) {
      console.error("Report Generation Error:", error);
      addLog("Briefing synthesis failed. Neural connection unstable.", "error");
    }
  };

  const totalEquity = portfolio.cash + portfolio.assets.reduce((acc, a) => acc + (a.quantity * a.currentPrice), 0);
  const pnl = totalEquity - 100000;

  return (
    <div className="flex h-screen w-full bg-[#050608] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* Sidebar - Terminal Look */}
      <aside className="w-80 bg-[#0A0C10] border-r border-white/5 flex flex-col z-40">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">AUROTRADE</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Multi-Asset AI v3.5</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Neural Maturity</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{status.intelligenceLevel.toFixed(1)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${status.intelligenceLevel}%` }} />
              </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl flex items-center gap-3">
              <Target className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Global Fund Guard</div>
                <div className="text-xs font-bold font-mono text-white">$250.00 / POSITION EXIT</div>
              </div>
            </div>

            <button 
              onClick={() => setShowIgModal(true)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                igStatus.isConnected ? 'bg-orange-600/10 border-orange-500/20 text-orange-400' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${igStatus.isConnected ? 'bg-orange-600 text-white' : 'bg-black/20 text-gray-600'}`}>
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold uppercase">IG Gateway</div>
                  <div className="text-[9px] font-medium opacity-60 uppercase">{igStatus.isConnected ? igStatus.environment : 'Not Linked'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-30" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="px-4 py-2">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Concurrent Surveillance</span>
          </div>
          {SYMBOLS.map(s => {
            const hist = prices[s.symbol];
            const current = hist && hist.length > 0 ? hist[hist.length - 1].price : s.initialPrice;
            const prev = hist && hist.length > 1 ? hist[hist.length - 2].price : current;
            const isUp = current >= prev;
            const isCrypto = s.symbol !== 'NATGAS';

            return (
              <button
                key={s.symbol}
                onClick={() => setSelectedSymbol(s.symbol)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  selectedSymbol === s.symbol 
                    ? 'bg-white/10 border border-white/10 text-white shadow-xl' 
                    : 'bg-transparent border border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCrypto ? <Bitcoin className={`w-4 h-4 ${isUp ? 'text-emerald-500' : 'text-rose-500'}`} /> : <Flame className={`w-4 h-4 ${isUp ? 'text-emerald-500' : 'text-rose-500'}`} />}
                  <div className="text-left">
                    <div className="text-sm font-bold tracking-tight">{s.symbol}</div>
                    <div className="text-[9px] font-medium uppercase text-gray-600">{s.name}</div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-bold tabular-nums">
                  ${current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={toggleMonitoring}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm transition-all duration-300 border ${
              status.isMonitoring 
                ? 'bg-rose-600/10 border-rose-500/20 text-rose-500 hover:bg-rose-600/20' 
                : 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
            }`}
          >
            {status.isMonitoring ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="uppercase tracking-widest">{status.isMonitoring ? 'Cease Operations' : 'Deploy Neural Node'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* Header Stats */}
        <header className="h-28 border-b border-white/5 px-10 flex items-center justify-between shrink-0 bg-[#0A0C10]/80 backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-8">
            <button 
              onClick={handleDownloadTrades}
              className="bg-[#0D1016] border border-white/10 p-4 pr-10 rounded-2xl flex items-center gap-5 border-l-4 border-l-indigo-500 hover:bg-white/5 transition-all group shadow-lg"
            >
              <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">NAV Liquidity</span>
                <span className="text-xl font-bold font-mono tracking-tight tabular-nums">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <Download className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 absolute right-4 transition-colors" />
            </button>

            <div className="flex flex-col">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Session Delta</div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center text-base font-bold font-mono ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {((pnl/100000)*100).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div className="w-px h-10 bg-white/5" />

            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Market Sentiment</div>
              <div className="flex items-center gap-4">
                <span className={`text-lg font-black tracking-tight ${globalSentiment === 'BULLISH' ? 'text-emerald-400' : globalSentiment === 'BEARISH' ? 'text-rose-400' : 'text-gray-400'}`}>{globalSentiment}</span>
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-1000 ${globalSentiment === 'BULLISH' ? 'bg-emerald-500' : globalSentiment === 'BEARISH' ? 'bg-rose-500' : 'bg-gray-500'}`} style={{ width: `${sentimentValue}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Parallel Engines</span>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${status.isMonitoring ? 'bg-indigo-500 animate-pulse' : 'bg-gray-800'}`} style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
            <StatusBadge active={status.isMonitoring} label={status.isMonitoring ? "Computing" : "Standby"} />
            <button 
              onClick={handleGenerateReport} 
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-indigo-400"
              title="Generate Intelligence Brief"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Workspace */}
        <div className="flex-1 p-8 grid grid-cols-12 grid-rows-6 gap-6 relative z-10 overflow-hidden">
          
          {/* Main Visualizer */}
          <section className="col-span-8 row-span-4 bg-[#0A0C10] border border-white/5 rounded-3xl p-8 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{SYMBOLS.find(s => s.symbol === selectedSymbol)?.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Asset Focus — Stream: {selectedSymbol}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {['1M', '5M', '15M', 'SPOT'].map(t => (
                  <button key={t} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${t === '5M' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:text-white'}`}>{t}</button>
                ))}
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prices[selectedSymbol] || []}>
                  <defs>
                    <linearGradient id="proGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#4b5563', fontSize: 10, fontWeight: 700, fontFamily: 'monospace'}} 
                    tickFormatter={(val) => `$${val.toFixed(2)}`} 
                  />
                  <Tooltip 
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{backgroundColor: '#0A0C10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px'}}
                  />
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={3} fill="url(#proGradient)" animationDuration={400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Reasoning & Telemetry */}
          <section className="col-span-4 row-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-[#0A0C10] border border-white/5 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Multi-Thread Reasoning</span>
              </div>
              <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto custom-scrollbar">
                <p className="text-xs text-indigo-100/80 italic font-medium leading-relaxed">
                  "{status.currentThought}"
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] text-gray-500 font-mono uppercase truncate">Last: {status.lastAction}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#0A0C10] border border-white/5 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Intelligence Sources</span>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full ${activeSources.length > 0 ? 'bg-indigo-500 animate-pulse' : 'bg-gray-800'}`} />
              </div>
              <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 overflow-y-auto custom-scrollbar space-y-2">
                {activeSources.length === 0 ? (
                  <div className="text-[10px] text-gray-700 italic uppercase">Awaiting research node sync...</div>
                ) : activeSources.map((source, i) => (
                  <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="text-[10px] font-bold text-indigo-400 truncate">{source.title}</div>
                    <div className="text-[8px] text-gray-600 truncate mt-0.5">{source.uri}</div>
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* Institutional Registry */}
          <section className="col-span-12 row-span-2 bg-[#0A0C10] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <Layers className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white/90">Execution Registry</h3>
                  <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Multi-Asset Real-time Ledger</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownloadTrades} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-bold text-gray-400 hover:text-indigo-400 transition-all uppercase tracking-widest group"
                >
                  <Download className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  Export .XLSX
                </button>
                <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-bold text-indigo-400 uppercase tracking-widest tabular-nums">
                  Ops: {trades.length}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-[#0A0C10]">
                  <tr className="text-[9px] text-gray-600 uppercase font-bold tracking-widest border-b border-white/5">
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Execution Time</th>
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Instrument</th>
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Directive</th>
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Strike Price</th>
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Node Channel</th>
                    <th className="pb-3 px-4 font-bold border-b border-white/5">Analysis Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] font-medium">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-700 uppercase tracking-widest italic">Awaiting multi-threaded signal triggers...</td>
                    </tr>
                  ) : trades.map(trade => (
                    <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4 text-gray-500 font-mono tabular-nums whitespace-nowrap">{trade.timestamp.toLocaleTimeString([], { hour12: false })}</td>
                      <td className="py-3 px-4 font-bold text-indigo-400 whitespace-nowrap">{trade.symbol}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${trade.type === TradeType.BUY ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{trade.type}</span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${trade.source === 'IG_LIVE' ? 'bg-orange-500' : 'bg-gray-600'}`} />
                          <span className="text-[9px] font-bold uppercase tracking-tight text-gray-500">{trade.source === 'IG_LIVE' ? 'IG DIRECT' : 'OFF-CHAIN'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[10px] text-gray-500 italic truncate max-w-[300px] group-hover:text-gray-300 transition-colors" title={trade.reasoning}>
                        {trade.reasoning}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Auth Modal */}
      {showIgModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0A0C10] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-white/5 flex items-center gap-4">
              <div className="p-3 bg-orange-600 rounded-xl text-white">
                <LinkIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight uppercase">Exchange Gateway</h2>
                <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase">Secure Session Gateway</p>
              </div>
            </div>
            <form onSubmit={handleIgConnect} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Environment</label>
                <select name="environment" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-orange-500 outline-none">
                  <option value="DEMO">Sandboxed Testnet</option>
                  <option value="LIVE">Live Production</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">API Key</label>
                <input name="apiKey" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" placeholder="X-API-KEY" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identifier</label>
                  <input name="username" type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" placeholder="User ID" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest ml-1">Passphrase</label>
                  <input name="password" type="password" required className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-orange-500 outline-none" placeholder="••••••••" />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setShowIgModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={igStatus.isConnecting} className="flex-[2] py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest flex items-center justify-center gap-2">
                  {igStatus.isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {igStatus.isConnecting ? 'Linking...' : 'Authenticate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Report Modal */}
      {showReport && dailyReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
           <div className="bg-[#0A0C10] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-300">
             <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-600 rounded-xl">
                   <Monitor className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h2 className="text-xl font-bold tracking-tight uppercase">Multi-Asset Intelligence Brief</h2>
                   <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">Global Snapshot — {new Date().toLocaleDateString()}</p>
                 </div>
               </div>
               <button onClick={() => setShowReport(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500">
                 <Square className="w-6 h-6" />
               </button>
             </div>
             
             <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest block mb-1">Portfolio Alpha</span>
                    <div className={`text-2xl font-bold font-mono ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest block mb-1">Compute Precision</span>
                    <div className="text-2xl font-bold font-mono text-indigo-400">98.4%</div>
                  </div>
               </div>

               <div className="space-y-3">
                 <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">Strategy Synthesis</h4>
                 <div className="bg-white/[0.03] border border-white/5 p-5 rounded-2xl">
                   <p className="text-sm text-gray-300 leading-relaxed italic">"{dailyReport.summary}"</p>
                 </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Growth Directive</h4>
                  <p className="text-sm text-indigo-100/60 leading-relaxed font-medium">{dailyReport.strategyUpdate}</p>
               </div>
             </div>

             <div className="p-8 border-t border-white/5 bg-white/[0.02] flex gap-4">
               <button onClick={handleDownloadTrades} className="flex-1 py-4 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                 <Download className="w-4 h-4" /> Export Excel
               </button>
               <button onClick={() => setShowReport(false)} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest text-[10px]">Acknowledge Briefing</button>
             </div>
           </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.25); }
      `}</style>
    </div>
  );
}
