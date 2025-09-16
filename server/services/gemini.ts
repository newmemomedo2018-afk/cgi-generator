import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

// دالة لتحويل الصورة لـ Base64
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    console.log("Fetching image from:", imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log("Image converted to base64, length:", base64.length);
    return base64;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

export async function enhancePromptWithGemini(
  productImageUrl: string,
  sceneImageUrl: string,
  userDescription: string
): Promise<string> {
  try {
    console.log("Gemini API request details:", {
      productImageUrl,
      sceneImageUrl,
      userDescription: userDescription.substring(0, 50),
      apiKeyExists: !!process.env.GEMINI_API_KEY,
      apiKeyLength: process.env.GEMINI_API_KEY?.length || 0
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // تحويل الصور لـ Base64
    console.log("Converting images to base64...");
    const [productImageBase64, sceneImageBase64] = await Promise.all([
      imageUrlToBase64(productImageUrl),
      imageUrlToBase64(sceneImageUrl)
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