import { Request, Response } from 'express';
import axios from 'axios';
import { successResponse, errorResponse } from '../utils/response';

// Polymarket API endpoints
const CLOB_API = 'https://clob.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';
const GAMMA_API = 'https://gamma-api.polymarket.com';

// Common headers for Polymarket requests
const getHeaders = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});

/**
 * Get market info
 * GET /api/polymarket/market/:tokenId
 */
export const getMarket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    if (!tokenId) {
      errorResponse(res, 'Token ID is required', 400);
      return;
    }

    const response = await axios.get(`${CLOB_API}/markets/${tokenId}`, {
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Market info retrieved successfully');
  } catch (error: any) {
    console.error('Get market error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get market info', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get market info', 500, error.message);
    }
  }
};

/**
 * Get price history
 * GET /api/polymarket/prices-history
 * Query params: market (tokenId), startTs (unix timestamp), fidelity (number of points)
 */
export const getPricesHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { market, startTs, fidelity = '100' } = req.query;

    if (!market) {
      errorResponse(res, 'Market (token ID) is required', 400);
      return;
    }

    const params: any = { market, fidelity };
    // If startTs not provided, default to 30 days ago
    if (startTs) {
      params.startTs = startTs;
    } else {
      params.startTs = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    }

    const response = await axios.get(`${CLOB_API}/prices-history`, {
      params,
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Price history retrieved successfully');
  } catch (error: any) {
    console.error('Get prices history error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get price history', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get price history', 500, error.message);
    }
  }
};

/**
 * Get order book
 * POST /api/polymarket/books
 * Body: { tokenIds: string[] }
 * Or GET with query: token_ids (comma separated)
 */
export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    let tokenIds: string[] = [];

    // Support both POST body and GET query params
    if (req.method === 'POST' && req.body.tokenIds) {
      tokenIds = req.body.tokenIds;
    } else if (req.query.token_ids) {
      tokenIds = (req.query.token_ids as string).split(',');
    }

    if (!tokenIds || tokenIds.length === 0) {
      errorResponse(res, 'Token IDs array is required', 400);
      return;
    }

    // Format as array of objects with token_id
    const requestBody = tokenIds.map(id => ({ token_id: id }));

    const response = await axios.post(`${CLOB_API}/books?token_ids`, requestBody, {
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Order book retrieved successfully');
  } catch (error: any) {
    console.error('Get books error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get order book', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get order book', 500, error.message);
    }
  }
};

/**
 * Get trades
 * GET /api/polymarket/trades
 * Query params: asset_id (tokenId), limit, before, after, maker
 */
export const getTrades = async (req: Request, res: Response): Promise<void> => {
  try {
    const { asset_id, limit = '100', before, after, maker } = req.query;

    if (!asset_id) {
      errorResponse(res, 'Asset ID (token ID) is required', 400);
      return;
    }

    const params: any = { asset_id, limit };
    if (before) params.before = before;
    if (after) params.after = after;
    if (maker) params.maker = maker;

    const response = await axios.get(`${DATA_API}/trades`, {
      params,
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Trades retrieved successfully');
  } catch (error: any) {
    console.error('Get trades error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get trades', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get trades', 500, error.message);
    }
  }
};

/**
 * Get last trade prices
 * GET /api/polymarket/last-trades-prices
 * Query params: market (tokenId)
 */
export const getLastTradesPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { market } = req.query;

    if (!market) {
      errorResponse(res, 'Market (token ID) is required', 400);
      return;
    }

    const response = await axios.get(`${CLOB_API}/last-trades-prices`, {
      params: { market },
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Last trade prices retrieved successfully');
  } catch (error: any) {
    console.error('Get last trades prices error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get last trade prices', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get last trade prices', 500, error.message);
    }
  }
};

/**
 * Get holders
 * GET /api/polymarket/holders
 * Query params: asset_id (tokenId)
 */
export const getHolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { asset_id } = req.query;

    if (!asset_id) {
      errorResponse(res, 'Asset ID (token ID) is required', 400);
      return;
    }

    const response = await axios.get(`${DATA_API}/holders`, {
      params: { asset_id },
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Holders retrieved successfully');
  } catch (error: any) {
    console.error('Get holders error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get holders', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get holders', 500, error.message);
    }
  }
};

/**
 * Get market info from Gamma API (includes more metadata)
 * GET /api/polymarket/gamma/market/:conditionId
 */
export const getGammaMarket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conditionId } = req.params;

    if (!conditionId) {
      errorResponse(res, 'Condition ID is required', 400);
      return;
    }

    const response = await axios.get(`${GAMMA_API}/markets/${conditionId}`, {
      headers: getHeaders(),
      timeout: 10000
    });

    successResponse(res, response.data, 'Gamma market info retrieved successfully');
  } catch (error: any) {
    console.error('Get gamma market error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get gamma market info', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get gamma market info', 500, error.message);
    }
  }
};

