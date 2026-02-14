import express from "express";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";
import { interpretTrack } from "../controllers/interpret.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/track", protect, aiLimiter, interpretTrack);

export default router;

