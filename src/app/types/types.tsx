export interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

export interface OrderbookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  timestamp: number | string;
}

export interface ExchangeConfig {
  name: string;
  wsUrl: string;
  color: string;
  restUrl: string;
}

export interface OrderForm {
  venue: ExchangeKey;
  symbol: string;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  timing: 'immediate' | '5s' | '10s' | '30s';
}

export interface SimulatedOrder extends OrderForm {
  timestamp: number;
  id: string;
}

export interface OrderMetrics {
  fillPercentage: number;
  averageFillPrice: number;
  slippage: number;
  marketImpact: number;
  estimatedCost: number;
}

export interface DepthChartData {
  price: number;
  bidTotal: number;
  askTotal: number;
}

export type ExchangeKey = 'okx' | 'bybit' | 'deribit';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface OKXOrderbookData {
  data: Array<{
    bids: [string, string][];
    asks: [string, string][];
    ts: string;
  }>;
}

export interface BybitOrderbookData {
  data: {
    b: [string, string][];
    a: [string, string][];
    u: string;
  };
}

export interface DeribitOrderbookData {
  params: {
    data: {
      bids: [number, number][];
      asks: [number, number][];
      timestamp: number;
    };
  };
}

export type WebSocketMessage = OKXOrderbookData | BybitOrderbookData | DeribitOrderbookData | any;