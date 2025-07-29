# Real-Time Orderbook Viewer

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It provides a real-time orderbook viewer for cryptocurrency exchanges (OKX, Bybit, Deribit) with WebSocket integration and order simulation capabilities.

## Overview

The Real-Time Orderbook Viewer is a web application built with Next.js and React, designed to display live orderbook data (bids and asks) from multiple cryptocurrency exchanges. It includes a market depth chart and an order simulation feature to analyze the impact of hypothetical trades, providing metrics such as fill percentage, slippage, and market impact.

## Features

- **Real-Time Orderbook Data**: Displays live bids and asks for selected exchanges (OKX, Bybit, Deribit) using WebSocket connections.
- **Market Depth Chart**: Visualizes cumulative order sizes across price levels using Recharts.
- **Order Simulation**: Allows users to simulate market or limit orders and view metrics like fill percentage, average fill price, slippage, market impact, and estimated cost.
- **Multi-Exchange Support**: Switch between OKX, Bybit, and Deribit with real-time connection status indicators.
- **Responsive UI**: Adapts to different screen sizes with toggles for depth chart and order simulation views.
- **Robust Connection Handling**: Automatic reconnection for WebSocket streams to ensure continuous data flow.

## Getting Started

### Prerequisites

- **Node.js**: Version 18.x or higher.
- **npm/yarn/pnpm/bun**: Package manager to install dependencies.
- **Internet Connection**: Required for WebSocket connections to exchange APIs.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-name>