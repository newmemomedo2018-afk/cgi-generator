// التحقق من صحة الـ Kling API Key
import fs from 'fs';

const KLING_API_KEY = process.env.KLING_API_KEY;

async function verifyKlingAPI() {
    if (!KLING_API_KEY) {
        console.error('❌ KLING_API_KEY not found');
        return;
    }

    console.log(`🔑 API Key: ${KLING_API_KEY.substring(0, 10)}...${KLING_API_KEY.substring(KLING_API_KEY.length - 5)}`);

    try {
        // 1. Test account info / balance endpoint أولاً
        console.log('\n📊 Testing account balance endpoint...');
        const balanceResponse = await fetch('https://api.piapi.ai/api/v1/account/balance', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KLING_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const balanceText = await balanceResponse.text(); // اخد الـ text مش JSON
        console.log(`Response Status: ${balanceResponse.status}`);
        console.log(`Raw Response Text: "${balanceText}"`);
        console.log(`Response Headers:`, Object.fromEntries(balanceResponse.headers.entries()));
        
        // محاولة parse JSON بس لو فشل هنعرف السبب
        try {
            const balanceResult = JSON.parse(balanceText);
            console.log(`Parsed JSON:`, JSON.stringify(balanceResult, null, 2));
        } catch (parseError) {
            console.log(`❌ JSON Parse Error: ${parseError.message}`);
        }

        // 2. Test task status endpoint with one of the previous task IDs
        console.log('\n🔍 Testing task status endpoint...');
        const taskId = 'ed66793a-f6ac-4089-977b-0ce6f4ce4d54'; // من التجربة الأولى
        const statusResponse = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KLING_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const statusResult = await statusResponse.json();
        console.log(`Task Status Response: ${statusResponse.status}`);
        console.log(`Task Status Result:`, JSON.stringify(statusResult, null, 2));

        // 3. Test different API endpoint للتأكد
        console.log('\n🌐 Testing API info endpoint...');
        const infoResponse = await fetch('https://api.piapi.ai/api/v1/info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KLING_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const infoResult = await infoResponse.json();
        console.log(`Info Response Status: ${infoResponse.status}`);
        console.log(`Info Result:`, JSON.stringify(infoResult, null, 2));

    } catch (error) {
        console.error('💥 Verification failed:', error.message);
    }
}

verifyKlingAPI();