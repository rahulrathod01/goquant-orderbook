'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from 'recharts';
import {TrendingUp,TrendingDown,Wifi,WifiOff,AlertTriangle,Activity,DollarSign,Clock,BarChart3,Settings } from 'lucide-react';

// Type definitions
interface OrderLevel {
  price: number;
  size: number;
  total: number;
}

interface OrderbookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
  timestamp: number | string;
}

interface ExchangeConfig {
  name: string;
  wsUrl: string;
  color: string;
  restUrl: string;
}

interface OrderForm {
  venue: ExchangeKey;
  symbol: string;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  timing: 'immediate' | '5s' | '10s' | '30s';
}

interface SimulatedOrder extends OrderForm {
  timestamp: number;
  id: string;
}

interface OrderMetrics {
  fillPercentage: number;
  averageFillPrice: number;
  slippage: number;
  marketImpact: number;
  estimatedCost: number;
}

interface DepthChartData {
  price: number;
  bidTotal: number;
  askTotal: number;
}

type ExchangeKey = 'okx' | 'bybit' | 'deribit';
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

// Exchange configurations
const EXCHANGES: Record<ExchangeKey, ExchangeConfig> = {
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

const DEFAULT_SYMBOLS: Record<ExchangeKey, string> = {
  okx: 'BTC-USDT',
  bybit: 'BTCUSDT',
  deribit: 'BTC-PERPETUAL'
};

// WebSocket message interfaces
interface OKXOrderbookData {
  data: Array<{
    bids: [string, string][];
    asks: [string, string][];
    ts: string;
  }>;
}

interface BybitOrderbookData {
  data: {
    b: [string, string][];
    a: [string, string][];
    u: string;
  };
}

interface DeribitOrderbookData {
  params: {
    data: {
      bids: [number, number][];
      asks: [number, number][];
      timestamp: number;
    };
  };
}

type WebSocketMessage = OKXOrderbookData | BybitOrderbookData | DeribitOrderbookData | any;

const OrderbookViewer: React.FC = () => {
  // State management with proper typing
  const [selectedExchange, setSelectedExchange] = useState<ExchangeKey>('okx');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(DEFAULT_SYMBOLS.okx);
  const [orderbooks, setOrderbooks] = useState<Record<ExchangeKey, OrderbookData | undefined>>({
    okx: undefined,
    bybit: undefined,
    deribit: undefined
  });
  const [connections, setConnections] = useState<Record<ExchangeKey, WebSocket | undefined>>({
    okx: undefined,
    bybit: undefined,
    deribit: undefined
  });
  const [connectionStatus, setConnectionStatus] = useState<Record<ExchangeKey, ConnectionStatus>>({
    okx: 'disconnected',
    bybit: 'disconnected',
    deribit: 'disconnected'
  });
  const [lastUpdated, setLastUpdated] = useState<Record<ExchangeKey, number | undefined>>({
    okx: undefined,
    bybit: undefined,
    deribit: undefined
  });

  // Order simulation state
  const [orderForm, setOrderForm] = useState<OrderForm>({
    venue: 'okx',
    symbol: 'BTC-USDT',
    orderType: 'limit',
    side: 'buy',
    price: '',
    quantity: '',
    timing: 'immediate'
  });

  const [simulatedOrder, setSimulatedOrder] = useState<SimulatedOrder | null>(null);
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | null>(null);
  const [showDepthChart, setShowDepthChart] = useState<boolean>(false);
  const [showOrderSim, setShowOrderSim] = useState<boolean>(true);

  const wsRefs = useRef<Record<ExchangeKey, WebSocket | null>>({
    okx: null,
    bybit: null,
    deribit: null
  });

  // Add throttling to prevent excessive updates
  const lastUpdateTime = useRef<number>(0);
  const UPDATE_THROTTLE = 100; // Update at most every 100ms

  // WebSocket connection management
  const connectToExchange = useCallback((exchange: ExchangeKey): void => {
    if (wsRefs.current[exchange]) {
      wsRefs.current[exchange]?.close();
    }

    const config = EXCHANGES[exchange];
    const ws = new WebSocket(config.wsUrl);

    setConnectionStatus(prev => ({ ...prev, [exchange]: 'connecting' }));

    ws.onopen = (): void => {
      console.log(`Connected to ${config.name}`);
      setConnectionStatus(prev => ({ ...prev, [exchange]: 'connected' }));

      // Subscribe to orderbook based on exchange protocol
      let subscription: any;
      const symbol = DEFAULT_SYMBOLS[exchange];

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
      // Throttle updates to prevent excessive re-renders
      const now = Date.now();
      if (now - lastUpdateTime.current < UPDATE_THROTTLE) {
        return;
      }
      lastUpdateTime.current = now;

      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        processOrderbookData(exchange, data);
        setLastUpdated(prev => ({ ...prev, [exchange]: now }));
      } catch (error) {
        console.error(`Error processing ${exchange} data:`, error);
      }
    };

    ws.onerror = (error: Event): void => {
      console.error(`WebSocket error for ${config.name}:`, error);
      setConnectionStatus(prev => ({ ...prev, [exchange]: 'error' }));
    };

    ws.onclose = (): void => {
      console.log(`Disconnected from ${config.name}`);
      setConnectionStatus(prev => ({ ...prev, [exchange]: 'disconnected' }));

      // Reconnect after 3 seconds
      setTimeout(() => {
        if (wsRefs.current[exchange] === ws) {
          connectToExchange(exchange);
        }
      }, 3000);
    };

    wsRefs.current[exchange] = ws;
  }, []);

  const processOrderbookData = (exchange: ExchangeKey, data: WebSocketMessage): void => {
    let processedData: OrderbookData | null = null;

    try {
      switch (exchange) {
        case 'okx':
          const okxData = data as OKXOrderbookData;
          if (okxData.data && okxData.data[0] && okxData.data[0].bids && okxData.data[0].asks) {
            const orderbook = okxData.data[0];
            processedData = {
              bids: orderbook.bids.map(([price, size]): OrderLevel => ({
                price: parseFloat(price),
                size: parseFloat(size),
                total: 0
              })),
              asks: orderbook.asks.map(([price, size]): OrderLevel => ({
                price: parseFloat(price),
                size: parseFloat(size),
                total: 0
              })),
              timestamp: orderbook.ts
            };
          }
          break;

        case 'bybit':
          const bybitData = data as BybitOrderbookData;
          if (bybitData.data && bybitData.data.b && bybitData.data.a) {
            processedData = {
              bids: bybitData.data.b.map(([price, size]): OrderLevel => ({
                price: parseFloat(price),
                size: parseFloat(size),
                total: 0
              })),
              asks: bybitData.data.a.map(([price, size]): OrderLevel => ({
                price: parseFloat(price),
                size: parseFloat(size),
                total: 0
              })),
              timestamp: bybitData.data.u
            };
          }
          break;

        case 'deribit':
          const deribitData = data as DeribitOrderbookData;
          if (deribitData.params && deribitData.params.data && deribitData.params.data.bids && deribitData.params.data.asks) {
            const orderbook = deribitData.params.data;
            processedData = {
              bids: orderbook.bids.map(([price, size]): OrderLevel => ({
                price: parseFloat(price.toString()),
                size: parseFloat(size.toString()),
                total: 0
              })),
              asks: orderbook.asks.map(([price, size]): OrderLevel => ({
                price: parseFloat(price.toString()),
                size: parseFloat(size.toString()),
                total: 0
              })),
              timestamp: orderbook.timestamp
            };
          }
          break;
      }

      if (processedData) {
        // Calculate cumulative totals
        let bidTotal = 0;
        processedData.bids = processedData.bids.map((bid): OrderLevel => {
          bidTotal += bid.size;
          return { ...bid, total: bidTotal };
        });

        let askTotal = 0;
        processedData.asks = processedData.asks.map((ask): OrderLevel => {
          askTotal += ask.size;
          return { ...ask, total: askTotal };
        });

        setOrderbooks(prev => ({
          ...prev,
          [exchange]: processedData
        }));
      }
    } catch (error) {
      console.error(`Error processing ${exchange} orderbook data:`, error);
    }
  };

  // Calculate order metrics
  const calculateOrderMetrics = useCallback((orderbook: OrderbookData, order: OrderForm): OrderMetrics | null => {
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
      // Market order simulation
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
      // Limit order simulation
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
  }, []);

  // Order form handlers
  const handleOrderFormChange = (field: keyof OrderForm, value: string): void => {
    setOrderForm(prev => {
      const updated = { ...prev, [field]: value };

      // Update symbol when venue changes
      if (field === 'venue') {
        updated.symbol = DEFAULT_SYMBOLS[value as ExchangeKey];
      }

      return updated;
    });
  };

  const simulateOrder = (): void => {
    const orderbook = orderbooks[orderForm.venue];
    if (!orderbook) {
      alert('No orderbook data available for selected venue');
      return;
    }

    const metrics = calculateOrderMetrics(orderbook, orderForm);
    setOrderMetrics(metrics);
    setSimulatedOrder({
      ...orderForm,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
  };

  // Generate depth chart data
  const generateDepthChartData = (orderbook: OrderbookData): DepthChartData[] => {
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

  // Initialize connections
  useEffect(() => {
    Object.keys(EXCHANGES).forEach(exchange => {
      connectToExchange(exchange as ExchangeKey);
    });

    return () => {
      Object.values(wsRefs.current).forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    };
  }, [connectToExchange]);

  // Update selected symbol when exchange changes
  useEffect(() => {
    setSelectedSymbol(DEFAULT_SYMBOLS[selectedExchange]);
  }, [selectedExchange]);

  const currentOrderbook = orderbooks[selectedExchange];
  const isConnected = connectionStatus[selectedExchange] === 'connected';
  const lastUpdate = lastUpdated[selectedExchange];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-500" />
            Real-Time Orderbook Viewer
          </h1>
          <p className="text-gray-400">Multi-venue orderbook analysis with order simulation</p>
        </div>

        {/* Exchange Selection */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {Object.entries(EXCHANGES).map(([key, exchange]) => (
              <button
                key={key}
                onClick={() => setSelectedExchange(key as ExchangeKey)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${selectedExchange === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                {connectionStatus[key as ExchangeKey] === 'connected' ?
                  <Wifi className="h-4 w-4 text-green-400" /> :
                  <WifiOff className="h-4 w-4 text-red-400" />
                }
                {exchange.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowOrderSim(!showOrderSim)}
              className={`px-3 py-2 rounded-lg transition-all ${showOrderSim ? 'bg-green-600' : 'bg-gray-700'
                }`}
            >
              <DollarSign className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDepthChart(!showDepthChart)}
              className={`px-3 py-2 rounded-lg transition-all ${showDepthChart ? 'bg-purple-600' : 'bg-gray-700'
                }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Grid - Fixed height containers to prevent shaking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orderbook Display */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 min-h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {EXCHANGES[selectedExchange].name} - {selectedSymbol}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {isConnected ? (
                    <>
                      <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-red-400 rounded-full"></div>
                      <span>Disconnected</span>
                    </>
                  )}
                  {lastUpdate && (
                    <span className="ml-2 font-mono text-xs">
                      {new Date(lastUpdate).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {currentOrderbook ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Asks - Fixed height with stable scrolling */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-red-400">Asks (Sell Orders)</h3>
                      <div className="text-xs text-gray-500 grid grid-cols-3 gap-4 w-full max-w-xs">
                        <span>Price</span>
                        <span>Size</span>
                        <span>Total</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <div className="space-y-1 pb-2">
                          {currentOrderbook.asks.slice(0, 20).reverse().map((ask, index) => (
                            <div
                              key={`ask-${ask.price}-${index}`}
                              className="grid grid-cols-3 gap-2 p-2 bg-red-900/20 rounded text-sm hover:bg-red-900/30 transition-colors duration-150"
                            >
                              <span className="text-red-400 font-mono text-right">{ask.price.toFixed(2)}</span>
                              <span className="font-mono text-right">{ask.size.toFixed(4)}</span>
                              <span className="text-gray-400 font-mono text-right">{ask.total.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bids - Fixed height with stable scrolling */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-green-400">Bids (Buy Orders)</h3>
                      <div className="text-xs text-gray-500 grid grid-cols-3 gap-4 w-full max-w-xs">
                        <span>Price</span>
                        <span>Size</span>
                        <span>Total</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        <div className="space-y-1 pb-2">
                          {currentOrderbook.bids.slice(0, 20).map((bid, index) => (
                            <div
                              key={`bid-${bid.price}-${index}`}
                              className="grid grid-cols-3 gap-2 p-2 bg-green-900/20 rounded text-sm hover:bg-green-900/30 transition-colors duration-150"
                            >
                              <span className="text-green-400 font-mono text-right">{bid.price.toFixed(2)}</span>
                              <span className="font-mono text-right">{bid.size.toFixed(4)}</span>
                              <span className="text-gray-400 font-mono text-right">{bid.total.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading orderbook data...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Depth Chart - Fixed height container */}
            {showDepthChart && currentOrderbook && (
              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-xl font-semibold mb-4">Market Depth Chart</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={generateDepthChartData(currentOrderbook)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="price"
                        stroke="#9CA3AF"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                      <Area
                        type="monotone"
                        dataKey="bidTotal"
                        stackId="1"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="askTotal"
                        stackId="1"
                        stroke="#EF4444"
                        fill="#EF4444"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Order Simulation Panel - Fixed height containers */}
          {showOrderSim && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Order Simulation</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Venue</label>
                    <select
                      value={orderForm.venue}
                      onChange={(e) => handleOrderFormChange('venue', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.entries(EXCHANGES).map(([key, exchange]) => (
                        <option key={key} value={key}>{exchange.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Symbol</label>
                    <input
                      type="text"
                      value={orderForm.symbol}
                      onChange={(e) => handleOrderFormChange('symbol', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Order Type</label>
                      <select
                        value={orderForm.orderType}
                        onChange={(e) => handleOrderFormChange('orderType', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="market">Market</option>
                        <option value="limit">Limit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Side</label>
                      <select
                        value={orderForm.side}
                        onChange={(e) => handleOrderFormChange('side', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                      </select>
                    </div>
                  </div>

                  {orderForm.orderType === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={orderForm.price}
                        onChange={(e) => handleOrderFormChange('price', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter price"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={orderForm.quantity}
                      onChange={(e) => handleOrderFormChange('quantity', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Timing</label>
                    <select
                      value={orderForm.timing}
                      onChange={(e) => handleOrderFormChange('timing', e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="5s">5s Delay</option>
                      <option value="10s">10s Delay</option>
                      <option value="30s">30s Delay</option>
                    </select>
                  </div>

                  <button
                    onClick={simulateOrder}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
                  >
                    Simulate Order
                  </button>
                </div>
              </div>

              {/* Order Metrics - Fixed height container */}
              {orderMetrics && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Order Impact Analysis</h3>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Fill Percentage:</span>
                      <span className="font-mono text-right min-w-[80px]">
                        {orderMetrics.fillPercentage.toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Average Fill Price:</span>
                      <span className="font-mono text-right min-w-[80px]">
                        ${orderMetrics.averageFillPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Slippage:</span>
                      <span className={`font-mono text-right min-w-[80px] ${orderMetrics.slippage > 1 ? 'text-red-400' : 'text-green-400'
                        }`}>
                        {orderMetrics.slippage.toFixed(3)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Market Impact:</span>
                      <span className={`font-mono text-right min-w-[80px] ${orderMetrics.marketImpact > 5 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                        {orderMetrics.marketImpact.toFixed(2)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Estimated Cost:</span>
                      <span className="font-mono text-right min-w-[80px]">
                        ${orderMetrics.estimatedCost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {orderMetrics.slippage > 1 && (
                    <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                        <span className="text-yellow-400 text-sm font-medium">
                          High Slippage Warning
                        </span>
                      </div>
                      <p className="text-yellow-200 text-sm mt-1">
                        This order may cause significant price movement
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: #4B5563;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: #6B7280;
        }
      `}</style>
    </div>
  );
};

export default OrderbookViewer;