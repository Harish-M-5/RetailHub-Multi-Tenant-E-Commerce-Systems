const asyncHandler = require("express-async-handler");
const fs = require("fs");
const { uploadFileToS3 } = require("../utils/s3Upload");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  if (process.env.USE_S3 === "true") {
    const buffer = fs.readFileSync(req.file.path);
    const url = await uploadFileToS3(buffer, req.file.mimetype, req.file.originalname);
    fs.unlinkSync(req.file.path);
    return res.status(201).json({ success: true, url });
  }

  // Absolute URL: the frontend (Vercel) and backend (Render) are different
  // domains in production, so a relative "/uploads/..." would resolve
  // against the Vercel domain and 404. req.protocol is correct here because
  // "trust proxy" is set above, so Render's X-Forwarded-Proto is honored.
  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, url });
});

module.exports = { uploadImage };
