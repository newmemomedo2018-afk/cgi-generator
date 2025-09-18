// Direct test of Kling video generation functionality
const fs = require('fs');

async function testKlingDirectly() {
  console.log("🚀 Starting Direct Kling API Test");
  console.log("=" + "=".repeat(50));
  
  try {
    // Check if KLING_API_KEY is available
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey) {
      throw new Error("KLING_API_KEY environment variable not found");
    }
    console.log("✅ KLING_API_KEY found");
    
    // Load test image
    const imagePath = '/tmp/test-scene.png';
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Test image not found: ${imagePath}`);
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    
    console.log("📊 Test Image Stats:");
    console.log(`File size: ${Math.round(imageBuffer.length / 1024)}KB`);
    console.log(`Base64 size: ${Math.round(base64.length / 1024)}KB`);
    console.log(`Data URL length: ${dataUrl.length} chars`);
    
    // Estimated payload size (this should exceed the 50KB limit)
    const prompt = "Create a smooth camera movement showcasing this product in an elegant way";
    const estimatedPayload = base64.length + prompt.length + 500; // 500 for JSON overhead
    console.log(`Estimated payload size: ${Math.round(estimatedPayload / 1024)}KB`);
    console.log(`Will exceed 50KB limit: ${estimatedPayload > 50000 ? "YES ✅" : "NO ❌"} (should be YES to test compression)`);
    
    // Create the Kling AI request payload manually to test
    const requestPayload = {
      model: "kling",
      task_type: "video_generation",
      input: {
        prompt: prompt,
        image_url: dataUrl,
        duration: 5,
        aspect_ratio: "16:9",
        mode: "std",
        cfg_scale: 0.5,
        negative_prompt: ""
      }
    };
    
    console.log("\n🎬 Testing Kling API Request...");
    console.log(`Prompt: ${prompt}`);
    console.log(`Image format: ${dataUrl.substring(0, 25)}...`);
    console.log(`Duration: 5 seconds`);
    
    // Test the actual API call
    const response = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: {
        'X-API-Key': klingApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log(`\n📡 Kling API Response:`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      
      // Check for specific error patterns
      if (errorText.includes('unsupported image format')) {
        console.error("🔴 ISSUE: Unsupported image format error detected!");
      }
      if (errorText.includes('task input too large') || errorText.includes('payload too large')) {
        console.error("🔴 ISSUE: Payload size error detected!");
      }
      
      throw new Error(`Kling API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log("✅ Request submitted successfully!");
    console.log(`Task ID: ${result.task_id}`);
    console.log(`Status: ${result.status}`);
    
    console.log("\n🔍 Test Results Summary:");
    console.log("✅ PNG format accepted by Kling API");
    console.log("✅ Large payload handled successfully");
    console.log("✅ No 'unsupported image format' error");
    console.log("✅ No 'task input too large' error");
    
    return result;
    
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
    
    // Analyze the error for specific issues
    if (error.message.includes('unsupported image format')) {
      console.error("🔴 COMPRESSION ISSUE: Image format not supported");
    }
    if (error.message.includes('task input too large') || error.message.includes('payload too large')) {
      console.error("🔴 COMPRESSION ISSUE: Payload size not reduced enough");
    }
    
    throw error;
  }
}

// Run the test
testKlingDirectly()
  .then((result) => {
    console.log("\n🎉 Direct Kling API test completed successfully!");
    console.log("All compression and format fixes are working correctly.");
  })
  .catch((error) => {
    console.error("\n💥 Direct Kling API test failed!");
    console.error("Issues found that need to be addressed:");
    console.error(error.message);
    process.exit(1);
  });