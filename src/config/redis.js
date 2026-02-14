import { createClient } from "redis";

let redisClient = null;

export const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          console.warn(`Redis reconnection attempt ${retries}`);
          if (retries > 10) {
            console.error("Max Redis reconnection attempts reached");
            return new Error("Redis max retries exceeded");
          }
          return Math.min(retries * 50, 500);
        }
      }
    });

    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn("Redis initialization warning:", error.message);
    console.warn("Continuing without Redis caching");
    return null;
  }
};

export const getRedis = () => redisClient;

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
  }
};

// Cache key generators
export const cacheKeys = {
  userWells: (userId) => `wells:${userId}`,
  wellData: (wellId) => `well:${wellId}`,
  wellInterpretation: (wellId) => `interpretation:${wellId}`,
};

// Cache TTLs (in seconds)
export const cacheTTL = {
  wellMetadata: 3600, // 1 hour
  wellData: 7200, // 2 hours
  interpretation: 3600, // 1 hour
};
