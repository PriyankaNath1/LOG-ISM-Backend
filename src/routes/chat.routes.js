import express from "express";
import { aiLimiter } from "../middleware/rateLimit.middleware.js";
import { chatWithAssistant } from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, aiLimiter, chatWithAssistant);

export default router;

