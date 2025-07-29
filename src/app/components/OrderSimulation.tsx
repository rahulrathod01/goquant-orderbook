import React from 'react';

import { DollarSign, AlertTriangle } from 'lucide-react';
import { OrderForm, OrderMetrics } from '../types/types';
import { EXCHANGES } from '../utils/utils';


interface OrderSimulationProps {
  orderForm: OrderForm;
  orderMetrics: OrderMetrics | null;
  onOrderFormChange: (field: keyof OrderForm, value: string) => void;
  onSimulateOrder: () => void;
}

export const OrderSimulation: React.FC<OrderSimulationProps> = ({
  orderForm,
  orderMetrics,
  onOrderFormChange,
  onSimulateOrder
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Order Simulation</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Venue</label>
          <select
            value={orderForm.venue}
            onChange={(e) => onOrderFormChange('venue', e.target.value)}
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
            onChange={(e) => onOrderFormChange('symbol', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order Type</label>
            <select
              value={orderForm.orderType}
              onChange={(e) => onOrderFormChange('orderType', e.target.value)}
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
              onChange={(e) => onOrderFormChange('side', e.target.value)}
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
              onChange={(e) => onOrderFormChange('price', e.target.value)}
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
            onChange={(e) => onOrderFormChange('quantity', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter quantity"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Timing</label>
          <select
            value={orderForm.timing}
            onChange={(e) => onOrderFormChange('timing', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="immediate">Immediate</option>
            <option value="5s">5s Delay</option>
            <option value="10s">10s Delay</option>
            <option value="30s">30s Delay</option>
          </select>
        </div>

        <button
          onClick={onSimulateOrder}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
        >
          Simulate Order
        </button>
      </div>

      {orderMetrics && (
        <div className="mt-6">
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
  );
};