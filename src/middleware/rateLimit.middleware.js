import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === "/";
  }
});

/**
 * Auth routes rate limiter
 * Limits: 5 requests per 15 minutes per IP (strict for login/register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many login/register attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
});

/**
 * Upload rate limiter
 * Limits: 10 requests per hour per IP (large file uploads)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: "Too many file uploads, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Chat/Interpret AI requests limiter
 * Limits: 30 requests per hour per IP (expensive operations)
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 requests per hour
  message: "Too many API requests to AI services, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
