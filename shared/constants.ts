// Credit package definitions - shared between frontend and backend
export const CREDIT_PACKAGES = {
  tester: { credits: 100, price: 10.00, name: "Tester" },
  starter: { credits: 250, price: 25.00, name: "Starter" },
  pro: { credits: 550, price: 50.00, name: "Pro" },
  business: { credits: 1200, price: 100.00, name: "Business" }
} as const;

// AI Service Costs (in millicents USD - 1/1000 USD) - CORRECTED PRICING
export const COSTS = {
  GEMINI_PROMPT_ENHANCEMENT: 2,   // $0.002 per request (2 millicents)
  GEMINI_IMAGE_GENERATION: 39,    // $0.039 per request (39 millicents) - CORRECTED!
  GEMINI_VIDEO_ANALYSIS: 3,       // $0.003 per video analysis (3 millicents)
  VIDEO_GENERATION: 260           // $0.26 per 5s video (260 millicents) - USER'S ACTUAL COST
} as const;