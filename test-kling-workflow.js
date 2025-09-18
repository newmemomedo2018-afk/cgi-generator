// Test script for Kling video generation workflow
import { generateVideoWithKling } from './server/services/kling-video.js';
import { promises as fs } from 'fs';

async function testKlingWorkflow() {
  console.log("🚀 Starting Kling Video Generation Workflow Test");
  console.log("=" * 50);
  
  try {
    // Test image paths
    const productImagePath = '/tmp/test-product.png';
    const sceneImagePath = '/tmp/test-scene.png';
    
    // Check if test images exist
    console.log("📋 Checking test images...");
    const productExists = await fs.access(productImagePath).then(() => true).catch(() => false);
    const sceneExists = await fs.access(sceneImagePath).then(() => true).catch(() => false);
    
    console.log(`Product image: ${productExists ? '✅' : '❌'} ${productImagePath}`);
    console.log(`Scene image: ${sceneExists ? '✅' : '❌'} ${sceneImagePath}`);
    
    if (!productExists || !sceneExists) {
      throw new Error("Test images not found");
    }
    
    // Get image stats
    const productStats = await fs.stat(productImagePath);
    const sceneStats = await fs.stat(sceneImagePath);
    
    console.log(`📊 Image sizes:`);
    console.log(`Product: ${Math.round(productStats.size / 1024)}KB`);
    console.log(`Scene: ${Math.round(sceneStats.size / 1024)}KB`);
    
    // Create test with scene image (the larger one to test compression)
    const imageBase64 = await fs.readFile(sceneImagePath, 'base64');
    const imageDataUrl = `data:image/png;base64,${imageBase64}`;
    
    console.log("\n🎬 Testing Kling Video Generation with:");
    console.log(`Image size: ${Math.round(sceneStats.size / 1024)}KB`);
    console.log(`Base64 size: ${Math.round(imageBase64.length / 1024)}KB`);
    console.log("Prompt: Test product showcase video");
    console.log("Duration: 5 seconds");
    
    // Test the video generation
    const result = await generateVideoWithKling(
      imageDataUrl,
      "Create a smooth camera movement showcasing this product in an elegant way",
      5,
      false
    );
    
    console.log("\n✅ Video generation completed successfully!");
    console.log(`Video URL: ${result.url}`);
    console.log(`Duration: ${result.duration} seconds`);
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Run the test
testKlingWorkflow().catch(console.error);