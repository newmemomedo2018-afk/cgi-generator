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
1. REMOVE/REPLACE ONLY the specific existing products in the scene completely
2. INSERT the exact product from the first image 
3. Match lighting, shadows, and perspective perfectly
4. PRESERVE ALL architectural elements (ceiling, walls, floor) unchanged

CRITICAL PRESERVATION RULES:
- PRESERVE THE CEILING 100% unchanged (do not modify ceiling color, texture, height, or any ceiling elements)
- PRESERVE ALL WALLS 100% unchanged (do not modify wall materials, colors, textures, or structural elements)
- PRESERVE THE FLOOR 100% unchanged (do not modify flooring materials, patterns, or colors)
- PRESERVE ALL EXISTING FURNITURE 100% unchanged except for the specific item being replaced

Generate a COMMAND-STYLE prompt like this example:
"Remove ONLY the [existing object] completely from the scene and replace it with the [exact product name] from the reference image. The [product] should appear ultra-realistic in CGI style, [size description], positioned [placement details]. Make sure the lighting and shadows match the [lighting description]. Keep ALL other elements including ceiling, walls, floor, and furniture completely unchanged. The [product] should have [texture/material details], and look [style description]. Render in high resolution with cinematic composition and sharp details."

User Request: ${userDescription}

CRITICAL ARABIC LANGUAGE SUPPORT: The user request might be in Arabic. You MUST understand and interpret Arabic properly:

ARABIC PHRASES AND MEANINGS:
- "أضف ناس منبهرين بالمنتج" / "ضيف ناس منبهرين بالمنتج" = "Add people amazed by the product" → MANDATORY: Include actual human figures (2-4 people) in the scene with visible expressions of amazement, wonder, or admiration while looking at or interacting with the product. Do NOT interpret this metaphorically.
- "أضف أشخاص منبهرين بالمنتج" = "Add people amazed by the product" → MANDATORY: Same as above, include actual human people showing amazement, NOT just visual storytelling
- "لا تضيف أشخاص" / "بدون ناس" / "ما في ناس" = "Don't add people" / "Without people" → Do NOT include any human figures
- "غير المكان" / "بدل المكان" = "Change the location/place" → Modify the scene environment
- "خليه أكبر" / "كبره" / "كبّر" / "زود الحجم" = "Make it bigger" → Increase the product size
- "حسن الإضاءة" / "حسن النور" / "أضئه أحسن" = "Improve the lighting" → Enhance lighting quality
- "زود التفاصيل" / "زِوِّد" / "زوّد" = "Add more details" → Include more detailed elements
- "خليه أوضح" / "وضحه أكثر" = "Make it clearer" → Improve clarity and sharpness
- "أضف ألوان أكثر" / "زود الألوان" = "Add more colors" → Include more vibrant colors
- "خليه يبان أحسن" / "حسّنه" = "Make it look better" → Improve overall appearance
- "أضف ناس يستعملوا المنتج" / "يستخدموا" / "استعمال" / "استخدام" = "Add people using the product" → Show people actively using/interacting with the product
- "خليه في وسط الصورة" / "في المنتصف" / "في الوسط" = "Put it in the center of the image" → Position the product centrally

POSITIONING AND DIRECTION WORDS:
- "يمين" / "على اليمين" = "right" / "on the right" → Position on the right side
- "يسار" / "على اليسار" = "left" / "on the left" → Position on the left side  
- "أمام" / "قدام" = "in front" → Position in the foreground
- "خلف" / "وراء" = "behind" → Position in the background
- "فوق" / "أعلى" = "above" / "top" → Position above or on top
- "تحت" / "أسفل" = "below" / "bottom" → Position below or at bottom
- "قريب" / "أقرب" = "close" / "closer" → Move closer to viewer
- "بعيد" / "أبعد" = "far" / "farther" → Move farther from viewer

QUANTITY AND NUMBER WORDS:
- "شخص واحد" / "واحد بس" = "one person only" → Include exactly 1 person
- "شخصين" / "اثنين" = "two people" → Include exactly 2 people  
- "ثلاثة أشخاص" / "ثلاثة" = "three people" → Include exactly 3 people
- "أربعة" / "أربع أشخاص" = "four people" → Include exactly 4 people
- "خمسة" / "خمس أشخاص" = "five people" → Include exactly 5 people
- "كتير ناس" / "ناس كثيرة" = "many people" → Include 5+ people in background

