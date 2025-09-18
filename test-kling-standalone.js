// Test script للـ Kling API 
// نجربه standalone عشان نشوف المشكلة فين بالظبط

import fs from 'fs';
import path from 'path';

// بيانات الـ test المطلوبة
const KLING_API_KEY = process.env.KLING_API_KEY;
const API_URL = 'https://api.piapi.ai/api/v1/task';

async function createSimplePNG() {
    console.log('🎨 Creating simple PNG test image...');
    
    // Simple PNG (1x1 pixel red)
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x01, 0x40, 0x00, 0x00, 0x01, 0x40, // 320x320 dimensions 
        0x08, 0x02, 0x00, 0x00, 0x00, 0x91, 0x5D, 0x1D,
        0xDB, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x01,
        0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE5,
        0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);
    
    const base64 = pngData.toString('base64');
    console.log(`✅ PNG created: ${pngData.length} bytes -> ${base64.length} base64 chars`);
    
    return base64;
}

async function testKlingAPI() {
    if (!KLING_API_KEY) {
        console.error('❌ KLING_API_KEY not found in environment variables');
        return;
    }

    try {
        // Create simple PNG
        const base64Image = await createSimplePNG();
        
        // Test different formats
        const testCases = [
            {
                name: "Basic PNG data URL",
                image_url: `data:image/png;base64,${base64Image}`
            },
            {
                name: "PNG with charset",
                image_url: `data:image/png;charset=utf-8;base64,${base64Image}`
            },
            {
                name: "No data URL prefix (base64 only)",
                image_url: base64Image
            }
        ];

        for (const testCase of testCases) {
            console.log(`\n🧪 Testing: ${testCase.name}`);
            console.log(`📊 Image URL length: ${testCase.image_url.length}`);
            
            const payload = {
                model: 'kling',
                task_type: 'video_generation',
                input: {
                    image_url: testCase.image_url,
                    prompt: "Simple test video generation",
                    duration: 10,
                    aspect_ratio: "16:9",
                    mode: "std"
                }
            };
            
            const payloadStr = JSON.stringify(payload);
            console.log(`📦 Total payload size: ${payloadStr.length} chars / ${Buffer.byteLength(payloadStr, 'utf8')} bytes`);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${KLING_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: payloadStr
            });
            
            const result = await response.json();
            console.log(`📥 Response Status: ${response.status}`);
            
            if (result.error) {
                console.log(`❌ Error: ${result.error.message} (${result.error.raw_message})`);
            } else {
                console.log(`✅ Success: Task ID ${result.task_id}`);
            }
            
            console.log('---');
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Run the test
testKlingAPI();