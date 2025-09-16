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
You are an expert CGI artist creating precise instructions for AI image generation.

ANALYZE the two reference images:
1. PRODUCT IMAGE: Identify the exact product name, brand, label text, shape, size, materials, colors
2. SCENE IMAGE: Note existing objects to be replaced, lighting conditions, environment, perspective

Your task: Create DIRECT COMMANDS for the AI image generator to:
1. REMOVE/REPLACE any existing products in the scene completely
2. INSERT the exact product from the first image 
3. Match lighting, shadows, and perspective perfectly

Generate a COMMAND-STYLE prompt like this example:
"Remove the [existing object] completely from the scene and replace it with the [exact product name] from the reference image. The [product] should appear ultra-realistic in CGI style, [size description], positioned [placement details]. Make sure the lighting and shadows match the [lighting description]. Keep the [background elements] visible. The [product] should have [texture/material details], and look [style description]. Render in high resolution with cinematic composition and sharp details."

User Request: ${userDescription}

BE SPECIFIC about:
- What to REMOVE from the scene
- What EXACT product to INSERT  
- HOW it should look and be positioned
- Lighting and shadow matching requirements

Write DIRECT COMMANDS in English for the AI image generator. Use action verbs like "Remove", "Replace", "Position", "Make sure", "Keep", "Render".
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