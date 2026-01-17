
export const SYMBOLS = [
  { symbol: 'BTC', name: 'Bitcoin', volatility: 0.04, initialPrice: 65420.00 },
  { symbol: 'ETH', name: 'Ethereum', volatility: 0.05, initialPrice: 3450.50 },
  { symbol: 'NATGAS', name: 'Natural Gas', volatility: 0.035, initialPrice: 2.15 },
  { symbol: 'SOL', name: 'Solana', volatility: 0.08, initialPrice: 145.20 },
  { symbol: 'LINK', name: 'Chainlink', volatility: 0.06, initialPrice: 18.40 },
  { symbol: 'ADA', name: 'Cardano', volatility: 0.07, initialPrice: 0.45 },
];

export const MAX_CHART_POINTS = 50;
export const UPDATE_INTERVAL_MS = 3000;
export const ANALYSIS_INTERVAL_MS = 15000; // Analysis every 15 seconds to simulate high-frequency monitoring
