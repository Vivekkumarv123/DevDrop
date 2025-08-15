// pages/api/upload.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { file } = req.body; // Base64 or remote URL

    const result = await cloudinary.uploader.upload(file, {
      folder: 'devdrop_files',
      access_control: [
        {
          access_type: 'public' 
        }
      ]
    });

    res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
