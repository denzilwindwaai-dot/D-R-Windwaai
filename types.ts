
export interface StockData {
  time: string;
  price: number;
}

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD'
}

export interface TradeRecord {
  id: string;
  symbol: string;
  type: TradeType;
  price: number;
  amount: number;
  timestamp: Date;
  reasoning: string;
  source?: 'SIMULATION' | 'IG_LIVE';
}

export interface Asset {
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

export interface Portfolio {
  cash: number;
  assets: Asset[];
}

export interface EmployeeStatus {
  isMonitoring: boolean;
  lastAction: string;
  currentThought: string;
  intelligenceLevel: number;
  skills: string[];
  error?: string;
}

export interface MarketAnalysis {
  decision: TradeType;
  confidence: number;
  reasoning: string;
  technicalIndicators: {
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    sentiment: string;
  };
  targetPrice?: number;
  sources?: { title: string; uri: string }[];
}

export interface DailyReport {
  date: string;
  summary: string;
  totalProfitLoss: number;
  majorWins: string[];
  lessonsLearned: string[];
  strategyUpdate: string;
}

export interface IGAccountCredentials {
  apiKey: string;
  username: string;
  password: string;
  environment: 'DEMO' | 'LIVE';
  accountId?: string;
}

export interface IGConnectionStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastSync?: Date;
  error?: string;
  environment?: 'DEMO' | 'LIVE';
}
