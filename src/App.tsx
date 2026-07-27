/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  Wallet, 
  Activity, 
  Terminal, 
  ShieldCheck, 
  Settings, 
  Play, 
  Square,
  AlertTriangle,
  Zap,
  BarChart3,
  History,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const label = (value: unknown, fallback = "—") => value === undefined || value === null || value === "" ? fallback : String(value);
const pretty = (value: unknown) => label(value).replace(/_/g, " ");

function AdaptiveChart({ title, data, dataKey, color, suffix = "" }: { title: string; data: any[]; dataKey: string; color: string; suffix?: string }) {
  const points = (Array.isArray(data) ? data : []).map((item, index) => ({ index, value: number(item?.[dataKey] ?? item?.[dataKey.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`)]), time: item?.timestamp ?? item?.time }));
  return (
    <div className="h-28 min-w-[150px] flex-1 border border-[#1F1F22] bg-black/20 p-2">
      <div className="flex justify-between text-[9px] uppercase text-slate-500 mb-1"><span>{title}</span><span className="font-mono text-slate-300">{points.length ? `${points[points.length - 1].value.toFixed(2)}${suffix}` : "—"}</span></div>
      {points.length ? <ResponsiveContainer width="100%" height="78%"><LineChart data={points}><YAxis hide domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "#0E0E10", border: "1px solid #2A2A2E", fontSize: 10 }} labelFormatter={() => ""} formatter={(v: number) => [`${v.toFixed(3)}${suffix}`, title]} /><Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer> : <div className="h-[78%] flex items-center justify-center text-[10px] text-slate-600 italic">Awaiting market data</div>}
    </div>
  );
}

function AdaptiveStrategyDashboard({ adaptive, baseUrl, addLog }: { adaptive: any; baseUrl: string; addLog: (message: string, type?: 'info' | 'warn' | 'error' | 'trade') => void }) {
  const [closeOnStop, setCloseOnStop] = useState(false);
  const [working, setWorking] = useState(false);
  const status = label(adaptive?.status ?? adaptive?.state ?? adaptive?.tradingStatus ?? adaptive?.executionStatus, "no_trade").toLowerCase();
  const regime = adaptive?.marketRegime ?? adaptive?.market_regime ?? adaptive?.regime ?? {};
  const selected = adaptive?.selectedStrategy ?? adaptive?.selected_strategy ?? adaptive?.strategy;
  const position = adaptive?.position ?? adaptive?.activePosition ?? adaptive?.active_position;
  const risk = adaptive?.riskLimits ?? adaptive?.risk_limits ?? adaptive?.risk ?? {};
  const rawHistory = adaptive?.timeSeries ?? adaptive?.time_series ?? adaptive?.history ?? adaptive?.indicators ?? [];
  const history = Array.isArray(rawHistory) ? rawHistory : rawHistory?.data ?? rawHistory?.points ?? [];
  const scores = adaptive?.strategyScores ?? adaptive?.strategy_scores ?? adaptive?.scores ?? {};
  const strategies = adaptive?.strategies ?? adaptive?.availableStrategies ?? adaptive?.available_strategies ?? Object.entries(scores).map(([name, score]) => ({ name, score }));
  const isEnabled = Boolean((adaptive?.enabled ?? adaptive?.isEnabled) ?? (status === "executed" || status === "monitoring"));
  const regimeConfidence = regime?.confidence ?? adaptive?.marketRegimeConfidence ?? adaptive?.market_regime_confidence ?? adaptive?.confidence;
  const reasons = regime?.reasons ?? adaptive?.marketRegimeReasons ?? adaptive?.market_regime_reasons ?? adaptive?.analysisReasons ?? adaptive?.analysis_reasons ?? [];
  const stateText: Record<string, string> = { disabled: "Adaptive trading is disabled. Start it when you want the strategy engine to scan.", no_trade: "No trade right now. The engine is waiting for a qualifying setup.", risk_rejected: "A candidate was rejected by active risk limits.", entry_rejected: "The selected strategy did not meet its entry conditions.", executed: "An adaptive strategy is actively managing a position.", monitoring: "Adaptive trading is monitoring the market for its next setup." };
  const post = async (url: string, message: string) => {
    setWorking(true);
    try {
      const response = await fetch(`${baseUrl}${url}`, { method: "POST" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      addLog(message, "info");
    } catch (error) { addLog(error instanceof Error ? error.message : "Adaptive strategy request failed", "error"); }
    finally { setWorking(false); }
  };
  const entries = Array.isArray(strategies) ? strategies : Object.entries(strategies).map(([name, value]) => ({ name, ...(typeof value === "object" ? value as object : { score: value }) }));
  const legs = position?.legs ?? position?.groupedLegs ?? position?.grouped_legs ?? [];
  const utilisation = (used: unknown, limit: unknown) => number(limit) > 0 ? Math.min(100, number(used) / number(limit) * 100) : 0;
  return <div className="bg-[#0E0E10] p-4 flex-1 min-h-0 overflow-y-auto">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[#1F1F22] pb-2">
      <div><h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Adaptive Strategy Dashboard</h3><p className="text-[10px] text-slate-600 mt-1">{stateText[status] ?? "No trade right now. Waiting for a complete adaptive update."}</p></div>
      <div className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 border", isEnabled ? "text-green-400 border-green-500/30 bg-green-900/10" : "text-slate-400 border-[#2A2A2E]")}>{pretty(status)}</div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
      <div className="border border-[#1F1F22] bg-[#16161A]/50 p-3"><span className="text-[9px] text-slate-500 uppercase">Market regime</span><div className="mt-1 flex justify-between gap-3"><b className="text-xs uppercase text-slate-200">{pretty(regime?.name ?? regime?.regime ?? regime)}</b><span className="text-xs font-mono text-orange-400">{number(regimeConfidence) ? `${(number(regimeConfidence) * (number(regimeConfidence) <= 1 ? 100 : 1)).toFixed(0)}%` : "—"}</span></div><div className="mt-2 text-[10px] text-slate-400 leading-relaxed">{Array.isArray(reasons) ? (reasons.length ? reasons.map(String).join(" · ") : "Analysis reasons will appear with the next market update.") : label(reasons, "Analysis reasons will appear with the next market update.")}</div></div>
      <div className="border border-[#1F1F22] bg-[#16161A]/50 p-3"><span className="text-[9px] text-slate-500 uppercase">Decision</span><div className="mt-1 text-xs font-bold text-slate-200">{label(selected, "No strategy selected")}</div><div className="mt-2 text-[10px] text-slate-400">{label(adaptive?.entryReason ?? adaptive?.entry_reason ?? adaptive?.rejectionReason ?? adaptive?.rejection_reason, "Awaiting a qualified entry")}</div></div>
      <div className="border border-[#1F1F22] bg-[#16161A]/50 p-3"><span className="text-[9px] text-slate-500 uppercase">Adaptive position</span><div className="mt-1 flex justify-between"><b className="text-xs text-slate-200">{label(position?.name ?? position?.strategy, "No active position")}</b><b className={cn("text-xs font-mono", number(position?.pnl ?? position?.livePnL ?? position?.live_pnl) >= 0 ? "text-green-400" : "text-red-400")}>{position ? `${number(position?.pnl ?? position?.livePnL ?? position?.live_pnl) >= 0 ? "+" : ""}$${number(position?.pnl ?? position?.livePnL ?? position?.live_pnl).toFixed(2)}` : "—"}</b></div><div className="mt-2 text-[10px] text-slate-400">Margin: {label(position?.marginUsage ?? position?.margin_usage ?? position?.margin, "—")} · Delta: {label(position?.deltaExposure ?? position?.delta_exposure ?? position?.greeks?.delta, "—")}</div></div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
      <div className="border border-[#1F1F22] p-3"><span className="text-[9px] text-slate-500 uppercase">Position legs & Greeks</span>{Array.isArray(legs) && legs.length ? <div className="mt-2 space-y-1 text-[10px] font-mono">{legs.map((leg: any, i: number) => <div key={leg.id ?? i} className="flex justify-between text-slate-300"><span>{label(leg.symbol ?? leg.instrument ?? leg.name)}</span><span className={leg.side === "LONG" ? "text-green-400" : "text-red-400"}>{label(leg.side)} {label(leg.size ?? leg.quantity)}</span></div>)}</div> : <div className="mt-2 text-[10px] text-slate-600 italic">No active adaptive legs</div>}<div className="mt-2 pt-2 border-t border-[#1F1F22] flex gap-3 text-[10px] font-mono text-slate-400"><span>Δ {label(position?.greeks?.delta ?? position?.delta)}</span><span>Γ {label(position?.greeks?.gamma ?? position?.gamma)}</span><span>Θ {label(position?.greeks?.theta ?? position?.theta)}</span><span>V {label(position?.greeks?.vega ?? position?.vega)}</span></div></div>
      <div className="border border-[#1F1F22] p-3"><span className="text-[9px] text-slate-500 uppercase">Risk limits <span className="normal-case text-slate-600">· server-configured</span></span><div className="mt-2 space-y-2">{Object.entries(risk).filter(([, value]) => value !== null && typeof value !== "object").slice(0, 4).map(([name, limit]) => { const used = adaptive?.riskUtilisation?.[name] ?? adaptive?.risk_utilisation?.[name] ?? adaptive?.riskUsage?.[name]; const percent = utilisation(used, limit); return <div key={name}><div className="flex justify-between text-[10px] text-slate-400"><span>{pretty(name)}</span><span className="font-mono">{used !== undefined ? `${used} / ` : ""}{label(limit)}</span></div><div className="h-1 bg-[#1F1F22] mt-1"><div className={cn("h-full", percent > 80 ? "bg-red-500" : "bg-orange-500")} style={{ width: `${percent}%` }} /></div></div>; })}{!Object.keys(risk).length && <div className="text-[10px] text-slate-600 italic">Risk limits are server-configured and not yet reported.</div>}</div><div className="mt-2 text-[10px] text-slate-500">Expiry preference: <span className="text-slate-300">{label(adaptive?.expiryPreference ?? adaptive?.expiry_preference, "server-configured")}</span></div></div>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1 mb-3"><AdaptiveChart title="BTC Price" data={history} dataKey="btcPrice" color="#F27D26" /><AdaptiveChart title="IV" data={history} dataKey="iv" color="#A78BFA" suffix="%" /><AdaptiveChart title="ATR" data={history} dataKey="atr" color="#60A5FA" /><AdaptiveChart title="ADX" data={history} dataKey="adx" color="#34D399" /><AdaptiveChart title="Funding" data={history} dataKey="fundingRate" color="#FBBF24" suffix="%" /></div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-3 border-t border-[#1F1F22] pt-3"><div className="flex flex-wrap gap-2">{entries.length ? entries.map((strategy: any, i: number) => { const name = typeof strategy === "string" ? strategy : label(strategy.name ?? strategy.strategy ?? strategy[0]); const enabled = strategy.enabled ?? strategy.isEnabled ?? true; const score = strategy.score ?? scores?.[name]; return <div key={`${name}-${i}`} className="border border-[#2A2A2E] px-2 py-1.5 text-[10px] flex items-center gap-2"><span className="text-slate-300">{name}</span><span className="font-mono text-slate-500">{score !== undefined ? Number(score).toFixed(2) : "—"}</span><button disabled={working} onClick={() => post(`/api/adaptive-strategy/${encodeURIComponent(name)}/enabled?enabled=${!enabled}`, `${name} ${enabled ? "disabled" : "enabled"}`)} className={cn("uppercase font-bold", enabled ? "text-green-400 hover:text-red-400" : "text-slate-500 hover:text-green-400")}>{enabled ? "On" : "Off"}</button></div>; }) : <span className="text-[10px] text-slate-600 italic">Strategy scores will appear when reported by the server.</span>}</div><div className="flex items-center gap-2"><label className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap"><input type="checkbox" checked={closeOnStop} onChange={e => setCloseOnStop(e.target.checked)} className="accent-[#F27D26]" />Close on stop</label><button disabled={working} onClick={() => post(isEnabled ? `/api/adaptive-strategy/disable${closeOnStop ? "?close_active=true" : ""}` : "/api/adaptive-strategy/enable", isEnabled ? "Adaptive trading stopped" : "Adaptive trading started")} className={cn("px-3 py-1.5 text-[10px] font-bold uppercase border rounded", isEnabled ? "border-red-500/50 text-red-400 hover:bg-red-900/20" : "border-green-500/50 text-green-400 hover:bg-green-900/20")}>{working ? "Working…" : isEnabled ? "Stop adaptive" : "Start adaptive"}</button></div></div>
  </div>;
}

export default function App() {
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isDirectionalEnabled, setIsDirectionalEnabled] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [btcPrice, setBtcPrice] = useState(65000);
  const [netDelta, setNetDelta] = useState(0);
  const [netTheta, setNetTheta] = useState(0);
  const [netGamma, setNetGamma] = useState(0);
  const [wallet, setWallet] = useState({ balance: 50000, usedMargin: 0, availableBalance: 50000, totalEquity: 50000, totalUnrealizedPnL: 0 });
  const [positions, setPositions] = useState<any[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: 'info' | 'warn' | 'error' | 'trade'}[]>([
    { msg: "DeltaBot System Initialized", type: "info" },
    { msg: "Connecting to WebSocket...", type: "info" }
  ]);
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [marketTrend, setMarketTrend] = useState("Neutral");
  const [adaptiveStrategy, setAdaptiveStrategy] = useState<any>(null);
  const [adaptivePosition, setAdaptivePosition] = useState<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  const WS_URL = import.meta.env.VITE_BACKEND_WS_URL || "ws://localhost:8000/ws";
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    const fetchAdaptiveStatus = () => {
      fetch(`${BASE_URL}/api/adaptive-strategy/status`)
        .then(res => res.ok ? res.json() : Promise.reject(new Error("Adaptive status unavailable")))
        .then(data => !disposed && setAdaptiveStrategy(data?.adaptiveStrategy ?? data))
        .catch(() => !disposed && setAdaptiveStrategy(current => current));
    };
    fetch(`${BASE_URL}/api/wallet`).then(res => res.json()).then(setWallet).catch(() => undefined);
    fetch(`${BASE_URL}/api/positions`).then(res => res.json()).then(setPositions).catch(() => undefined);
    fetch(`${BASE_URL}/api/is-bot-running`).then(res => res.json()).then(data => setIsBotRunning(data)).catch(() => undefined);
    fetch(`${BASE_URL}/api/is-directional-enabled`).then(res => res.json()).then(data => setIsDirectionalEnabled(data)).catch(() => undefined);
    fetchAdaptiveStatus();
    const connect = () => {
      socket = new WebSocket(WS_URL);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type !== "MARKET_UPDATE") return;
          setBtcPrice(payload.data?.price ?? payload.price ?? 0);
          if (payload.wallet) setWallet(payload.wallet);
          if (payload.positions) setPositions(payload.positions);
          if (typeof payload.isPaperTrading === "boolean") setIsPaperTrading(payload.isPaperTrading);
          if (payload.marketTrend) setMarketTrend(payload.marketTrend);
          if (payload.adaptiveStrategy) {
            setAdaptiveStrategy(payload.adaptiveStrategy);
          }
          if(payload.marketRegime || payload.marketRegimeConfidence !== undefined || payload.marketRegimeReasons || payload.adaptivePosition || payload.currentAdaptivePosition) {
            setAdaptiveStrategy({
              marketRegime: payload.marketRegime,
              marketRegimeConfidence: payload.marketRegimeConfidence,
              marketRegimeReasons: payload.marketRegimeReasons,
              activePosition: payload.adaptivePosition ?? payload.currentAdaptivePosition,
            });
          }
          if(payload.adaptivePosition){
            setAdaptivePosition(payload.adaptivePosition);
          }
          if (payload.risk) { setNetDelta(payload.risk.netDelta ?? 0); setNetTheta(payload.risk.netTheta ?? 0); setNetGamma(payload.risk.netGamma ?? 0); }
          (payload.logs ?? []).forEach((log: any) => addLog(log.message, log.type));
        } catch { addLog("Invalid WebSocket market update", "warn"); }
      };
      socket.onopen = () => { addLog("WebSocket Connected", "info"); fetchAdaptiveStatus(); };
      socket.onerror = () => addLog("WebSocket Connection Error", "error");
      socket.onclose = () => { if (!disposed) reconnectTimer.current = setTimeout(connect, 3000); };
    };
    connect();
    return () => { disposed = true; if (reconnectTimer.current) clearTimeout(reconnectTimer.current); socket?.close(); };
  }, []);

  const fetchHistory = async () => {
    const res = await fetch(`${BASE_URL}/api/trade-history`);
    const data = await res.json();
    setTradeHistory(data);
    setShowHistory(true);
  };

  const addLog = (msg: string, type: 'info' | 'warn' | 'error' | 'trade' = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 50));
  };

  const toggleBot = async () => {
    if (isBotRunning) {
      await fetch(`${BASE_URL}/api/strategy1/disable`, { method: "POST" });
      setIsBotRunning(false);
      addLog("Emergency shutdown: All trades closed.", "error");
    } else {
      setIsBotRunning(true);
      await fetch(`${BASE_URL}/api/strategy1/run`, { method: "POST" });
      addLog("Iron Fly Strategy deployed.", "trade");
    }
  };

  const toggleDirectional = async () => {
    const endpoint = isDirectionalEnabled ? `${BASE_URL}/api/strategy2/disable` : `${BASE_URL}/api/strategy2/enable`;
    await fetch(endpoint, { method: "POST" });
    setIsDirectionalEnabled(!isDirectionalEnabled);
    addLog(`Directional Strategy ${!isDirectionalEnabled ? 'Enabled' : 'Disabled'}`, "info");
  };

  const closeAll = async () => {
    await fetch(`${BASE_URL}/api/positions/close-all`, { method: "POST" });
    addLog("Manual Close All triggered.", "warn");
  };

  return (
    <div className="bg-[#0A0A0B] text-[#E4E3E0] min-h-screen h-screen flex flex-col font-sans overflow-hidden selection:bg-[#F27D26] selection:text-white">
      {/* Trade History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E0E10] border border-[#1F1F22] w-full max-w-4xl max-h-[80vh] flex flex-col rounded-lg overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-[#1F1F22] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#F27D26]" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Trade History</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="hover:bg-[#1F1F22] p-1 rounded transition-colors text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase border-b border-[#1F1F22]">
                      <th className="pb-2 font-semibold">Instrument</th>
                      <th className="pb-2 font-semibold">Side</th>
                      <th className="pb-2 font-semibold text-right">Size</th>
                      <th className="pb-2 font-semibold text-right">Entry</th>
                      <th className="pb-2 font-semibold text-right">Close</th>
                      <th className="pb-2 font-semibold text-right">PnL</th>
                      <th className="pb-2 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {tradeHistory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-600 italic">No trade history found</td>
                      </tr>
                    )}
                    {tradeHistory.map((trade) => (
                      <tr key={trade.id} className="border-b border-[#1F1F22]/50 hover:bg-[#1F1F22]/20 transition-colors">
                        <td className="py-3 text-slate-300">{trade.symbol}</td>
                        <td className={cn(
                          "py-3 font-bold",
                          trade.side === "LONG" ? "text-green-400" : "text-red-400"
                        )}>{trade.side}</td>
                        <td className="py-3 text-right text-slate-300">{trade.size}</td>
                        <td className="py-3 text-right text-slate-400">${trade.entryprice?.toLocaleString()}</td>
                        <td className="py-3 text-right text-slate-400">${trade.closeprice?.toLocaleString()}</td>
                        <td className={cn(
                          "py-3 text-right font-bold",
                          trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl?.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-slate-500 text-[10px]">
                          {new Date(trade.timestamp * 1000).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation / Header */}
      <header className="h-14 border-b border-[#1F1F22] flex items-center justify-between px-6 bg-[#0E0E10] shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#F27D26] rounded-sm flex items-center justify-center font-bold text-black text-xs italic">Δ</div>
            <h1 className="text-lg font-bold tracking-tight uppercase">DELTABOT <span className="text-[10px] font-normal text-slate-500 uppercase tracking-widest ml-1">v1.0.4 Paper</span></h1>
          </div>
          <div className="flex gap-6 border-l border-[#1F1F22] pl-8">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">BTC/USD</span>
              <span className={cn(
                "text-sm font-mono transition-colors",
                btcPrice > 65000 ? "text-green-400" : "text-red-400"
              )}>${(btcPrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Funding</span>
              <span className="text-sm font-mono text-slate-300 italic">0.0100%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Net Delta</span>
              <span className={cn(
                "text-sm font-mono",
                Math.abs(netDelta ?? 0) > 0.5 ? "text-orange-400" : "text-blue-400"
              )}>{(netDelta ?? 0).toFixed(3)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchHistory}
            className="flex items-center gap-2 bg-[#16161A] hover:bg-[#1F1F22] border border-[#2A2A2E] px-3 py-1.5 rounded transition-colors group"
          >
            <History className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#F27D26] transition-colors" />
            <span className="text-xs font-bold uppercase tracking-wider">History</span>
          </button>
          <div className="bg-[#16161A] border border-[#2A2A2E] px-4 py-1 rounded flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[9px] text-slate-500 uppercase">Equity</span>
              <span className="block text-sm font-mono font-bold">${(wallet?.totalEquity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="w-px h-6 bg-[#2A2A2E]"></div>
            <div className="text-right">
              <span className="block text-[9px] text-slate-500 uppercase">Margin Used</span>
              <span className="block text-sm font-mono text-orange-400">
                {wallet?.balance ? ((wallet.usedMargin / wallet.balance) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          </div>
          <button 
            onClick={toggleBot}
            className={cn(
              "px-4 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all",
              isBotRunning 
              ? "bg-red-900/30 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white"
              : "bg-green-900/30 border border-green-500/50 text-green-500 hover:bg-green-600 hover:text-white"
            )}
          >
            {isBotRunning ? "Kill Switch" : "Run Iron Fly"}
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-12 gap-1 p-1 bg-[#1F1F22] overflow-hidden">
        {/* Left Sidebar: Market & Wallet Details */}
        <section className="col-span-3 flex flex-col gap-1 overflow-hidden">
          <div className="flex-1 bg-[#0E0E10] p-4 overflow-y-auto">
            <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mb-4 border-b border-[#1F1F22] pb-2">Wallet & Risk</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-400">Available Bal.</span>
                <span className="text-lg font-mono font-semibold">${(wallet?.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-end border-b border-[#1F1F22] pb-3">
                <span className="text-xs text-slate-400">Unrealized PnL</span>
                <span className={cn(
                  "text-lg font-mono font-semibold",
                  (wallet?.totalUnrealizedPnL ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                )}>{(wallet?.totalUnrealizedPnL ?? 0) >= 0 ? "+" : ""}${(wallet?.totalUnrealizedPnL ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                  <span>Margin Usage</span>
                  <span>{wallet?.balance ? ((wallet.usedMargin / wallet.balance) * 100).toFixed(1) : "0.0"}% / 80%</span>
                </div>
                <div className="w-full bg-[#1F1F22] h-1">
                  <div 
                    className="bg-orange-500 h-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, wallet?.balance ? (wallet.usedMargin / wallet.balance) * 100 : 0)}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                  <span>Drawdown (SIM)</span>
                  <span>0.00% / 2.0%</span>
                </div>
                <div className="w-full bg-[#1F1F22] h-1">
                  <div className="bg-blue-500 h-full w-[5%]"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-40 bg-[#0E0E10] p-4 shrink-0">
            <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mb-3">Signals (V1 SIM)</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-400">Trend</span>
                <span className={cn(
                  "text-[11px] font-bold uppercase",
                  marketTrend === "Bullish" ? "text-green-400" : "text-red-400"
                )}>{marketTrend}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-400">Directional</span>
                <span className="text-[11px] text-white font-mono italic">{isDirectionalEnabled ? "SCANNING" : "OFF"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-400">Mode</span>
                <span className="text-[11px] text-orange-500 font-bold uppercase">{isPaperTrading ? "Paper" : "Live"}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Middle: Position Monitor & Strategy Focus */}
        <section className="col-span-6 flex flex-col gap-1 overflow-hidden">
          <div className="h-48 bg-[#0E0E10] p-4 flex flex-col overflow-hidden shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Active Positions</h3>
              <div className="flex gap-4">
                <span className="text-[11px] font-mono"><span className="text-slate-500">DELTA:</span> {netDelta.toFixed(3)}</span>
                <span className="text-[11px] font-mono"><span className="text-slate-500">GAMMA:</span> {netGamma.toFixed(3)}</span>
                <span className="text-[11px] font-mono"><span className="text-slate-500">THETA:</span> {netTheta.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-[#1F1F22]">
                    <th className="pb-2 font-semibold">Instrument</th>
                    <th className="pb-2 font-semibold text-right">Side/Size</th>
                    <th className="pb-2 font-semibold text-right">Entry</th>
                    <th className="pb-2 font-semibold text-right">Current</th>
                    <th className="pb-2 font-semibold text-right">PnL (ROE)</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono">
                  {positions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-600 italic">No working positions</td>
                    </tr>
                  )}
                  {positions.map((pos) => (
                    <tr key={pos.id} className="border-b border-[#1F1F22]/50 hover:bg-[#1F1F22]/20 transition-colors">
                      <td className="py-3 text-slate-300">{pos.symbol}</td>
                      <td className={cn(
                        "py-3 text-right font-bold",
                        pos.side === "LONG" ? "text-green-400" : "text-red-400"
                      )}>{pos.side} {pos.size}</td>
                      <td className="py-3 text-right text-slate-400">${(pos.entryPrice ?? 0).toLocaleString()}</td>
                      <td className="py-3 text-right text-slate-400">${(pos.currentPrice ?? 0).toLocaleString()}</td>
                      <td className={cn(
                        "py-3 text-right",
                        (pos.unrealizedPnL ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {(pos.unrealizedPnL ?? 0) >= 0 ? "+" : ""}${(pos.unrealizedPnL ?? 0).toFixed(2)}
                        <span className="text-[9px] ml-1 opacity-70">
                          ({pos.margin ? (((pos.unrealizedPnL ?? 0) / pos.margin) * 100).toFixed(1) : "0.0"}%)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <AdaptiveStrategyDashboard adaptive={adaptiveStrategy} baseUrl={BASE_URL} addLog={addLog} />
        </section>

        {/* Right Sidebar: Controls & Actions */}
        <section className="col-span-3 flex flex-col gap-1 overflow-hidden">
          <div className="flex-1 bg-[#0E0E10] p-4 overflow-y-auto">
            <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mb-4">Manual Controls</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={toggleBot}
                className="w-full bg-[#1F1F22] hover:bg-[#2A2A2E] border border-[#2A2A2E] py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {isBotRunning ? "Close Strategy" : "Deploy Iron Fly"}
              </button>
              <button 
                onClick={() => addLog("Manual hedge rebalance triggered", "info")}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20"
              >
                Adjust Hedge
              </button>
              <button 
                onClick={toggleDirectional}
                className="w-full bg-[#1F1F22] hover:bg-[#2A2A2E] border border-[#2A2A2E] py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {isDirectionalEnabled ? "Disable Trend" : "Enable Trend Signal"}
              </button>
              <div className="pt-4 border-t border-[#1F1F22] mt-2">
                <button 
                  onClick={closeAll}
                  className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/50 text-red-500 py-3 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Flatten Portfolio
                </button>
              </div>
            </div>
          </div>
          <div className="h-40 bg-[#0E0E10] p-4 shrink-0 overflow-hidden">
            <h3 className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mb-3">Hedge Engine</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Delta Threshold</span>
                <span className="text-[11px] font-mono">0.50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Current Drift</span>
                <span className={cn(
                  "text-[11px] font-bold uppercase",
                  Math.abs(netDelta) < 0.5 ? "text-green-400" : "text-orange-400"
                )}>{Math.abs(netDelta) < 0.5 ? "NEUTRAL" : "DRIFTING"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Instrument</span>
                <span className="text-[11px] font-mono italic">BTC-FUT-PERP</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Console / Logs */}
      <footer className="h-[180px] bg-[#0A0A0B] border-t border-[#1F1F22] flex flex-col shrink-0">
        <div className="h-8 border-b border-[#1F1F22] flex items-center px-4 justify-between bg-[#0E0E10]">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">System Console</span>
          <div className="flex gap-4">
            <span className="text-[9px] text-green-500 uppercase">WebSocket: Connected</span>
            <span className="text-[9px] text-slate-500 uppercase">Mode: Paper Trading</span>
          </div>
        </div>
        <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto bg-black/40">
          <AnimatePresence>
            {logs.map((log, i) => (
               <motion.div 
                key={i} 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="text-slate-500 italic mb-1"
              >
                [{new Date().toLocaleTimeString()}] 
                <span className={cn(
                  "mx-2 uppercase font-bold",
                  log.type === 'error' ? "text-red-500" : 
                  log.type === 'warn' ? "text-orange-500" : 
                  log.type === 'trade' ? "text-green-400" : "text-blue-400"
                )}>{log.type}</span> 
                <span className="text-slate-300">{log.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
}
