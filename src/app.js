import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { corsOptions } from "./config/cors.js";
import { generalLimiter } from "./middleware/rateLimit.middleware.js";
import { initRedis } from "./config/redis.js";
import authRoutes from "./routes/auth.routes.js";
import wellRoutes from "./routes/well.routes.js";
import interpretRoutes from "./routes/interpret.routes.js";
import chatRoutes from "./routes/chat.routes.js";

dotenv.config();

const app = express();

// Security middleware: Set HTTP headers to protect against common attacks
app.use(helmet());

// Rate limiting: Protect API from abuse and DDoS, bruteforce attack
app.use(generalLimiter);

// CORS with secure origin whitelist (never use origin: "*")
app.use(cors(corsOptions));
app.use(express.json());

// Init Redis on app startup
await initRedis();

app.get("/", (req, res) => {
    res.json({ message: "Server is working" });
  });

app.use("/api/auth", authRoutes);
app.use("/api/wells", wellRoutes);
app.use("/api/interpret", interpretRoutes);
app.use("/api/chat", chatRoutes);

export default app;