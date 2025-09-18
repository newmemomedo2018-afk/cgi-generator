// Test the actual PNG that our system generated
import fs from 'fs';

const KLING_API_KEY = process.env.KLING_API_KEY;
const API_URL = 'https://api.piapi.ai/api/v1/task';

// هذا هو الـ PNG اللي النظام بعته وفشل (من الملف المرفق)
const actualPNG = "iVBORw0KGgoAAAANSUhEUgAAAUAAAAFABAMAAAA/vriZAAAAMFBMVEX///86NjKGZESFp8Got8JjlbpvTTKoeU2/jmbQIDJNdpI7W2+UhnvEta6nHyvrzcU7Tl7HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAgAElEQVR4nM2dT2wbWZ7fnWCP3fA+BajFNGXN6m1Q1RjR7mAkY4GsZ7NYEchFhAI4ughz2KpDuTuWNQkPLjbg0WJ9MMuAJWEv3eYhRDA7vkg+hB6sD2Iv0GJ7ZK9cbLe9xLQXYTUhA5FEYFJQD4TEBzMVfH+/V0VSf9zu4Mm7z7YsyT3DD7+/v+/3qkqnTn3nWq2t1dbWaiex/vspHWtldXVlDatWW8X/6+o/O8A1gqutEiXUXFurra6urv6zAVxZWV1ZW+2tGoxeI1BeYP8nBVxdWU3MjEWfg ...[Truncated]";

async function testActualPNG() {
    if (!KLING_API_KEY) {
        console.error('❌ KLING_API_KEY not found');
        return;
    }

    console.log('🧪 Testing the ACTUAL PNG that failed...');
    console.log(`📊 PNG Length: ${actualPNG.length} characters`);
    
    // تحليل الـ PNG header
    const pngBuffer = Buffer.from(actualPNG, 'base64');
    console.log(`📦 Binary size: ${pngBuffer.length} bytes`);
    console.log(`🔍 PNG Header: ${pngBuffer.slice(0, 16).toString('hex')}`);
    
    // Check PNG signature
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const isValidPNG = pngBuffer.slice(0, 8).equals(pngSignature);
    console.log(`✅ PNG Signature Valid: ${isValidPNG}`);
    
    // Get width/height from IHDR
    if (isValidPNG && pngBuffer.length > 24) {
        const width = pngBuffer.readUInt32BE(16);
        const height = pngBuffer.readUInt32BE(20);
        const bitDepth = pngBuffer[24];
        const colorType = pngBuffer[25];
        
        console.log(`📐 Dimensions: ${width}x${height}`);
        console.log(`🎨 Bit Depth: ${bitDepth}, Color Type: ${colorType}`);
    }

    try {
        const payload = {
            model: 'kling',
            task_type: 'video_generation',
            input: {
                image_url: `data:image/png;base64,${actualPNG}`,
                prompt: "Professional video generation test",
                duration: 10,
                aspect_ratio: "16:9",
                mode: "std"
            }
        };
        
        const payloadStr = JSON.stringify(payload);
        const payloadBytes = Buffer.byteLength(payloadStr, 'utf8');
        
        console.log(`📦 Total payload: ${payloadStr.length} chars / ${payloadBytes} bytes`);
        
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
        console.log(`📋 Full Response:`, JSON.stringify(result, null, 2));
        
        if (result.error) {
            console.log(`❌ Error Code: ${result.error.code}`);
            console.log(`❌ Error Message: ${result.error.message}`);
            console.log(`❌ Raw Error: ${result.error.raw_message}`);
        } else {
            console.log(`✅ Success: Task ID ${result.task_id}`);
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testActualPNG();