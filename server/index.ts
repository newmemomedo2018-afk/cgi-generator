import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import serverless from "serverless-http";

const app = express();

// Stripe webhook MUST come before express.json() to preserve raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Then apply JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize app setup
let isAppInitialized = false;
let initPromise: Promise<void>;

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function initializeApp() {
  if (isAppInitialized) return;
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // For local development, start the server
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  }
  
  isAppInitialized = true;
}

// Initialize the app
initPromise = initializeApp();

// Create serverless wrapper once after initialization
let serverlessApp: any;
const getServerlessApp = async () => {
  if (!serverlessApp) {
    await initPromise;
    serverlessApp = serverless(app);
  }
  return serverlessApp;
};

// Export for Vercel serverless
const handler = async (req: any, res: any) => {
  const sls = await getServerlessApp();
  return sls(req, res);
};

// Export for Vercel (ES Module)
export default handler;
