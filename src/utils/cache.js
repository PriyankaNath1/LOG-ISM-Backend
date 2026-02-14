import { getRedis, cacheKeys, cacheTTL } from "../config/redis.js";

/**
 * Get data from cache or fetch from DB
 * @param {string} cacheKey - Redis key
 * @param {Function} fetchFn - Function to fetch data if cache miss
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fresh data
 */
export const getCachedOrFetch = async (cacheKey, fetchFn, ttl = 3600) => {
  const redis = getRedis();

  if (!redis) {
    // Redis not available, fetch directly from DB
    return await fetchFn();
  }

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // Cache miss - fetch from DB
    console.log(`Cache miss: ${cacheKey}`);
    const data = await fetchFn();

    // Store in cache
    if (data) {
      await redis.setEx(cacheKey, ttl, JSON.stringify(data));
    }

    return data;
  } catch (error) {
    console.warn(`Cache operation error for ${cacheKey}:`, error.message);
    // Fallback to direct DB fetch if cache fails
    return await fetchFn();
  }
};

/**
 * Invalidate a specific cache key
 * @param {string|string[]} keys - Cache key(s) to invalidate
 */
export const invalidateCache = async (keys) => {
  const redis = getRedis();

  if (!redis) return;

  try {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const deleted = await redis.del(keyArray);
    if (deleted > 0) {
      console.log(`Invalidated ${deleted} cache key(s)`);
    }
  } catch (error) {
    console.warn("Cache invalidation error:", error.message);
  }
};

/**
 * Invalidate user's well cache when data changes
 * @param {string} userId - User ID
 * @param {string} wellId - Well ID
 */
export const invalidateUserWellsCache = async (userId, wellId = null) => {
  const keysToInvalidate = [cacheKeys.userWells(userId)];

  if (wellId) {
    keysToInvalidate.push(
      cacheKeys.wellData(wellId),
      cacheKeys.wellInterpretation(wellId)
    );
  }

  await invalidateCache(keysToInvalidate);
};

/**
 * Clear all cache
 */
export const clearAllCache = async () => {
  const redis = getRedis();

  if (!redis) return;

  try {
    await redis.flushDb();
    console.log("✓ All cache cleared");
  } catch (error) {
    console.warn("Cache clear error:", error.message);
  }
};
