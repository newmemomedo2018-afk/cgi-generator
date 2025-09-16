import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

export async function enhancePromptWithGemini(
  productImageUrl: string,
  sceneImageUrl: string,
  userDescription: string
): Promise<string> {
  try {
    console.log("Gemini API request details:", {
      productImageUrl,
      sceneImageUrl,
      userDescription: userDescription.substring(0, 50),
      apiKeyExists: !!process.env.GEMINI_API_KEY,
      apiKeyLength: process.env.GEMINI_API_KEY?.length || 0
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are an expert in CGI and commercial photography. Analyze these two images and create a professional prompt:

Product Image: ${productImageUrl}
Scene Image: ${sceneImageUrl}
User Request: ${userDescription}

Create a professional prompt that includes:
- Accurate description of the product and its materials
- Analysis of lighting and shadows in the scene
- Appropriate positioning for the product in the scene
- Color and lighting matching
- Technical specifications for high quality output

Write the description in English for the AI image generator. Focus on photorealistic integration, proper lighting, shadows, reflections, and natural placement.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback prompt if Gemini fails
    return `Professional CGI integration of product into scene with realistic lighting, shadows, and natural placement. High quality, photorealistic rendering. ${userDescription}`;
  }
}
