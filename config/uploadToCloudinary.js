const axios = require("axios");
const cloudinary = require("../config/cloudinary");

async function uploadToCloudinaryFromUrl(url) {
  try {
    const upload = await cloudinary.uploader.upload(url, {
      folder: "medicine_prescriptions",
    });
    return upload.secure_url;
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    return null;
  }
}

module.exports = uploadToCloudinaryFromUrl;
