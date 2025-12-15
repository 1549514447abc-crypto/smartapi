import express from 'express';
import {
  getMarket,
  getPricesHistory,
  getBooks,
  getTrades,
  getLastTradesPrices,
  getHolders,
  getGammaMarket,
  searchGammaMarkets,
  getGammaEvents,
  getGammaEventBySlug
} from '../controllers/polymarketController';

const router = express.Router();

// ============================================
// CLOB API Routes (clob.polymarket.com)
// ============================================

// Get market info by token ID
// GET /api/polymarket/market/:tokenId
router.get('/market/:tokenId', getMarket);

// Get price history
// GET /api/polymarket/prices-history?market={tokenId}&interval={1m|5m|1h|1d}&fidelity={100}
router.get('/prices-history', getPricesHistory);

// Get order book (POST with token IDs array or GET with query)
// POST /api/polymarket/books - Body: { tokenIds: ["tokenId1", "tokenId2"] }
// GET /api/polymarket/books?token_ids=tokenId1,tokenId2
router.post('/books', getBooks);
router.get('/books', getBooks);

// Get last trade prices
// GET /api/polymarket/last-trades-prices?market={tokenId}
router.get('/last-trades-prices', getLastTradesPrices);

// ============================================
// Data API Routes (data-api.polymarket.com)
// ============================================

// Get trades
// GET /api/polymarket/trades?asset_id={tokenId}&limit={100}&before={timestamp}&after={timestamp}
router.get('/trades', getTrades);

// Get holders
// GET /api/polymarket/holders?asset_id={tokenId}
router.get('/holders', getHolders);

// ============================================
// Gamma API Routes (gamma-api.polymarket.com)
// ============================================

// Get market info from Gamma (more metadata)
// GET /api/polymarket/gamma/market/:conditionId
router.get('/gamma/market/:conditionId', getGammaMarket);

// Search markets
// GET /api/polymarket/gamma/markets?limit={20}&active={true}&tag={tag}&liquidity_num_min={1000}
router.get('/gamma/markets', searchGammaMarkets);

// Get events
// GET /api/polymarket/gamma/events?limit={20}&active={true}
router.get('/gamma/events', getGammaEvents);

// Get event by slug
// GET /api/polymarket/gamma/events/:slug
router.get('/gamma/events/:slug', getGammaEventBySlug);

export default router;
