/**
 * CORS Configuration - Secure Origin Whitelist
 */

export const corsOptions = {
  origin: function (origin, callback) {
    // Allowed origins list - configure these in .env
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:5173", // Vite default
      "http://localhost:3000", // Alternative local dev
      "http://localhost:8080", // Express dev server
      process.env.PROD_FRONTEND_URL, // Production frontend URL
    ].filter(Boolean); // Remove undefined/null values

    // Allow requests with no origin (like mobile apps, curl requests, etc)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600, // Preflight cache duration in seconds
};
