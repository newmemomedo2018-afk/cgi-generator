interface PiAPIVideoResult {
  url: string;
  duration: number;
}

export async function generateVideoWithPiAPI(imageUrl: string, durationSeconds?: number): Promise<PiAPIVideoResult> {
  // Default to 5 seconds if no duration provided
  const duration = durationSeconds || 5;
  try {
    // Create video generation job using new API structure
    const response = await fetch("https://api.piapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "x-api-key": process.env.PIAPI_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling",
        task_type: "video_generation",
        input: {
          image_url: imageUrl,
          prompt: "Professional product showcase with natural movement and cinematic quality",
          duration: duration,
          aspect_ratio: "16:9",
          mode: "std",
          version: "1.6",
          cfg_scale: "0.5"
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("PiAPI error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`PiAPI error: ${response.status} - ${errorText}`);
    }

    const job = await response.json();
    const taskId = job.data.task_id;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: {
          "x-api-key": process.env.PIAPI_API_KEY || "",
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`PiAPI status check error: ${statusResponse.status}`);
      }

      const result = await statusResponse.json();
      const taskData = result.data;
      
      if (taskData.status === "completed" && taskData.output && taskData.output.works && taskData.output.works.length > 0) {
        return {
          url: taskData.output.works[0].video.resource,
          duration,
        };
      }
      
      if (taskData.status === "failed") {
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
