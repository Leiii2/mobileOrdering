const express = require("express");
const sql = require("mssql");
const { poolPromise } = require("../server");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "Uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product_${req.params.productCode}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only JPEG and PNG images are allowed"));
  },
});

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: "error", message: "No token provided" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET not defined in environment variables");
    }
    const decoded = jwt.verify(token, secret);
    if (!decoded.admin) {
      return res.status(403).json({ status: "error", message: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: "error", message: "Invalid token", error: error.message });
  }
};

// Upload Product Image (POST) - Admin only
router.post("/:categoryCode/:productCode/image", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No image file provided" });
    }

    res.json({ status: "success", message: "Image uploaded successfully" });
  } catch (error) {
    console.error("Image Upload Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to upload image", error: error.message });
  }
});

// Delete Product Image (DELETE) - Admin only
router.delete("/:categoryCode/:productCode/image", verifyAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    if (!pool) {
      return res.status(500).json({ status: "error", message: "Database connection failed" });
    }

    // Delete existing images
    const extensions = [".jpg", ".jpeg", ".png"];
    for (const ext of extensions) {
      const filePath = path.join(__dirname, "../Uploads", `product_${req.params.productCode}${ext}`);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }

    res.json({ status: "success", message: "Image deleted successfully" });
  } catch (error) {
    console.error("Image Delete Error:", error.message, error.stack);
    res.status(500).json({ status: "error", message: "Failed to delete image", error: error.message });
  }
});

module.exports = router;