import express from "express";
import multer from "multer";
import { uploadLimiter } from "../middleware/rateLimit.middleware.js";
import {
  uploadWell,
  getUserWells,
  getWellData,
  deleteWell,
  deleteAllWells
} from "../controllers/well.controller.js";
import { protect } from "../middleware/auth.middleware.js";

// Configure multer for temporary local storage
const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.post("/upload", protect, uploadLimiter, upload.single("file"), uploadWell);
router.get("/", protect, getUserWells);
router.get("/:id", protect, getWellData);
router.delete("/:id", protect, deleteWell);
router.delete("/", protect, deleteAllWells);

export default router;