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
    video_url: videoUrl,
    prompt: `Add atmospheric background music and realistic sound effects that match the scene. ${prompt.substring(0, 100)}`,
    duration: "auto" // Automatically match video duration
  };

  // Make request to PiAPI Kling Sound endpoint
  const response = await fetch('https://api.piapi.ai/kling/sound', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${klingApiKey}`,
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

    // Check task status
    const statusResponse = await fetch(`https://api.piapi.ai/kling/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${klingApiKey}`,
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
      
      // Get the video with audio URL from multiple possible response formats
      const videoWithAudioUrl = statusResult.output?.video_url || 
                                statusResult.result?.video_url || 
                                statusResult.video_url ||
                                statusResult.output?.result?.video_url;
      
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
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    
    console.log("Image downloaded successfully, size:", imageBuffer.byteLength);

    // Prepare Kling AI request via PiAPI
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey) {
      throw new Error("KLING_API_KEY environment variable is required");
    }

    // Create Kling AI image-to-video request
    const requestPayload = {
      model: "kling-v2.0", // Latest Kling model
      prompt: prompt,
      image: `data:image/jpeg;base64,${imageBase64}`,
      duration: `${durationSeconds}s`,
      aspect_ratio: "16:9",
      mode: "standard", // or "pro" for higher quality
      cfg_scale: 7.0, // Creativity vs adherence balance
      seed: Math.floor(Math.random() * 1000000) // Random seed for variety
    };

    console.log("Sending request to Kling AI...", {
      model: requestPayload.model,
      duration: requestPayload.duration,
      aspectRatio: requestPayload.aspect_ratio,
      promptLength: prompt.length
    });

    // Make request to PiAPI Kling endpoint
    const response = await fetch('https://api.piapi.ai/kling/image2video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${klingApiKey}`,
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

      // Check task status
      const statusResponse = await fetch(`https://api.piapi.ai/kling/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${klingApiKey}`,
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
        
        const videoUrl = statusResult.output?.video_url || statusResult.result?.video_url || statusResult.video_url;
        
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