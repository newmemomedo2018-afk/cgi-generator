import { GoogleGenerativeAI } from '@google/generative-ai';
import { ObjectStorageService } from '../objectStorage';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

const objectStorage = new ObjectStorageService();

// دالة لجلب الصورة من Object Storage وتحويلها لـ Base64
async function getImageBufferFromStorage(filePath: string): Promise<string> {
  try {
    console.log("Getting image from Object Storage:", filePath);
    
    // جرب البحث عن الملف كـ public object أول
    let file = await objectStorage.searchPublicObject(filePath);
    
    if (!file) {
      // لو مالقيهوش، جرب تجيبه من الـ object path مباشرة
      console.log("File not found in public search, trying direct object path");
      file = await objectStorage.getObjectFile(filePath);
    }
    
    const buffer = await objectStorage.getFileBuffer(file);
    const base64 = buffer.toString('base64');
    
    console.log("Image loaded from storage, buffer length:", buffer.length, "base64 length:", base64.length);
    return base64;
  } catch (error) {
    console.error("Error getting image from storage:", error);
    throw error;
  }
}

export async function enhancePromptWithGemini(
  productImagePath: string,
  sceneImagePath: string,
  userDescription: string
): Promise<string> {
  try {
    console.log("Gemini API request details:", {
      productImagePath,
      sceneImagePath,
      userDescription: userDescription.substring(0, 50),
      apiKeyExists: !!process.env.GEMINI_API_KEY,
      apiKeyLength: process.env.GEMINI_API_KEY?.length || 0
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // تحويل الصور لـ Base64 من Object Storage
    console.log("Loading images from Object Storage...");
    const [productImageBase64, sceneImageBase64] = await Promise.all([
      getImageBufferFromStorage(productImagePath),
      getImageBufferFromStorage(sceneImagePath)
    ]);

    const prompt = `
You are an expert in CGI and commercial photography. 

ANALYZE the product image carefully and identify:
- The exact product name, brand, and label text
- Product shape, size, materials, and colors
- Packaging design and visual elements

ANALYZE the scene image for:
- Lighting conditions and shadows
- Environment and background elements
- Perspective and camera angle

User Request: ${userDescription}

Create a professional CGI prompt that places the EXACT SAME PRODUCT from the first image into the scene from the second image. Include:
- Precise product description based on what you see in the image
- Realistic lighting and shadow integration
- Natural placement and perspective matching
- High-quality photorealistic rendering specifications

Write the description in English for the AI image generator. Be very specific about the product details you observe.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: productImageBase64,
          mimeType: "image/jpeg"
        }
      },
      {
        inlineData: {
          data: sceneImageBase64,
          mimeType: "image/jpeg"
        }
      }
    ]);
    
    const response = await result.response;
    const enhancedPrompt = response.text();
    
    console.log("Gemini enhanced prompt:", enhancedPrompt);
    return enhancedPrompt;
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback prompt if Gemini fails
    return `Professional CGI integration of product into scene with realistic lighting, shadows, and natural placement. High quality, photorealistic rendering. ${userDescription}`;
  }
}