/**
 * Search markets from Gamma API
 * GET /api/polymarket/gamma/markets
 * Query params: limit, active, closed, offset, order, ascending, tag, end_date_min, liquidity_num_min
 */
export const searchGammaMarkets = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      limit = '20',
      active,
      closed,
      offset,
      order,
      ascending,
      tag,
      end_date_min,
      liquidity_num_min
    } = req.query;

    const params: any = { limit };
    if (active !== undefined) params.active = active;
    if (closed !== undefined) params.closed = closed;
    if (offset) params.offset = offset;
    if (order) params.order = order;
    if (ascending !== undefined) params.ascending = ascending;
    if (tag) params.tag = tag;
    if (end_date_min) params.end_date_min = end_date_min;
    if (liquidity_num_min) params.liquidity_num_min = liquidity_num_min;

    const response = await axios.get(`${GAMMA_API}/markets`, {
      params,
      headers: getHeaders(),
      timeout: 15000
    });

    successResponse(res, response.data, 'Markets search completed successfully');
  } catch (error: any) {
    console.error('Search gamma markets error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to search markets', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to search markets', 500, error.message);
    }
  }
};

/**
 * Get events from Gamma API
 * GET /api/polymarket/gamma/events
 */
export const getGammaEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      limit = '20',
      offset,
      active,
      closed,
      tag,
      slug
    } = req.query;

    const params: any = { limit };
    if (offset) params.offset = offset;
    if (active !== undefined) params.active = active;
    if (closed !== undefined) params.closed = closed;
    if (tag) params.tag = tag;
    if (slug) params.slug = slug;

    const response = await axios.get(`${GAMMA_API}/events`, {
      params,
      headers: getHeaders(),
      timeout: 15000
    });

    successResponse(res, response.data, 'Events retrieved successfully');
  } catch (error: any) {
    console.error('Get gamma events error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get events', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get events', 500, error.message);
    }
  }
};

/**
 * Get event by slug from Gamma API
 * GET /api/polymarket/gamma/events/:slug
 */
export const getGammaEventBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    if (!slug) {
      errorResponse(res, 'Event slug is required', 400);
      return;
    }

    const response = await axios.get(`${GAMMA_API}/events`, {
      params: { slug },
      headers: getHeaders(),
      timeout: 10000
    });

    // Gamma API returns array, get first match
    const events = response.data;
    if (Array.isArray(events) && events.length > 0) {
      successResponse(res, events[0], 'Event retrieved successfully');
    } else {
      errorResponse(res, 'Event not found', 404);
    }
  } catch (error: any) {
    console.error('Get gamma event error:', error.message);
    if (error.response) {
      errorResponse(res, 'Failed to get event', error.response.status, error.response.data?.message || error.message);
    } else {
      errorResponse(res, 'Failed to get event', 500, error.message);
    }
  }
};
