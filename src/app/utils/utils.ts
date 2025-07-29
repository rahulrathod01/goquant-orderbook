'use client';

import { BybitOrderbookData, ConnectionStatus, DepthChartData, DeribitOrderbookData, ExchangeConfig, ExchangeKey, OKXOrderbookData, OrderbookData, OrderForm, OrderLevel, OrderMetrics, WebSocketMessage } from "../types/types";


export const EXCHANGES: Record<ExchangeKey, ExchangeConfig> = {
  okx: {
    name: 'OKX',
    wsUrl: 'wss://ws.okx.com:8443/ws/v5/public',
    color: '#1890ff',
    restUrl: 'https://www.okx.com/api/v5'
  },
  bybit: {
    name: 'Bybit',
    wsUrl: 'wss://stream.bybit.com/v5/public/spot',
    color: '#f7b801',
    restUrl: 'https://api.bybit.com/v5'
  },
  deribit: {
    name: 'Deribit',
    wsUrl: 'wss://www.deribit.com/ws/api/v2',
    color: '#ff4d4f',
    restUrl: 'https://www.deribit.com/api/v2'
  }
};

export const DEFAULT_SYMBOLS: Record<ExchangeKey, string> = {
  okx: 'BTC-USDT',
  bybit: 'BTCUSDT',
  deribit: 'BTC-PERPETUAL'
};

export const throttle = (func: Function, limit: number) => {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;

  return function(this: any, ...args: any[]) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

export const generateDepthChartData = (orderbook: OrderbookData): DepthChartData[] => {
  if (!orderbook) return [];

  const bidsData: DepthChartData[] = orderbook.bids.map((bid): DepthChartData => ({
    price: bid.price,
    bidTotal: bid.total,
    askTotal: 0
  }));

  const asksData: DepthChartData[] = orderbook.asks.map((ask): DepthChartData => ({
    price: ask.price,
    bidTotal: 0,
    askTotal: ask.total
  }));

  return [...bidsData.reverse(), ...asksData].sort((a, b) => a.price - b.price);
};

export const calculateOrderMetrics = (orderbook: OrderbookData, order: OrderForm): OrderMetrics | null => {
  if (!orderbook || !order.price || !order.quantity) return null;

  const price = parseFloat(order.price);
  const quantity = parseFloat(order.quantity);
  const side = order.side;
  const levels = side === 'buy' ? orderbook.asks : orderbook.bids;

  let fillPercentage = 0;
  let averageFillPrice = 0;
  let slippage = 0;
  let marketImpact = 0;
  let remainingQuantity = quantity;
  let totalCost = 0;
  let weightedPriceSum = 0;
  let filledQuantity = 0;

  if (order.orderType === 'market') {
    for (const level of levels) {
      if (remainingQuantity <= 0) break;

      const fillQty = Math.min(remainingQuantity, level.size);
      totalCost += fillQty * level.price;
      weightedPriceSum += fillQty * level.price;
      filledQuantity += fillQty;
      remainingQuantity -= fillQty;
    }

    if (filledQuantity > 0) {
      averageFillPrice = weightedPriceSum / filledQuantity;
      fillPercentage = (filledQuantity / quantity) * 100;
      const bestPrice = levels[0]?.price || 0;
      slippage = Math.abs((averageFillPrice - bestPrice) / bestPrice) * 100;
      marketImpact = (filledQuantity / (levels[0]?.total || 1)) * 100;
    }
  } else {
    const orderPosition = levels.findIndex(level =>
      side === 'buy' ? level.price <= price : level.price >= price
    );

    if (orderPosition !== -1) {
      fillPercentage = 100;
      averageFillPrice = price;
      marketImpact = (quantity / (levels[0]?.total || 1)) * 100;
    }
  }

  return {
    fillPercentage: Math.min(fillPercentage, 100),
    averageFillPrice,
    slippage,
    marketImpact,
    estimatedCost: totalCost || price * quantity
  };
};

export const connectToExchange = (
  exchange: ExchangeKey,
  onMessage: (exchange: ExchangeKey, data: WebSocketMessage) => void,
  onStatusChange: (exchange: ExchangeKey, status: ConnectionStatus) => void
): WebSocket => {
  const config = EXCHANGES[exchange];
  const ws = new WebSocket(config.wsUrl);

  onStatusChange(exchange, 'connecting');

  ws.onopen = (): void => {
    onStatusChange(exchange, 'connected');
    const symbol = DEFAULT_SYMBOLS[exchange];
    let subscription: any;

    switch (exchange) {
      case 'okx':
        subscription = {
          op: 'subscribe',
          args: [{
            channel: 'books',
            instId: symbol
          }]
        };
        break;
      case 'bybit':
        subscription = {
          op: 'subscribe',
          args: [`orderbook.50.${symbol}`]
        };
        break;
      case 'deribit':
        subscription = {
          jsonrpc: '2.0',
          id: 1,
          method: 'public/subscribe',
          params: {
            channels: [`book.${symbol}.raw`]
          }
        };
        break;
    }

    if (subscription) {
      ws.send(JSON.stringify(subscription));
    }
  };

  ws.onmessage = (event: MessageEvent): void => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      onMessage(exchange, data);
    } catch (error) {
      console.error(`Error processing ${exchange} data:`, error);
    }
  };

  ws.onerror = (error: Event): void => {
    console.error(`WebSocket error for ${config.name}:`, error);
    onStatusChange(exchange, 'error');
  };

  ws.onclose = (): void => {
    console.log(`Disconnected from ${config.name}`);
    onStatusChange(exchange, 'disconnected');
    setTimeout(() => {
      connectToExchange(exchange, onMessage, onStatusChange);
    }, 3000);
  };

  return ws;
};

