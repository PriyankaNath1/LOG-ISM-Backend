import express from "express";
import multer from "multer";
import { authLimiter, uploadLimiter } from "../middleware/rateLimit.middleware.js";
import {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  uploadAvatar
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

const upload = multer({ dest: "uploads/avatars/" });

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, me);
router.patch("/me", protect, updateProfile);
router.post("/change-password", protect, changePassword);
router.post("/avatar", protect, uploadLimiter, upload.single("avatar"), uploadAvatar);

export default router;