const express = require('express');
const cors = require('cors');
const path = require('path');
const { NseIndia } = require('stock-nse-india');

const app = express();
const nse = new NseIndia();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== CACHE to avoid hammering NSE =====
const cache = {};
const CACHE_TTL = 8000; // 8 seconds

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

// ===== API ROUTES =====

// GET /api/quote/:symbol — Live quote for a single stock
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const cached = getCached('quote_' + sym);
    if (cached) return res.json(cached);
    const data = await nse.getEquityDetails(sym);
    setCache('quote_' + sym, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/trade-info/:symbol — Trade info (volume, deliverable qty, etc.)
app.get('/api/trade-info/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const cached = getCached('trade_' + sym);
    if (cached) return res.json(cached);
    const data = await nse.getEquityTradeInfo(sym);
    setCache('trade_' + sym, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/index/:indexName — Index data (NIFTY 50, NIFTY BANK, etc.)
app.get('/api/index/:indexName', async (req, res) => {
  try {
    const idx = decodeURIComponent(req.params.indexName);
    const cached = getCached('index_' + idx);
    if (cached) return res.json(cached);
    const data = await nse.getEquityStockIndices(idx);
    setCache('index_' + idx, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/gainers/:indexName — Top gainers in an index
app.get('/api/gainers/:indexName', async (req, res) => {
  try {
    const idx = decodeURIComponent(req.params.indexName);
    const cacheKey = 'gainers_' + idx;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await nse.getEquityStockIndices(idx);
    const stocks = (data.data || [])
      .filter(s => s.pChange != null)
      .sort((a, b) => b.pChange - a.pChange);
    setCache(cacheKey, stocks);
    res.json(stocks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/losers/:indexName — Top losers in an index
app.get('/api/losers/:indexName', async (req, res) => {
  try {
    const idx = decodeURIComponent(req.params.indexName);
    const cacheKey = 'losers_' + idx;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await nse.getEquityStockIndices(idx);
    const stocks = (data.data || [])
      .filter(s => s.pChange != null)
      .sort((a, b) => a.pChange - b.pChange);
    setCache(cacheKey, stocks);
    res.json(stocks);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/market-status — Overall market status
app.get('/api/market-status', async (req, res) => {
  try {
    const cached = getCached('market_status');
    if (cached) return res.json(cached);
    const data = await nse.getDataByEndpoint('/api/marketStatus');
    setCache('market_status', data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/all-indices — All NSE indices
app.get('/api/all-indices', async (req, res) => {
  try {
    const cached = getCached('all_indices');
    if (cached) return res.json(cached);
    const data = await nse.getDataByEndpoint('/api/allIndices');
    setCache('all_indices', data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/scan/:indexName — Full scan: all stocks in an index with live data
app.get('/api/scan/:indexName', async (req, res) => {
  try {
    const idx = decodeURIComponent(req.params.indexName);
    const cacheKey = 'scan_' + idx;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await nse.getEquityStockIndices(idx);
    setCache(cacheKey, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/intraday/:symbol — Intraday data
app.get('/api/intraday/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const cached = getCached('intraday_' + sym);
    if (cached) return res.json(cached);
    const data = await nse.getEquityIntradayData(sym);
    setCache('intraday_' + sym, data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/historical/:symbol?range=1y — Historical data
app.get('/api/historical/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const range = req.query.range || '1y';
    const end = new Date();
    const start = new Date();
    if (range === '1m') start.setMonth(start.getMonth() - 1);
    else if (range === '3m') start.setMonth(start.getMonth() - 3);
    else if (range === '6m') start.setMonth(start.getMonth() - 6);
    else start.setFullYear(start.getFullYear() - 1);
    const data = await nse.getEquityHistoricalData(sym, { start, end });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IndiaTrader server running on port ${PORT}`);
});
