/**
 * Kling AI Video Generation Service
 * Generates videos from images using Kling AI via PiAPI
 */

interface KlingVideoResult {
  url: string;
  duration: number;
}

/**
 * Add audio to existing video using PiAPI Kling Sound API
 */
async function addAudioToVideo(
  videoUrl: string, 
  prompt: string, 
  klingApiKey: string
): Promise<string> {
  console.log("Adding audio to video via PiAPI Kling Sound...", {
    videoUrl,
    prompt: prompt.substring(0, 50) + "..."
  });

  // Create audio generation request for video
  const audioRequestPayload = {
    model: "kling",
    task_type: "kling_sound",
    input: {
      video_url: videoUrl,
      prompt: `Add atmospheric background music and realistic sound effects that match the scene. ${prompt.substring(0, 100)}`,
      duration: "auto" // Automatically match video duration
    }
  };

  // Make request to PiAPI v1 endpoint
  const response = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'X-API-Key': klingApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(audioRequestPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Kling Sound API error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Kling Sound API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("Kling Sound request submitted:", {
    taskId: result.task_id,
    status: result.status
  });

  // Poll for completion
  const taskId = result.task_id;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max for audio processing

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    attempts++;

    console.log(`Checking Kling Sound status, attempt ${attempts}/${maxAttempts}...`);

    // Check task status using PiAPI v1 endpoint
    const statusResponse = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
      headers: {
        'X-API-Key': klingApiKey,
      }
    });

    if (!statusResponse.ok) {
      console.error("Failed to check Kling Sound status:", statusResponse.status);
      continue;
    }

    const statusResult = await statusResponse.json();
    console.log("Kling Sound status update:", {
      status: statusResult.status,
      progress: statusResult.progress || 'N/A'
    });

    if (statusResult.status === 'completed' || statusResult.status === 'success') {
      console.log("Kling Sound generation completed!");
      
      // Get the video with audio URL from PiAPI v1 format
      const videoWithAudioUrl = statusResult.output?.video_url || 
                               statusResult.output?.works?.[0]?.video?.resource_without_watermark ||
                               statusResult.output?.works?.[0]?.video?.resource;
      
      if (!videoWithAudioUrl) {
        console.error("No video URL found in audio completion result:", statusResult);
        throw new Error("Video with audio URL not found in Kling Sound response");
      }

      console.log("Audio added to video successfully:", {
        originalVideoUrl: videoUrl,
        videoWithAudioUrl,
        attempts
      });

      return videoWithAudioUrl;
    }

    if (statusResult.status === 'failed' || statusResult.status === 'error') {
      console.error("Kling Sound generation failed:", statusResult);
      throw new Error(`Kling Sound generation failed: ${statusResult.error || 'Unknown error'}`);
    }

    // Continue polling if still processing
    if (statusResult.status === 'processing' || statusResult.status === 'pending' || statusResult.status === 'running') {
      console.log(`Kling Sound still processing... (${statusResult.progress || 'N/A'})`);
      continue;
    }
  }

  // Timeout reached
  throw new Error(`Kling Sound generation timed out after ${maxAttempts * 10} seconds`);
}

