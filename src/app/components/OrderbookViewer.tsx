import React from 'react';

import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionStatus, ExchangeKey, OrderbookData } from '../types/types';

interface OrderbookViewerProps {
  exchange: ExchangeKey;
  symbol: string;
  orderbook: OrderbookData | undefined;
  status: ConnectionStatus;
  lastUpdated?: number;
}

export const OrderbookViewer: React.FC<OrderbookViewerProps> = ({
  exchange,
  symbol,
  orderbook,
  status,
  lastUpdated
}) => {
  const isConnected = status === 'connected';

  return (
    <div className="bg-gray-800 rounded-lg p-6 min-h-[600px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {exchange} - {symbol}
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
          {lastUpdated && (
            <span className="ml-2 font-mono text-xs">
              {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {orderbook ? (
        <div className="grid grid-cols-2 gap-4 h-full">
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
                  {orderbook.asks.slice(0, 20).reverse().map((ask, index) => (
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
                  {orderbook.bids.slice(0, 20).map((bid, index) => (
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
  );
};