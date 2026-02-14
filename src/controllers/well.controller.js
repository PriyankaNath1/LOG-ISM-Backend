import prisma from "../config/prisma.js";
import WellLog from "../models/WellLog.js";
import { parseLAS } from "../utils/lasParser.js";
import { uploadToS3, deleteFromS3 } from "../utils/s3.js";
import { getCachedOrFetch, invalidateUserWellsCache } from "../utils/cache.js";
import { cacheKeys, cacheTTL } from "../config/redis.js";
import fs from "fs";

export const uploadWell = async (req, res) => {
  const { wellName, saveToHistory } = req.body;
  let s3FileUrl = null;

  try {
    // File is temporarily stored locally by multer
    const filePath = req.file.path;

    // Parse the LAS file from the local temporary path
    const parsed = parseLAS(filePath);

    // Upload the file to S3
    const fileBuffer = fs.readFileSync(filePath);
    s3FileUrl = await uploadToS3(
      fileBuffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Clean up local temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error deleting temp file:", err);
    }

    let wellMeta = null;

    if (saveToHistory === "true") {
      wellMeta = await prisma.well.create({
        data: {
          name: wellName,
          filePath: s3FileUrl,
          userId: req.user.id
        }
      });

      await WellLog.create({
        wellId: wellMeta.id,
        userId: req.user.id,
        wellName,
        depth: parsed.depth,
        curves: parsed.curves,
        wellInfo: parsed.wellInfo,
        nullValue: parsed.nullValue
      });

      // Invalidate user's wells cache after upload
      await invalidateUserWellsCache(req.user.id, wellMeta.id);
    }

    res.json({
      message: "Uploaded successfully",
      well: wellMeta,
      parsed
    });
  } catch (error) {
    console.error("Upload error:", error);
    // Clean up S3 if upload failed
    if (s3FileUrl) {
      try {
        await deleteFromS3(s3FileUrl);
      } catch (deleteError) {
        console.error("Error cleaning up S3 file:", deleteError);
      }
    }
    // Clean up local file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting temp file:", err);
      }
    }
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

export const getUserWells = async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = cacheKeys.userWells(userId);

    // Get from cache or fetch from DB
    const wells = await getCachedOrFetch(
      cacheKey,
      () =>
        prisma.well.findMany({
          where: { userId }
        }),
      cacheTTL.wellMetadata
    );

    res.json(wells);
  } catch (error) {
    console.error("Get user wells error:", error);
    res.status(500).json({ message: "Failed to fetch wells", error: error.message });
  }
};

export const getWellData = async (req, res) => {
  try {
    const wellId = req.params.id;
    const cacheKey = cacheKeys.wellData(wellId);

    // Get from cache or fetch from DB
    const wellData = await getCachedOrFetch(
      cacheKey,
      () =>
        WellLog.findOne({
          wellId
        }),
      cacheTTL.wellData
    );

    if (!wellData) {
      return res.status(404).json({ message: "Well data not found" });
    }

    res.json(wellData);
  } catch (error) {
    console.error("Get well data error:", error);
    res.status(500).json({ message: "Failed to fetch well data", error: error.message });
  }
};

export const deleteWell = async (req, res) => {
  const { id } = req.params;

  try {
    // Ensure the well belongs to this user
    const well = await prisma.well.findFirst({
      where: { id, userId: req.user.id }
    });

    if (!well) {
      return res.status(404).json({ message: "Well not found" });
    }

    // Delete file from S3 if it exists
    if (well.filePath && well.filePath.includes("s3")) {
      try {
        await deleteFromS3(well.filePath);
      } catch (s3Error) {
        console.error("Error deleting from S3:", s3Error);
      }
    }

    // Remove associated Mongo log(s)
    await WellLog.deleteMany({ wellId: id, userId: req.user.id });

    // Remove metadata from Postgres
    await prisma.well.delete({ where: { id } });

    // Invalidate cache after deletion
    await invalidateUserWellsCache(req.user.id, id);

    return res.status(204).end();
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

export const deleteAllWells = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get all wells for this user to delete files from S3
    const wells = await prisma.well.findMany({
      where: { userId }
    });

    // Delete all files from S3
    for (const well of wells) {
      if (well.filePath && well.filePath.includes("s3")) {
        try {
          await deleteFromS3(well.filePath);
        } catch (s3Error) {
          console.error("Error deleting file from S3:", s3Error);
        }
      }
    }

    await WellLog.deleteMany({ userId });
    await prisma.well.deleteMany({ where: { userId } });

    // Invalidate all user's wells cache after deletion
    await invalidateUserWellsCache(userId);

    return res.status(204).end();
  } catch (error) {
    console.error("Delete all error:", error);
    return res.status(500).json({ message: "Delete failed", error: error.message });
  }
};