export const processOrderbookData = (exchange: ExchangeKey, data: WebSocketMessage): OrderbookData | null => {
  try {
    switch (exchange) {
      case 'okx':
        const okxData = data as OKXOrderbookData;
        if (okxData.data?.[0]?.bids && okxData.data?.[0]?.asks) {
          return processOKXData(okxData.data[0]);
        }
        break;
      case 'bybit':
        const bybitData = data as BybitOrderbookData;
        if (bybitData.data?.b && bybitData.data?.a) {
          return processBybitData(bybitData.data);
        }
        break;
      case 'deribit':
        const deribitData = data as DeribitOrderbookData;
        if (deribitData.params?.data?.bids && deribitData.params?.data?.asks) {
          return processDeribitData(deribitData.params.data);
        }
        break;
    }
  } catch (error) {
    console.error(`Error processing ${exchange} orderbook data:`, error);
  }
  return null;
};

const processOKXData = (orderbook: any): OrderbookData => {
  const bids = orderbook.bids.map(([price, size]: [string, string]) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    total: 0
  }));
  const asks = orderbook.asks.map(([price, size]: [string, string]) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    total: 0
  }));
  return calculateTotals({ bids, asks, timestamp: orderbook.ts });
};

const processBybitData = (data: any): OrderbookData => {
  const bids = data.b.map(([price, size]: [string, string]) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    total: 0
  }));
  const asks = data.a.map(([price, size]: [string, string]) => ({
    price: parseFloat(price),
    size: parseFloat(size),
    total: 0
  }));
  return calculateTotals({ bids, asks, timestamp: data.u });
};

const processDeribitData = (data: any): OrderbookData => {
  const bids = data.bids.map(([price, size]: [number, number]) => ({
    price: parseFloat(price.toString()),
    size: parseFloat(size.toString()),
    total: 0
  }));
  const asks = data.asks.map(([price, size]: [number, number]) => ({
    price: parseFloat(price.toString()),
    size: parseFloat(size.toString()),
    total: 0
  }));
  return calculateTotals({ bids, asks, timestamp: data.timestamp });
};

const calculateTotals = (orderbook: Omit<OrderbookData, 'bids' | 'asks'> & { bids: OrderLevel[], asks: OrderLevel[] }): OrderbookData => {
  let bidTotal = 0;
  const bids = orderbook.bids.map((bid) => {
    bidTotal += bid.size;
    return { ...bid, total: bidTotal };
  });

  let askTotal = 0;
  const asks = orderbook.asks.map((ask) => {
    askTotal += ask.size;
    return { ...ask, total: askTotal };
  });

  return { ...orderbook, bids, asks };
};