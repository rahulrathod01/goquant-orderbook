'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';



import { Activity, BarChart3, DollarSign, Wifi, WifiOff } from 'lucide-react';
import { ConnectionStatus, ExchangeKey, OrderbookData, OrderForm, OrderMetrics } from './types/types';
import { calculateOrderMetrics, connectToExchange, DEFAULT_SYMBOLS, EXCHANGES, generateDepthChartData, processOrderbookData, throttle } from './utils/utils';
import { DepthChart } from './components/DepthChart';
import { OrderbookViewer } from './components/OrderbookViewer';
import { OrderSimulation } from './components/OrderSimulation';


export default function OrderbookPage() {
  const [selectedExchange, setSelectedExchange] = useState<ExchangeKey>('okx');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(DEFAULT_SYMBOLS.okx);
  const [orderbooks, setOrderbooks] = useState<Record<ExchangeKey, OrderbookData | undefined>>({
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

  const [orderForm, setOrderForm] = useState<OrderForm>({
    venue: 'okx',
    symbol: 'BTC-USDT',
    orderType: 'limit',
    side: 'buy',
    price: '',
    quantity: '',
    timing: 'immediate'
  });

  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | null>(null);
  const [showDepthChart, setShowDepthChart] = useState<boolean>(false);
  const [showOrderSim, setShowOrderSim] = useState<boolean>(true);

  const wsRefs = useRef<Record<ExchangeKey, WebSocket | null>>({
    okx: null,
    bybit: null,
    deribit: null
  });

  const handleOrderFormChange = (field: keyof OrderForm, value: string): void => {
    setOrderForm(prev => {
      const updated = { ...prev, [field]: value };
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
  };

  const throttledProcessData = useCallback(throttle((exchange: ExchangeKey, data: any) => {
    const processed = processOrderbookData(exchange, data);
    if (processed) {
      setOrderbooks(prev => ({ ...prev, [exchange]: processed }));
      setLastUpdated(prev => ({ ...prev, [exchange]: Date.now() }));
    }
  }, 100), []);

  const handleStatusChange = (exchange: ExchangeKey, status: ConnectionStatus) => {
    setConnectionStatus(prev => ({ ...prev, [exchange]: status }));
  };

  useEffect(() => {
    Object.keys(EXCHANGES).forEach(exchange => {
      const key = exchange as ExchangeKey;
      wsRefs.current[key] = connectToExchange(
        key,
        (ex, data) => throttledProcessData(ex, data),
        handleStatusChange
      );
    });

    return () => {
      Object.values(wsRefs.current).forEach(ws => {
        ws?.close();
      });
    };
  }, []);

  useEffect(() => {
    setSelectedSymbol(DEFAULT_SYMBOLS[selectedExchange]);
  }, [selectedExchange]);

  const currentOrderbook = orderbooks[selectedExchange];
  const depthChartData = currentOrderbook ? generateDepthChartData(currentOrderbook) : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-500" />
            Real-Time Orderbook Viewer
          </h1>
          <p className="text-gray-400">Multi-venue orderbook analysis with order simulation</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            {Object.entries(EXCHANGES).map(([key, exchange]) => (
              <button
                key={key}
                onClick={() => setSelectedExchange(key as ExchangeKey)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  selectedExchange === key
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
              className={`px-3 py-2 rounded-lg transition-all ${
                showOrderSim ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <DollarSign className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDepthChart(!showDepthChart)}
              className={`px-3 py-2 rounded-lg transition-all ${
                showDepthChart ? 'bg-purple-600' : 'bg-gray-700'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrderbookViewer
              exchange={selectedExchange}
              symbol={selectedSymbol}
              orderbook={currentOrderbook}
              status={connectionStatus[selectedExchange]}
              lastUpdated={lastUpdated[selectedExchange]}
            />

            {showDepthChart && currentOrderbook && (
              <DepthChart data={depthChartData} />
            )}
          </div>

          {showOrderSim && (
            <div className="space-y-6">
              <OrderSimulation
                orderForm={orderForm}
                orderMetrics={orderMetrics}
                onOrderFormChange={handleOrderFormChange}
                onSimulateOrder={simulateOrder}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