export async function generateVideoWithKling(
  imageUrl: string, 
  prompt: string, 
  durationSeconds: number = 10,
  includeAudio: boolean = false
): Promise<KlingVideoResult> {
  console.log("Starting Kling AI video generation...", {
    imageUrl,
    prompt: prompt.substring(0, 100) + "...",
    duration: durationSeconds
  });

  try {
    // Download the image to process
    console.log("Downloading image from URL:", imageUrl);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    let imageBuffer = await imageResponse.arrayBuffer();
    
    console.log("Image downloaded successfully, size:", imageBuffer.byteLength);
    
    // Check image dimensions first to ensure minimum 300px requirement
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(Buffer.from(imageBuffer)).metadata();
    const minDimension = Math.min(metadata.width || 0, metadata.height || 0);
    
    console.log("📐 Image dimensions check:", {
      width: metadata.width,
      height: metadata.height,
      minDimension,
      meetsKlingRequirement: minDimension >= 300
    });
    
    // If dimensions are too small, normalize to minimum safe size
    if (minDimension < 300) {
      console.log("🔧 Normalizing image to minimum safe dimensions...");
      
      const normalizedBuffer = await sharp(Buffer.from(imageBuffer))
        .resize(320, 320, { 
          fit: 'contain',  // Maintain aspect ratio with padding
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
          withoutEnlargement: false  // Allow upscaling
        })
        .png({ quality: 85, compressionLevel: 6, adaptiveFiltering: false })
        .toBuffer();
      
      console.log("✅ Image normalized:", {
        originalSize: imageBuffer.byteLength,
        normalizedSize: normalizedBuffer.byteLength,
        guaranteedMinDimension: 320
      });
      
      imageBuffer = normalizedBuffer;
    }
    
    // Check if image is too large for Kling (limit appears to be around 300KB)
    if (imageBuffer.byteLength > 300000) { // 300KB limit
      console.log("⚠️ Image too large for Kling API:", {
        size: imageBuffer.byteLength,
        limit: 300000,
        sizeInKB: Math.round(imageBuffer.byteLength / 1024)
      });
      
      // Compress image using Sharp
      console.log("🔄 Compressing image with Sharp...");
      const sharp = (await import('sharp')).default;
      
      // Compress aggressively for Kling API size limits
      const compressedBuffer = await sharp(Buffer.from(imageBuffer))
        .png({ 
          quality: 60,         // Lower quality for smaller size
          compressionLevel: 9, // Maximum PNG compression
          adaptiveFiltering: false  // Disable for smaller files
        })
        .resize(512, 512, {   // Smaller size for Kling API limits
          fit: 'contain',  // Maintain aspect ratio with padding
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
          withoutEnlargement: false  // Allow upscaling if needed
        })
        .toBuffer();
      
      console.log("✅ Image compressed successfully:", {
        originalSize: imageBuffer.byteLength,
        compressedSize: compressedBuffer.byteLength,
        originalKB: Math.round(imageBuffer.byteLength / 1024),
        compressedKB: Math.round(compressedBuffer.byteLength / 1024),
        compressionRatio: `${Math.round((1 - compressedBuffer.byteLength / imageBuffer.byteLength) * 100)}%`
      });
      
      // Use compressed buffer
      imageBuffer = compressedBuffer;
    }
    
    let imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    console.log("📊 Payload size analysis:", {
      imageBinarySize: imageBuffer.byteLength,
      base64Size: imageBase64.length,
      base64SizeKB: Math.round(imageBase64.length / 1024),
      promptLength: prompt.length
    });

    // Check total payload size (base64 is roughly 33% larger than binary)
    const estimatedPayloadSize = imageBase64.length + prompt.length + 500; // 500 for JSON overhead
    const maxAllowedSize = 150000; // 150KB max payload size
    
    if (estimatedPayloadSize > maxAllowedSize) {
      console.log("🔴 Payload still too large, compressing further...", {
        estimatedSize: estimatedPayloadSize,
        limit: maxAllowedSize,
        exceededBy: estimatedPayloadSize - maxAllowedSize
      });
      
      // Ultra aggressive compression for very strict limits
      const sharp = (await import('sharp')).default;
      const ultraCompressed = await sharp(Buffer.from(imageBuffer))
        .png({ 
          quality: 40,         // Very low quality
          compressionLevel: 9, // Maximum PNG compression
          adaptiveFiltering: false  // Disable for smaller files
        })
        .resize(320, 320, {   // Minimum safe size for Kling (300px+ required)
          fit: 'contain',  // Maintain aspect ratio with padding
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background  
          withoutEnlargement: false  // Allow upscaling to meet minimum
        })
        .toBuffer();
      
      imageBuffer = ultraCompressed;
      const newBase64 = Buffer.from(imageBuffer).toString('base64');
      
      console.log("🟡 Ultra compression applied:", {
        newSize: imageBuffer.byteLength,
        newBase64Size: newBase64.length,
        newBase64KB: Math.round(newBase64.length / 1024)
      });
      
      // Update base64 string
      imageBase64 = newBase64;
    }

    // Prepare Kling AI request via PiAPI
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey) {
      throw new Error("KLING_API_KEY environment variable is required");
    }

    // Create Kling AI image-to-video request (PiAPI v1 format)
    const requestPayload = {
      model: "kling",
      task_type: "video_generation",
      input: {
        prompt: prompt,
        image_url: `data:image/png;base64,${imageBase64}`,
        duration: durationSeconds,
        aspect_ratio: "16:9",
        mode: "std", // std or pro
        cfg_scale: 0.5, // 0.1 to 1.0
        negative_prompt: ""
      }
    };

    console.log("Sending request to Kling AI...", {
      model: requestPayload.model,
      task_type: requestPayload.task_type,
      duration: requestPayload.input.duration,
      aspectRatio: requestPayload.input.aspect_ratio,
      promptLength: prompt.length
    });

    // Make request to PiAPI v1 endpoint
    const response = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: {
        'X-API-Key': klingApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kling AI API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Kling AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Kling AI request submitted successfully:", {
      taskId: result.task_id,
      status: result.status
    });

    // Poll for completion
    const taskId = result.task_id;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10s intervals)
    
    console.log("Polling for Kling AI completion...", { taskId });

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;

      console.log(`Checking Kling AI status, attempt ${attempts}/${maxAttempts}...`);

      // Check task status using PiAPI v1 endpoint
      const statusResponse = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: {
          'X-API-Key': klingApiKey,
        }
      });

      if (!statusResponse.ok) {
        console.error("Failed to check Kling AI status:", statusResponse.status);
        continue;
      }

      const statusResult = await statusResponse.json();
      console.log("Kling AI status update:", {
        status: statusResult.status,
        progress: statusResult.progress || 'N/A'
      });

      if (statusResult.status === 'completed' || statusResult.status === 'success') {
        console.log("Kling AI video generation completed!");
        
        // PiAPI v1 format: get video URL from multiple possible locations
        const videoUrl = statusResult.output?.video_url || 
                        statusResult.output?.works?.[0]?.video?.resource_without_watermark ||
                        statusResult.output?.works?.[0]?.video?.resource;
        
        if (!videoUrl) {
          console.error("No video URL found in completed result:", statusResult);
          throw new Error("Video URL not found in Kling AI response");
        }

        console.log("Kling AI video generation successful:", {
          videoUrl,
          duration: durationSeconds,
          attempts
        });

        // Add audio if requested
        let finalVideoUrl = videoUrl;
        if (includeAudio) {
          console.log("Adding audio to video...");
          try {
            finalVideoUrl = await addAudioToVideo(videoUrl, prompt, klingApiKey);
            console.log("Audio added successfully to video:", finalVideoUrl);
          } catch (audioError) {
            console.error("Failed to add audio, using original video:", audioError);
            // Continue with original video if audio fails
          }
        }

        return {
          url: finalVideoUrl,
          duration: durationSeconds
        };
      }

      if (statusResult.status === 'failed' || statusResult.status === 'error') {
        console.error("Kling AI generation failed:", statusResult);
        throw new Error(`Kling AI generation failed: ${statusResult.error || 'Unknown error'}`);
      }

      // Continue polling if still processing
      if (statusResult.status === 'processing' || statusResult.status === 'pending' || statusResult.status === 'running') {
        console.log(`Kling AI still processing... (${statusResult.progress || 'N/A'})`);
        continue;
      }
    }

    // Timeout reached
    throw new Error(`Kling AI video generation timed out after ${maxAttempts * 10} seconds`);

  } catch (error) {
    console.error("Kling AI video generation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Re-throw with more context
    throw new Error(`Kling AI video generation failed: ${errorMessage}`);
  }
}