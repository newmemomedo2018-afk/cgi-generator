import { GoogleGenerativeAI } from '@google/generative-ai';
import { ObjectStorageService } from '../objectStorage';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

const objectStorage = new ObjectStorageService();

// Function to get image from Object Storage with correct MIME type detection
async function getImageDataFromStorage(filePath: string): Promise<{base64: string; mimeType: string}> {
  try {
    console.log("Getting image from Object Storage:", filePath);
    
    // Try to find the file as a public object first
    let file = await objectStorage.searchPublicObject(filePath);
    
    if (!file) {
      // If not found, try to get it from the object path directly
      console.log("File not found in public search, trying direct object path");
      file = await objectStorage.getObjectFile(filePath);
    }
    
    // Get file metadata to determine actual MIME type
    const [metadata] = await file.getMetadata();
    const mimeType = metadata.contentType || "image/jpeg"; // Fallback to JPEG if unknown
    
    const buffer = await objectStorage.getFileBuffer(file);
    const base64 = buffer.toString('base64');
    
    console.log("Image loaded from storage:", {
      bufferLength: buffer.length,
      base64Length: base64.length,
      mimeType,
      fileName: metadata.name
    });
    
    return { base64, mimeType };
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

    // Load images with correct MIME types from Object Storage
    console.log("Loading images from Object Storage...");
    const [productImageData, sceneImageData] = await Promise.all([
      getImageDataFromStorage(productImagePath),
      getImageDataFromStorage(sceneImagePath)
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
          data: productImageData.base64,
          mimeType: productImageData.mimeType
        }
      },
      {
        inlineData: {
          data: sceneImageData.base64,
          mimeType: sceneImageData.mimeType
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

// دالة جديدة للـ Image Generation باستخدام Gemini 2.5 Flash Image
export async function generateImageWithGemini(
  productImagePath: string,
  sceneImagePath: string,
  enhancedPrompt: string
): Promise<string> {
  try {
    console.log("Gemini Image Generation request:", {
      productImagePath,
      sceneImagePath,
      promptLength: enhancedPrompt.length,
      promptPreview: enhancedPrompt.substring(0, 100) + "..."
    });

    // استخدام Gemini 2.5 Flash Image model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    // Load images with correct MIME types from Object Storage
    console.log("Loading images for Gemini Image Generation...");
    const [productImageData, sceneImageData] = await Promise.all([
      getImageDataFromStorage(productImagePath),
      getImageDataFromStorage(sceneImagePath)
    ]);

    // تكوين الـ prompt مع الصور للـ multi-image input
    const prompt = `
MULTI-IMAGE COMPOSITION TASK:

PRODUCT IMAGE (First): The exact product to be placed
SCENE IMAGE (Second): The target environment/background

INSTRUCTIONS:
${enhancedPrompt}

CRITICAL REQUIREMENTS:
- Preserve the scene background 100% exactly (lighting, people, buildings, textures)
- Only replace/add the product from the first image into the scene
- Match lighting, shadows, and perspective perfectly
- Maintain photorealistic CGI quality with ultra-sharp details
- Render at high resolution (1024x1024 minimum)
- Use the exact product branding, colors, and shape from the first image
- Seamless integration with no visible compositing artifacts
`;

    // Send request to Gemini with multi-image input using correct MIME types
    const result = await model.generateContent([
      {
        inlineData: {
          data: productImageData.base64,
          mimeType: productImageData.mimeType
        }
      },
      {
        inlineData: {
          data: sceneImageData.base64,
          mimeType: sceneImageData.mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    
    // Get the generated image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No image generated by Gemini - no candidates in response');
    }

    const parts = candidates[0].content.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No content parts in Gemini response');
    }

    // Search for the image in the response using SDK field names
    for (const part of parts) {
      // The SDK uses camelCase format
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        const imageBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        
        console.log("Gemini image generated successfully:", {
          base64Length: imageBase64.length,
          mimeType,
          responseStructure: 'inlineData (SDK format)'
        });
        
        return imageBase64;
      }
    }

    // Enhanced error logging
    console.error('Gemini response structure:', JSON.stringify({
      candidatesCount: candidates.length,
      partsCount: parts.length,
      partTypes: parts.map(p => Object.keys(p)),
      fullParts: parts.slice(0, 2) // Log first 2 parts for debugging
    }, null, 2));

    throw new Error('No image data found in Gemini response - check response structure');
    
  } catch (error) {
    console.error("Gemini Image Generation error:", error);
    throw new Error(`Failed to generate image with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}