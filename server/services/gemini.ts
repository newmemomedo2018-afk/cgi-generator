import { GoogleGenerativeAI } from '@google/generative-ai';
import { ObjectStorageService } from '../objectStorage';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

const objectStorage = new ObjectStorageService();

// Function to get image from Object Storage with correct MIME type detection
async function getImageDataFromStorage(filePath: string): Promise<{base64: string; mimeType: string}> {
  try {
    console.log("Getting image from storage:", filePath);
    
    // Check if it's a URL (from local file system) or relative path
    let filename = null;
    
    if (filePath.startsWith('http')) {
      // Check for Cloudinary URLs first
      if (filePath.includes('cloudinary.com') || filePath.includes('res.cloudinary.com')) {
        console.log("Fetching Cloudinary image:", filePath);
        
        try {
          const response = await fetch(filePath);
          if (!response.ok) {
            throw new Error(`Failed to fetch Cloudinary image: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          
          console.log("Cloudinary image loaded successfully:", {
            url: filePath,
            bufferLength: buffer.byteLength,
            base64Length: base64.length,
            mimeType
          });
          
          return { base64, mimeType };
        } catch (error) {
          console.error("Error fetching Cloudinary image:", error);
          throw new Error(`Failed to load Cloudinary image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Extract filename from URL path like /api/files/uploads/filename.jpg
      const urlPath = new URL(filePath).pathname;
      const match = urlPath.match(/\/api\/files\/uploads\/(.+)/);
      if (match) {
        filename = match[1];
      }
    } else if (filePath.includes('/api/files/uploads/')) {
      // Handle relative paths like /api/files/uploads/filename.jpg
      const match = filePath.match(/\/api\/files\/uploads\/(.+)/);
      if (match) {
        filename = match[1];
      }
    } else if (filePath.startsWith('product-')) {
      // Handle bare filenames like product-1234567890-123456789.jpg
      filename = filePath;
    }
    
    if (filename) {
      const localPath = `/tmp/uploads/${filename}`;
      
      console.log("Reading local file:", localPath);
      
      // Import fs/promises and path
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        // Check if file exists
        await fs.access(localPath);
        
        // Read file and determine MIME type
        const buffer = await fs.readFile(localPath);
        const ext = path.extname(filename).toLowerCase();
        
        const mimeTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        const mimeType = mimeTypes[ext] || 'image/jpeg';
        const base64 = buffer.toString('base64');
        
        console.log("Image loaded from local file:", {
          filePath: localPath,
          bufferLength: buffer.length,
          base64Length: base64.length,
          mimeType,
          fileName: filename
        });
        
        return { base64, mimeType };
      } catch (fileError) {
        console.error("Error reading local file:", fileError);
        throw new Error(`File not found: ${localPath}`);
      }
    }
    
    // Fallback: try Object Storage for backwards compatibility
    try {
      let file = await objectStorage.searchPublicObject(filePath);
      
      if (!file) {
        console.log("File not found in public search, trying direct object path");
        file = await objectStorage.getObjectFile(filePath);
      }
      
      const [metadata] = await file.getMetadata();
      const mimeType = metadata.contentType || "image/jpeg";
      
      const buffer = await objectStorage.getFileBuffer(file);
      const base64 = buffer.toString('base64');
      
      console.log("Image loaded from Object Storage:", {
        bufferLength: buffer.length,
        base64Length: base64.length,
        mimeType,
        fileName: metadata.name
      });
      
      return { base64, mimeType };
    } catch (objectStorageError) {
      console.error("Failed to load from both local and Object Storage:", objectStorageError);
      throw new Error(`Could not load image from: ${filePath}`);
    }
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

// Image Generation using Gemini 2.5 Flash Image with structured output
export async function generateImageWithGemini(
  productImagePath: string,
  sceneImagePath: string,
  enhancedPrompt: string
): Promise<{base64: string; mimeType: string}> {
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

    // Search for the image in the response with multiple format support
    for (const part of parts) {
      // Check for inlineData format (most common)
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        const imageBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        
        console.log("Gemini image generated successfully (inlineData):", {
          base64Length: imageBase64.length,
          mimeType,
          responseStructure: 'inlineData'
        });
        
        return { base64: imageBase64, mimeType };
      }
      
      // Check for fileData format (alternative format)
      if (part.fileData && part.fileData.mimeType?.startsWith('image/')) {
        const fileUri = part.fileData.fileUri;
        const mimeType = part.fileData.mimeType;
        
        console.log("Gemini fileData detected - fetching remote URI:", {
          fileUri,
          mimeType,
          responseStructure: 'fileData'
        });
        
        if (fileUri) {
          try {
            // Fetch the remote file URI to get actual image bytes
            const response = await fetch(fileUri);
            if (!response.ok) {
              throw new Error(`Failed to fetch file from URI: ${response.status}`);
            }
            
            // Get the image bytes and convert to base64
            const imageBuffer = await response.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');
            
            // Use MIME type from headers if available, fallback to part.fileData.mimeType
            const actualMimeType = response.headers.get('content-type') || mimeType;
            
            console.log("Gemini image fetched successfully (fileData):", {
              base64Length: imageBase64.length,
              mimeType: actualMimeType,
              originalUri: fileUri,
              responseStructure: 'fileData'
            });
            
            return { base64: imageBase64, mimeType: actualMimeType };
          } catch (fetchError) {
            console.error("Failed to fetch fileData URI:", fetchError);
            // Continue to next part instead of failing entirely
          }
        }
      }
    }

    // Enhanced error logging with exhaustive response structure analysis
    console.error('Gemini response structure analysis:', JSON.stringify({
      candidatesCount: candidates.length,
      partsCount: parts.length,
      partTypes: parts.map(p => Object.keys(p)),
      fullParts: parts.slice(0, 2), // Log first 2 parts for debugging
      detailedPartAnalysis: parts.map((part, index) => ({
        partIndex: index,
        keys: Object.keys(part),
        hasInlineData: !!part.inlineData,
        hasFileData: !!part.fileData,
        inlineDataMimeType: part.inlineData?.mimeType,
        fileDataMimeType: part.fileData?.mimeType,
        textContent: part.text?.substring(0, 100)
      }))
    }, null, 2));

    // Add scene preservation validation warning
    console.warn('Scene preservation may be insufficient - no image generated');
    
    throw new Error('No image data found in Gemini response - check response structure analysis above');
    
  } catch (error) {
    console.error("Gemini Image Generation error:", error);
    throw new Error(`Failed to generate image with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Enhanced Video Prompt Generation for Cinematic AI Video Generation
export async function enhanceVideoPromptWithGemini(
  productImagePath: string,
  sceneMediaPath: string, // Could be image or video path
  userDescription: string,
  options: {
    duration?: number; // 5 or 10 seconds
    isSceneVideo?: boolean; // true if sceneMediaPath is a video
  } = {}
): Promise<{
  enhancedPrompt: string;
  cameraMovement?: string;
  shotList?: string;
}> {
  try {
    console.log("Gemini Video Prompt Enhancement:", {
      productImagePath,
      sceneMediaPath,
      userDescription: userDescription.substring(0, 50),
      duration: options.duration || 5,
      isSceneVideo: options.isSceneVideo || false,
      apiKeyExists: !!process.env.GEMINI_API_KEY
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Load product image (always required)
    console.log("Loading media for video prompt generation...");
    const productImageData = await getImageDataFromStorage(productImagePath);
    
    // For scene, we only process images for now (video analysis comes later)
    const sceneImageData = options.isSceneVideo ? null : await getImageDataFromStorage(sceneMediaPath);

    const durationSeconds = options.duration || 5;
    const isShortVideo = durationSeconds <= 5;

    const prompt = `
You are a PROFESSIONAL CINEMATOGRAPHER and VIDEO PRODUCTION EXPERT creating detailed instructions for AI video generation.

ANALYZE the reference images:
1. PRODUCT IMAGE: Identify the exact product, its design, materials, proportions, and key features
2. SCENE ${options.isSceneVideo ? 'VIDEO' : 'IMAGE'}: Understand the environment, lighting mood, existing elements, and spatial layout

TASK: Create a CINEMATIC VIDEO PRODUCTION BRIEF for ${durationSeconds}-second professional video generation with the following structure:

═══ SHOT COMPOSITION & FRAMING ═══
- Opening frame positioning and product placement
- Camera angle progression (wide → medium → close-up OR artistic sequence)
- Rule of thirds and visual balance considerations
- Depth of field and focus transitions

═══ CAMERA MOVEMENT & DYNAMICS ═══ 
- Smooth camera movements: ${isShortVideo ? 'subtle pans, gentle zooms, or static with focus pulls' : 'complex movements like dolly shots, orbits, push-ins, or reveal shots'}
- Movement speed: ${isShortVideo ? 'slow and elegant' : 'varied pacing with dynamic transitions'}
- Stabilization: professional gimbal-smooth motion
- Keyframe timing: specify when movements occur (e.g., "0-2s: wide establishing, 2-4s: slow push-in, 4-5s: detail close-up")

═══ LIGHTING & CINEMATOGRAPHY ═══
- Match existing scene lighting and enhance it cinematically
- Shadow behavior and light interaction with product
- Color temperature consistency and mood lighting
- Highlight product materials and textures with cinematic lighting

═══ VIDEO PRODUCTION TECHNIQUE ═══
- ${isShortVideo ? 'Single smooth motion or elegant reveal' : 'Multi-beat sequence with rhythm and pacing'}
- Seamless integration of product into scene environment
- Professional color grading and contrast
- High-end commercial video aesthetics

═══ TECHNICAL SPECIFICATIONS ═══
- Resolution: 4K quality with sharp details
- Frame rate: smooth 24fps cinematic look
- Aspect ratio: maintain scene proportions
- No jump cuts - only smooth continuous motion

USER REQUEST CONTEXT: "${userDescription}"

Generate a SINGLE COMPREHENSIVE VIDEO PROMPT that includes:
1. Scene setup and product integration commands
2. Specific camera movement instructions with timing
3. Lighting and visual enhancement requirements
4. Professional video production techniques

Focus on creating ${isShortVideo ? 'a single elegant camera move that showcases the product beautifully' : 'a dynamic sequence with multiple camera movements and professional pacing'}.

Write in COMMAND STYLE for AI video generation, using action verbs like "Begin with", "Move camera", "Transition to", "Focus on", "Highlight", "End with".
`;

    const contentParts = [];
    
    // Add product image (always included)
    contentParts.push({
      inlineData: {
        data: productImageData.base64,
        mimeType: productImageData.mimeType
      }
    });

    // Add scene image if available (skip if scene is video for now)
    if (sceneImageData) {
      contentParts.push({
        inlineData: {
          data: sceneImageData.base64,
          mimeType: sceneImageData.mimeType
        }
      });
    }

    // Add prompt text last
    contentParts.push(prompt);

    const result = await model.generateContent(contentParts);
    const response = await result.response;
    const enhancedPrompt = response.text();
    
    // Extract camera movement suggestions (basic parsing)
    const cameraMovementMatch = enhancedPrompt.match(/camera[^.]*?(pan|zoom|dolly|orbit|push|pull|tilt|track)[^.]*\./i);
    const cameraMovement = cameraMovementMatch ? cameraMovementMatch[0] : undefined;
    
    // Extract shot progression (basic parsing)  
    const shotListMatch = enhancedPrompt.match(/(\d+-\d+s:|wide|medium|close|establishing|detail)[^.]*\./gi);
    const shotList = shotListMatch ? shotListMatch.join(' → ') : undefined;
    
    console.log("Enhanced video prompt generated:", {
      promptLength: enhancedPrompt.length,
      duration: durationSeconds,
      cameraMovement: cameraMovement?.substring(0, 100),
      shotList: shotList?.substring(0, 100)
    });
    
    return {
      enhancedPrompt,
      cameraMovement,
      shotList
    };
    
  } catch (error) {
    console.error("Gemini Video Prompt Enhancement error:", error);
    
    // Fallback cinematic prompt if Gemini fails
    const duration = options.duration || 5;
    const fallbackPrompt = `Professional cinematic ${duration}-second video showcasing the product in the scene. Begin with an establishing shot, then smoothly ${duration <= 5 ? 'zoom in to highlight product details' : 'move around the product with dynamic camera work'}, ending with a hero shot. Use smooth camera movements, professional lighting, and commercial video quality. ${userDescription}`;
    
    return {
      enhancedPrompt: fallbackPrompt,
      cameraMovement: duration <= 5 ? "Smooth zoom-in focus" : "Dynamic orbital movement",
      shotList: duration <= 5 ? "Wide → Close-up" : "Wide → Medium → Close-up → Hero"
    };
  }
}