IMPORTANT INTERPRETATION RULES:
1. CHECK FOR NEGATION FIRST: Words like "لا" / "بدون" / "ما في" mean DO NOT include that element
2. If user mentions "ناس" or "أشخاص" (people) WITHOUT negation, MANDATORY: include actual human figures in the scene - DO NOT interpret this as mood, atmosphere, or visual storytelling
3. If user mentions "منبهر" or "معجب" (amazed/impressed), show people with expressions of wonder, surprise, or admiration
4. If user mentions interaction words like "يستعمل" (using) or "يتفاعل" (interacting), show people actively engaging with the product
5. When adding people, use EXACT quantities if specified (شخصين = exactly 2 people)
6. Use positioning words to place elements precisely (يمين = right side, فوق = above, etc.)
7. Translate the MEANING and INTENT, not just literal words
8. NEVER interpret people requests as "visual storytelling" or "mood" - they mean literal human figures
9. ALWAYS output your response in ENGLISH, even if the input is Arabic

BE SPECIFIC about:
- What SPECIFIC object to REMOVE from the scene (be precise - only that object)
- What EXACT product to INSERT  
- HOW it should look and be positioned
- If user wants PEOPLE added, specify their positioning and emotions (amazed, impressed, interacting with product) - MANDATORY: Include actual human figures, not abstract concepts
- Lighting and shadow matching requirements
- WHAT TO PRESERVE (ceiling, walls, floor, other furniture)

CRITICAL: When user requests people in Arabic ("ناس" / "أشخاص"), you MUST include actual human figures in the scene. Do NOT interpret this as "mood", "atmosphere", "visual storytelling", or "implied presence". Include visible people with clear facial expressions and body language.

Write DIRECT COMMANDS in English for the AI image generator. Use action verbs like "Remove ONLY", "Replace", "Position", "Make sure", "Keep unchanged", "Preserve", "Render", "Add people", "Include human figures".
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
GENERATE A NEW IMAGE by composing these two input images:

INPUT 1 (Product): Extract this exact product/object
INPUT 2 (Scene): Place the product into this environment

COMPOSITION INSTRUCTIONS:
${enhancedPrompt}

CRITICAL IMAGE GENERATION REQUIREMENTS:
- CREATE A NEW PHOTOREALISTIC IMAGE (not text description)
- Extract the product from image 1 and seamlessly place it in scene from image 2
- Preserve scene background 100% exactly (lighting, people, buildings, textures)
- Match lighting, shadows, and perspective perfectly
- Ultra-sharp details, high resolution (1024x1024 minimum)
- Use exact product branding, colors, and shape from first image
- Professional CGI quality with no compositing artifacts
- OUTPUT: Return the generated composite image, not text analysis

GENERATE THE COMPOSITE IMAGE NOW.
`;

    // Send request to Gemini with multi-image input using original working format
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
Create professional ${durationSeconds}-second CGI video instructions.

ANALYZE the images:
1. PRODUCT: Identify key features and design
2. SCENE: Environment, lighting, layout

GENERATE video brief with:

🎬 CAMERA MOVEMENT:
${isShortVideo ? 'Smooth pan/zoom movement' : 'Dynamic camera sequence'}
- Timing: specify 0-${durationSeconds}s progression
- Professional gimbal-smooth motion

🎨 CINEMATOGRAPHY:
- Match scene lighting cinematically  
- Highlight product materials
- Professional color grading

📋 TECHNIQUE:
- Seamless product integration
- High-end commercial aesthetics
- 4K quality, smooth motion

USER REQUEST: "${userDescription}"

CRITICAL ARABIC LANGUAGE SUPPORT: The user request might be in Arabic. You MUST understand and interpret Arabic properly:

ARABIC VIDEO DIRECTION PHRASES:
- "أضف حركة للكاميرا" = "Add camera movement" → Include smooth camera motion
- "زوم على المنتج" = "Zoom on the product" → Focus closer on the product
- "اعرض المنتج من كل الجهات" = "Show the product from all sides" → 360-degree or orbital camera movement
- "خليه يتحرك ببطء" = "Make it move slowly" → Slow, cinematic camera movement
- "أضف حركة سريعة" = "Add fast movement" → Dynamic, energetic camera work
- "اعمل فيديو مثير" = "Make an exciting video" → Dramatic camera movements and transitions
- "خليه يبان أحسن" = "Make it look better" → Enhance visual appeal through camera work
- "لا تحرك الكاميرا كثير" / "بدون حركة سريعة" = "Don't move camera too much" / "Without fast movement" → Use minimal, smooth movements
- "ابدأ من بعيد" = "Start from far" → Begin with wide shot
- "اقرب في النهاية" = "Get close at the end" → End with close-up shot

IMPORTANT VIDEO INTERPRETATION RULES:
1. If user mentions camera-related Arabic words like "كاميرا" (camera) or "تصوير" (filming), focus on camera movements
2. If user mentions speed like "بطء" (slow) or "سريع" (fast), adjust the pacing accordingly
3. If user mentions showing "من كل الجهات" (from all sides), suggest orbital or multi-angle shots
4. Check for negation: "لا" / "بدون" / "ما في" mean avoid that element
5. Translate the EMOTION and ENERGY level, not just literal words
6. ALWAYS output your response in ENGLISH, even if the input is Arabic

Write concise AI video commands using action verbs: "Begin with", "Move camera", "Focus on", "End with".
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

// Enhanced Video Prompt From Generated Image - NEW FUNCTION
export async function enhanceVideoPromptFromGeneratedImage(
  generatedImageData: {base64: string; mimeType: string},
  projectDetails: {
    duration: number; // 5 or 10 seconds
    includeAudio: boolean;
    userDescription: string;
    productName?: string;
  }
): Promise<{
  enhancedVideoPrompt: string;
  audioPrompt?: string;
  cameraMovements: string;
  cinematicDirection: string;
}> {
  try {
    console.log("🎬 Gemini Video Enhancement from Generated Image:", {
      imageSize: generatedImageData.base64.length,
      mimeType: generatedImageData.mimeType,
      duration: projectDetails.duration,
      includeAudio: projectDetails.includeAudio,
      userDescription: projectDetails.userDescription.substring(0, 50) + "..."
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const durationSeconds = projectDetails.duration;
    const isShortVideo = durationSeconds <= 5;

    const prompt = `
