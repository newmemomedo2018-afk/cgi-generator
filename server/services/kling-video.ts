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
  videoTaskId: string, 
  prompt: string, 
  klingApiKey: string,
  // For recovery system - save audio task ID immediately
  projectId?: string,
  storage?: any
): Promise<string> {
  console.log("Adding audio to video via PiAPI Kling Sound...", {
    videoTaskId,
    prompt: prompt.substring(0, 50) + "..."
  });

  // Create audio generation request using the correct origin_task_id method
  const audioRequestPayload = {
    model: "kling",
    task_type: "sound",
    input: {
      origin_task_id: videoTaskId // Use the video generation task ID, not video URL
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
  
  // Handle different response formats from Kling AI (same as video generation)
  const taskData = result.data || result; // New format has data wrapper
  const taskId = taskData.task_id;
  
  console.log("Kling Sound request submitted:", {
    taskId: taskId,
    status: taskData.status,
    fullResponse: result,
    responseFormat: result.data ? 'wrapped' : 'direct'
  });

  if (!taskId) {
    console.error("❌ CRITICAL: Kling Sound API didn't return a task_id!", {
      response: result,
      data: result.data,
      hasTaskId: !!taskId,
      responseKeys: Object.keys(result),
      dataKeys: result.data ? Object.keys(result.data) : null
    });
    throw new Error(`Kling Sound API error: No task_id returned. Response: ${JSON.stringify(result)}`);
  }

  // 🚨 RECOVERY SYSTEM: Save audio task ID immediately for failed project recovery
  if (projectId && storage) {
    try {
      await storage.updateProject(projectId, { 
        klingSoundTaskId: taskId
      });
      console.log("✅ RECOVERY: Saved Kling audio task ID for recovery:", {
        projectId,
        soundTaskId: taskId,
        saved: "immediately"
      });
    } catch (saveError) {
      console.error("⚠️ WARNING: Failed to save audio task ID for recovery (continuing anyway):", {
        projectId,
        soundTaskId: taskId,
        error: saveError instanceof Error ? saveError.message : "Unknown error"
      });
      // Don't throw - continue with audio generation even if save fails
    }
  } else {
    console.log("ℹ️ RECOVERY: No project/storage provided - audio task ID not saved for recovery:", {
      hasProjectId: !!projectId,
      hasStorage: !!storage,
      soundTaskId: taskId
    });
  }

  // Poll for completion
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
      
      // If we get persistent errors and have tried enough times, give up
      if (attempts > 5 && (statusResponse.status === 400 || statusResponse.status === 404)) {
        console.error(`Persistent Sound API errors (${statusResponse.status}) after ${attempts} attempts - giving up`);
        throw new Error(`Kling Sound status check failed: HTTP ${statusResponse.status} after ${attempts} attempts`);
      }
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
        originalVideoTaskId: videoTaskId,
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
  includeAudio: boolean = false,
  negativePrompt: string = "",
  // For recovery system - save task ID immediately
  projectId?: string,
  storage?: any
): Promise<KlingVideoResult> {
  console.log("Starting Kling AI video generation...", {
    imageUrl,
    prompt: prompt.substring(0, 100) + "...",
    duration: durationSeconds
  });

  try {
    // Use direct image URL instead of downloading and processing
    console.log("🌐 Using direct image URL for Kling API:", imageUrl);
    
    // Basic URL validation
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }
    
    console.log("✅ Direct URL approach - skipping image processing:", {
      imageUrl,
      urlLength: imageUrl.length,
      approach: "direct_url",
      payloadSize: "minimal"
    });

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
        image_url: imageUrl,  // Send direct image URL
        duration: durationSeconds,
        aspect_ratio: "16:9",
        mode: "std", // std or pro
        cfg_scale: 0.5, // 0.1 to 1.0
        negative_prompt: negativePrompt || "deformed, distorted, unnatural proportions, melting, morphing, blurry, low quality"
      }
    };

    // EXPLICIT LOGGING BEFORE PiAPI CALL - USE BYTE-ACCURATE VALIDATION
    const jsonPayload = JSON.stringify(requestPayload);
    const payloadSizeBytes = Buffer.byteLength(jsonPayload, 'utf8');
    console.log("🚀 SENDING REQUEST TO KLING AI VIA PiAPI - USING DIRECT URL METHOD:", {
      model: requestPayload.model,
      task_type: requestPayload.task_type,
      duration: requestPayload.input.duration,
      aspectRatio: requestPayload.input.aspect_ratio,
      imageUrl: imageUrl,
      imageUrlLength: imageUrl.length,
      promptCharacters: prompt.length,
      promptBytes: Buffer.byteLength(prompt, 'utf8'),
      payloadSizeBytes,
      payloadSizeKB: Math.round(payloadSizeBytes / 1024),
      METHOD: "DIRECT_URL_NO_BASE64",
      apiEndpoint: 'https://api.piapi.ai/api/v1/task'
    });
    
    // ✅ EXPLICIT VALIDATION: Make sure we're sending URL not base64
    if (requestPayload.input.image_url.startsWith('/9j/') || requestPayload.input.image_url.length > 1000) {
      throw new Error(`🚨 CRITICAL: Still sending base64 instead of URL! Length: ${requestPayload.input.image_url.length}`);
    }
    
    console.log("✅ VALIDATION PASSED: Sending direct URL to Kling API:", requestPayload.input.image_url);

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
    
    // Handle different response formats from Kling AI
    const taskData = result.data || result; // New format has data wrapper
    const taskId = taskData.task_id;
    
    console.log("Kling AI request submitted successfully:", {
      taskId: taskId,
      status: taskData.status,
      fullResponse: result,
      responseFormat: result.data ? 'wrapped' : 'direct'
    });

    // Validate that we got a task ID
    if (!taskId) {
      console.error("❌ CRITICAL: Kling AI didn't return a task_id!", {
        response: result,
        data: result.data,
        hasTaskId: !!taskId,
        responseKeys: Object.keys(result),
        dataKeys: result.data ? Object.keys(result.data) : null
      });
      throw new Error(`Kling AI API error: No task_id returned. Response: ${JSON.stringify(result)}`);
    }

    // 🚨 RECOVERY SYSTEM: Save task ID immediately for failed project recovery
    if (projectId && storage) {
      try {
        await storage.updateProject(projectId, { 
          klingVideoTaskId: taskId
          // Don't overwrite includeAudio - keep original user choice
        });
        console.log("✅ RECOVERY: Saved Kling video task ID for recovery:", {
          projectId,
          taskId,
          includeAudio,
          saved: "immediately"
        });
      } catch (saveError) {
        console.error("⚠️ WARNING: Failed to save task ID for recovery (continuing anyway):", {
          projectId,
          taskId,
          error: saveError instanceof Error ? saveError.message : "Unknown error"
        });
        // Don't throw - continue with video generation even if save fails
      }
    } else {
      console.log("ℹ️ RECOVERY: No project/storage provided - task ID not saved for recovery:", {
        hasProjectId: !!projectId,
        hasStorage: !!storage,
        taskId
      });
    }

    // Poll for completion
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
        const errorText = await statusResponse.text();
        console.error("Failed to check Kling AI status:", {
          status: statusResponse.status,
          statusText: statusResponse.statusText,
          error: errorText,
          taskId: taskId,
          attempt: attempts,
          maxAttempts: maxAttempts
        });
        
        // Parse the error response to see if it contains useful information
        let parsedError = null;
        try {
          parsedError = JSON.parse(errorText);
          console.log("Parsed Kling error response:", parsedError);
        } catch (e) {
          console.log("Could not parse error response as JSON:", errorText);
        }
        
        // If we get HTTP 400 "failed to find task", it might be a temporary issue
        // Try a few more times before giving up, but with longer intervals
        if (statusResponse.status === 400 && errorText.includes("failed to find task")) {
          console.warn(`Task not found (attempt ${attempts}/${maxAttempts}) - this might be temporary, retrying with longer interval...`);
          
          // Wait longer before retrying for 400 errors
          if (attempts <= maxAttempts - 5) {
            await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds extra
            continue;
          }
        }
        
        // If we get persistent errors and have tried enough times, give up
        if (attempts > 10 && (statusResponse.status === 400 || statusResponse.status === 404)) {
          console.error(`Persistent API errors (${statusResponse.status}) after ${attempts} attempts - giving up`);
          throw new Error(`Kling AI status check failed: HTTP ${statusResponse.status} after ${attempts} attempts. Error: ${errorText}`);
        }
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
          console.log("🔊 AUDIO INTEGRATION REQUESTED:", {
            originalVideoUrl: videoUrl,
            prompt: prompt.substring(0, 100) + "...",
            includeAudio: includeAudio
          });
          try {
            finalVideoUrl = await addAudioToVideo(taskId, prompt, klingApiKey, projectId, storage);
            console.log("🎵 AUDIO ADDED SUCCESSFULLY:", {
              originalVideoUrl: videoUrl,
              originalVideoTaskId: taskId,
              videoWithAudioUrl: finalVideoUrl,
              audioIntegrationSuccess: true
            });
          } catch (audioError) {
            const errorMessage = audioError instanceof Error ? audioError.message : String(audioError);
            const errorStack = audioError instanceof Error ? audioError.stack : undefined;
            console.error("❌ AUDIO INTEGRATION FAILED:", {
              originalVideoUrl: videoUrl,
              audioError: errorMessage,
              audioErrorStack: errorStack,
              fallbackToOriginalVideo: true
            });
            // Continue with original video if audio fails
          }
        } else {
          console.log("🔇 NO AUDIO REQUESTED - using original video only");
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