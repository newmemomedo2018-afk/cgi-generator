interface PiAPIVideoResult {
  url: string;
  duration: number;
}

export async function generateVideoWithPiAPI(imageUrl: string): Promise<PiAPIVideoResult> {
  try {
    // Create video generation job
    const response = await fetch("https://api.piapi.ai/api/kling/v1/videos/generations", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.PIAPI_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling-1.6",
        image: imageUrl,
        duration: "5",
        aspect_ratio: "16:9",
        prompt: "Professional product showcase with natural movement and cinematic quality",
        quality: "professional",
        camera_movement: "subtle",
      }),
    });

    if (!response.ok) {
      throw new Error(`PiAPI error: ${response.status}`);
    }

    const job = await response.json();
    const jobId = job.id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.piapi.ai/api/kling/v1/videos/generations/${jobId}`, {
        headers: {
          "X-API-Key": process.env.PIAPI_API_KEY || "",
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`PiAPI status check error: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();
      
      if (status.status === "completed" && status.output && status.output.length > 0) {
        return {
          url: status.output[0].url,
          duration: 5,
        };
      }
      
      if (status.status === "failed") {
        throw new Error("Video generation failed");
      }
      
      attempts++;
    }
    
    throw new Error("Video generation timeout");
  } catch (error) {
    console.error("PiAPI error:", error);
    throw new Error("Failed to generate video with PiAPI");
  }
}