🎬 PROFESSIONAL CGI VIDEO DIRECTOR ANALYSIS

ANALYZE this completed CGI image composition and provide EXPERT video production guidance:

📋 PROJECT SPECIFICATIONS:
- Duration: ${durationSeconds} seconds (${isShortVideo ? 'SHORT' : 'MEDIUM'} format)
- Audio Required: ${projectDetails.includeAudio ? 'YES' : 'NO'}
- User Vision: ${projectDetails.userDescription}
- Product Focus: ${projectDetails.productName || 'Main product in scene'}

🎯 YOUR MISSION - Create PROFESSIONAL video production instructions:

CRITICAL ARABIC LANGUAGE SUPPORT: The user vision might be in Arabic. You MUST understand and interpret Arabic properly:

ARABIC VIDEO DIRECTION PHRASES:
- "أضف حركة للكاميرا" = "Add camera movement" → Include smooth camera motion
- "زوم على المنتج" = "Zoom on the product" → Focus closer on the product
- "اعرض المنتج من كل الجهات" = "Show the product from all sides" → 360-degree or orbital camera movement
- "خليه يتحرك ببطء" = "Make it move slowly" → Slow, cinematic camera movement
- "أضف حركة سريعة" = "Add fast movement" → Dynamic, energetic camera work
- "اعمل فيديو مثير" = "Make an exciting video" → Dramatic camera movements and transitions
- "خليه يبان أحسن" = "Make it look better" → Enhance visual appeal through camera work

IMPORTANT VIDEO INTERPRETATION RULES:
1. If user mentions camera-related Arabic words like "كاميرا" (camera) or "تصوير" (filming), focus on camera movements
2. If user mentions speed like "بطء" (slow) or "سريع" (fast), adjust the pacing accordingly
3. If user mentions showing "من كل الجهات" (from all sides), suggest orbital or multi-angle shots
4. Translate the EMOTION and ENERGY level, not just literal words

1. 📹 CAMERA MOVEMENT ANALYSIS:
   - Study the composition, lighting, and spatial relationships
   - Determine the MOST CINEMATIC camera movements for this specific scene
   - Consider: dolly, pan, tilt, zoom, orbit, push-in, pull-out, slider movements
   - Match movement to the ${durationSeconds}-second timeframe
   - INTERPRET user's Arabic request for movement style and energy

2. 🎭 CINEMATIC DIRECTION:
   - Analyze the scene's mood, atmosphere, and visual weight
   - Suggest the most compelling visual narrative flow
   - Define key moments and transitions within ${durationSeconds} seconds
   - Consider product showcase timing and emphasis points
   - ADAPT to user's Arabic vision for video style and energy

${projectDetails.includeAudio ? `
3. 🔊 NATURAL AUDIO DESIGN:
   - Analyze the environment and suggest realistic ambient sounds
   - Consider material-specific sounds (metal, wood, fabric, etc.)
   - Suggest atmospheric audio that enhances the scene's reality
   - Include subtle sound effects that match any suggested movements
` : ''}

OUTPUT REQUIREMENTS:
Create THREE separate sections:

📹 CAMERA_MOVEMENTS:
"[Specific technical directions for camera animation - be precise about timing, speed, and trajectory]"

🎭 CINEMATIC_DIRECTION:
"[Detailed visual narrative and scene progression for the ${durationSeconds}-second video]"

${projectDetails.includeAudio ? `
🔊 AUDIO_PROMPT:
"[Natural, environmental audio description that matches the scene and any movements - be specific about sound types, intensity, and timing]"
` : ''}

CRITICAL GUIDELINES:
- Base ALL suggestions on the actual visual content of this specific image
- Prioritize REALISTIC, achievable movements over complex cinematography
- Ensure ${durationSeconds}-second timing is perfectly structured
- Focus on showcasing the product naturally within the scene
- Maintain the established lighting and mood throughout
- Suggest movements that enhance, not distract from, the composition

Be SPECIFIC and ACTIONABLE - these instructions go directly to AI video generation.
`;

    console.log("🤖 Sending analysis request to Gemini...");

    const result = await model.generateContent([
      {
        inlineData: {
          data: generatedImageData.base64,
          mimeType: generatedImageData.mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini video analysis complete:", {
      responseLength: text.length,
      containsCameraMovements: text.includes('CAMERA_MOVEMENTS'),
      containsCinematicDirection: text.includes('CINEMATIC_DIRECTION'),
      containsAudioPrompt: text.includes('AUDIO_PROMPT')
    });

    // Parse the structured response
    const cameraMovementsMatch = text.match(/CAMERA_MOVEMENTS:\s*"([^"]+)"/);
    const cinematicDirectionMatch = text.match(/CINEMATIC_DIRECTION:\s*"([^"]+)"/);
    const audioPromptMatch = text.match(/AUDIO_PROMPT:\s*"([^"]+)"/);

    const cameraMovements = cameraMovementsMatch ? cameraMovementsMatch[1] : 
      `Smooth ${durationSeconds}-second camera movement showcasing the product with cinematic flow`;
    
    const cinematicDirection = cinematicDirectionMatch ? cinematicDirectionMatch[1] : 
      `Professional ${durationSeconds}-second product showcase with dynamic visual progression`;
    
    const audioPrompt = audioPromptMatch ? audioPromptMatch[1] : undefined;

    // Create the enhanced video prompt for Kling AI
    const enhancedVideoPrompt = `
PROFESSIONAL CGI VIDEO GENERATION:

🎬 CINEMATOGRAPHY:
${cameraMovements}

🎭 VISUAL NARRATIVE:
${cinematicDirection}

⏱️ TIMING: ${durationSeconds} seconds
🎯 FOCUS: Maintain product prominence throughout the sequence
💫 QUALITY: Ultra-realistic CGI with seamless motion and perfect lighting continuity
📐 ASPECT: Professional composition with balanced framing
✨ STYLE: Cinematic, commercial-grade video production

TECHNICAL REQUIREMENTS:
- Smooth, professional camera work
- Consistent lighting and shadows
- Natural product movement within scene
- High-resolution output (1080p minimum)
- Fluid ${durationSeconds}-second duration
- Commercial-quality post-production feel
`;

    console.log("🎬 Video prompt enhancement completed:", {
      enhancedPromptLength: enhancedVideoPrompt.length,
      audioIncluded: !!audioPrompt,
      cameraMovementsLength: cameraMovements.length,
      cinematicDirectionLength: cinematicDirection.length
    });

    return {
      enhancedVideoPrompt,
      audioPrompt,
      cameraMovements,
      cinematicDirection
    };

  } catch (error) {
    console.error("❌ Gemini video enhancement error:", error);
    
    // Provide intelligent fallback based on project details
    const fallbackCameraMovement = projectDetails.duration <= 5 ? 
      "Smooth 5-second product focus with subtle camera push-in and gentle rotation" :
      "Dynamic 10-second sequence with opening wide shot, smooth dolly movement, and close-up product showcase finale";
    
    const fallbackVideoPrompt = `
Professional CGI video: ${fallbackCameraMovement}. 
Ultra-realistic ${projectDetails.duration}-second commercial-quality sequence showcasing the product.
Cinematic lighting, smooth motion, high-resolution output.
${projectDetails.userDescription}
`;

    return {
      enhancedVideoPrompt: fallbackVideoPrompt,
      audioPrompt: projectDetails.includeAudio ? 
        "Natural ambient environmental sounds matching the scene atmosphere with subtle product-related audio effects" : 
        undefined,
      cameraMovements: fallbackCameraMovement,
      cinematicDirection: `Professional ${projectDetails.duration}-second product showcase sequence`
    };
  }
}