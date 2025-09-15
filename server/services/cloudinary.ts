import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dqtsski2w",
  api_key: process.env.CLOUDINARY_API_KEY || "882716225516264",
  api_secret: process.env.CLOUDINARY_API_SECRET || "k18dJOendyCp95RzyFhLAxbQW2A",
});

export async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "cgi-generator",
        public_id: `${Date.now()}-${filename}`,
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(new Error("Failed to upload image to Cloudinary"));
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error("No result from Cloudinary"));
        }
      }
    ).end(buffer);
  });
}
