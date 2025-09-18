import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertProjectSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { promises as fs, createReadStream, existsSync, mkdirSync } from 'fs';
import Stripe from 'stripe';
import path from 'path';
import { enhancePromptWithGemini, generateImageWithGemini } from './services/gemini';
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage';
import multer from 'multer';

// AI Service Costs (in millicents USD - 1/1000 USD)
const COSTS = {
  GEMINI_PROMPT_ENHANCEMENT: 2,   // $0.002 per request (2 millicents)
  GEMINI_IMAGE_GENERATION: 2,     // $0.002 per request (2 millicents)
  GEMINI_VIDEO_ANALYSIS: 3,       // $0.003 per video analysis (3 millicents) - NEW
  VIDEO_GENERATION: 130           // $0.13 per video (130 millicents) - Updated for Kling AI
} as const;


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);


  // Configure multer for memory storage (for Cloudinary upload)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });
  
  // Upload endpoint for product images - using Cloudinary
  app.post('/api/upload-product-image', isAuthenticated, upload.single('productImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Configure Cloudinary
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const publicId = `user-uploads/${uniqueSuffix}`;
      
      console.log("Uploading to Cloudinary:", {
        originalName: req.file.originalname,
        fileSize: req.file.size,
        publicId
      });
      
      // Upload to Cloudinary
      const cloudinaryResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            public_id: publicId,
            quality: 'auto:best',
            fetch_format: 'auto'
          },
          (error: any, result: any) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              console.log("Cloudinary upload success:", {
                public_id: result.public_id,
                url: result.secure_url,
                format: result.format,
                bytes: result.bytes
              });
              resolve(result);
            }
          }
        ).end(req.file.buffer);
      });
      
      res.json({ 
        url: (cloudinaryResult as any).secure_url,
        imageUrl: (cloudinaryResult as any).secure_url,
        publicId: (cloudinaryResult as any).public_id
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Update product image endpoint - called after successful client upload
  app.put('/api/product-images', isAuthenticated, async (req: any, res) => {
    try {
      const { productImageURL } = req.body;
      
      if (!productImageURL) {
        return res.status(400).json({ error: "productImageURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(productImageURL);
      
      // Generate public URL dynamically from current request
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}${objectPath}`;
      
      res.status(200).json({
        objectPath: objectPath,
        imageUrl: imageUrl
      });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve objects endpoint for uploaded files
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // File serving endpoint - Public access for generated content
  app.get('/api/files/*', async (req: any, res) => {
    try {
      const filename = req.params['0'] as string;
      // Using imported fs and path modules
      
      // SECURITY: Validate and sanitize the file path to prevent path traversal
      if (!filename || filename.includes('..') || filename.includes('\0') || path.isAbsolute(filename)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      
      const privateDir = '/tmp';
      const filePath = path.resolve(path.join(privateDir, filename));
      
      // SECURITY: Ensure the resolved path is still within the private directory
      if (!filePath.startsWith(path.resolve(privateDir))) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // SECURITY: Validate file path structure
      const pathParts = filename.split('/');
      if (pathParts.length < 2 || pathParts[0] !== 'uploads') {
        return res.status(403).json({ message: "Invalid file structure" });
      }
      
      if (!existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // SECURITY: Get proper MIME type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Private cache for user files
      
      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Public files endpoint - NO authentication required for AI services  
  app.get('/public-objects/:filePath(*)', async (req: any, res) => {
    try {
      const filePath = req.params.filePath as string;
      
      // SECURITY: Validate and sanitize the file path to prevent path traversal
      if (!filePath || filePath.includes('..') || filePath.includes('\0') || path.isAbsolute(filePath)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Use ObjectStorageService to download and stream the file
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to serve file" });
      }
    }
  });

  // Projects endpoints
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      
      // Rehydrate URLs to use current request host
      const currentHost = `${req.protocol}://${req.get('host')}`;
      const rehydratedProjects = projects.map(project => {
        const rehydrateUrl = (url: string | null) => {
          if (!url) return url;
          if (url.includes('/public-objects/')) {
            // Extract the relative path after /public-objects/
            const pathMatch = url.match(/\/public-objects\/(.*)/);
            if (pathMatch) {
              return `${currentHost}/public-objects/${pathMatch[1]}`;
            }
          }
          return url;
        };
        
        return {
          ...project,
          productImageUrl: rehydrateUrl(project.productImageUrl),
          sceneImageUrl: rehydrateUrl(project.sceneImageUrl),
          outputImageUrl: rehydrateUrl(project.outputImageUrl),
          outputVideoUrl: rehydrateUrl(project.outputVideoUrl)
        };
      });
      
      res.json(rehydratedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse(req.body);
      
      // Check user credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const creditsNeeded = projectData.contentType === "image" ? 1 : 5; // 5 for video
      const isAdmin = user.email === 'admin@test.com';
      
      if (!isAdmin && user.credits < creditsNeeded) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create project
      const project = await storage.createProject({
        ...projectData,
        userId,
        creditsUsed: creditsNeeded,
        status: "pending"
      });

      // Deduct credits from user account (except for admin)
      if (!isAdmin) {
        await storage.updateUserCredits(userId, user.credits - creditsNeeded);
      }

      // Start CGI generation process asynchronously
      processProject(project.id).catch(console.error);

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Credit purchase endpoint (placeholder for Stripe integration)
  app.post('/api/purchase-credits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, credits } = req.body;
      
      if (!amount || !credits) {
        return res.status(400).json({ message: "Missing amount or credits" });
      }

      // Create Stripe payment intent
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          credits: credits.toString(),
        },
      });

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId,
        amount,
        credits,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        transactionId: transaction.id,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // Stripe webhook handler - SECURED with proper raw body parsing
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    if (!sig) {
      return res.status(400).send('No stripe signature provided');
    }
    
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, credits } = paymentIntent.metadata;
        
        // Update user credits (except for admin)
        const user = await storage.getUser(userId);
        if (user && user.email !== 'admin@test.com') {
          await storage.updateUserCredits(userId, user.credits + parseInt(credits));
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Download endpoint for completed projects
  app.get('/api/projects/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (project.status !== "completed") {
        return res.status(400).json({ message: "Project not completed" });
      }
      
      const outputUrl = project.contentType === "video" ? project.outputVideoUrl : project.outputImageUrl;
      if (!outputUrl) {
        return res.status(404).json({ message: "Output file not found" });
      }
      
      // If it's a local file, serve it directly
      if (outputUrl.startsWith('/api/files/')) {
        const filePath = outputUrl.replace('/api/files/', '');
        const fullPath = path.join(process.env.PRIVATE_OBJECT_DIR || '/tmp', filePath);
        
        try {
          const fileBuffer = await fs.readFile(fullPath);
          
          // Infer MIME type from file extension instead of hardcoding
          let mimeType: string;
          let fileExt: string;
          
          if (project.contentType === "video") {
            mimeType = "video/mp4";
            fileExt = "mp4";
          } else {
            // Extract file extension from outputImageUrl for proper MIME type
            const urlPath = outputUrl.includes('/public-objects/') 
              ? outputUrl.split('/public-objects/')[1] 
              : outputUrl;
            const detectedExt = path.extname(urlPath).toLowerCase();
            
            // Map extensions to MIME types
            const extToMime: { [key: string]: string } = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg', 
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.webp': 'image/webp'
            };
            
            mimeType = extToMime[detectedExt] || 'image/png'; // Fallback to PNG
            fileExt = detectedExt.replace('.', '') || 'png';
          }
          
          const fileName = `${project.title}_${project.id}.${fileExt}`;
          
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          res.send(fileBuffer);
        } catch (error) {
          return res.status(404).json({ message: "File not found" });
        }
      } else {
        // For external URLs, redirect
        res.redirect(outputUrl);
      }
    } catch (error) {
      console.error("Error downloading project:", error);
      res.status(500).json({ message: "Failed to download project" });
    }
  });

  // Admin endpoint to make yourself admin (for development/testing)
  app.post('/api/admin/make-admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Update user to be admin
      await storage.updateUser(userId, { isAdmin: true });
      
      res.json({ message: "Admin privileges granted", isAdmin: true });
    } catch (error) {
      console.error("Error granting admin:", error);
      res.status(500).json({ message: "Failed to grant admin privileges" });
    }
  });

  // Admin endpoint to get all users
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Admin endpoint to get all projects
  app.get('/api/admin/projects', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  // Endpoint to get actual costs for user projects
  app.get('/api/actual-costs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      
      // Calculate total costs and breakdown
      let totalCostMillicents = 0;
      let imageProjects = 0;
      let videoProjects = 0;
      const projectCosts = projects.map(project => {
        const cost = project.actualCost || 0; // cost is in millicents
        totalCostMillicents += cost;
        
        if (project.contentType === 'image') imageProjects++;
        if (project.contentType === 'video') videoProjects++;
        
        return {
          id: project.id,
          title: project.title,
          contentType: project.contentType,
          status: project.status,
          actualCostMillicents: cost,
          actualCostCents: (cost / 10).toFixed(1), // Convert millicents to cents for backward compatibility
          actualCostUSD: (cost / 1000).toFixed(4), // Convert millicents to USD
          createdAt: project.createdAt
        };
      });
      
      res.json({
        totalCostMillicents,
        totalCostCents: (totalCostMillicents / 10).toFixed(1), // Convert to cents for backward compatibility
        totalCostUSD: (totalCostMillicents / 1000).toFixed(4), // Convert to USD
        breakdown: {
          totalProjects: projects.length,
          imageProjects,
          videoProjects,
          estimatedImageCostMillicents: imageProjects * 4, // 4 millicents per image project
          estimatedVideoCostMillicents: videoProjects * 504, // 504 millicents per video project (includes image cost)
          estimatedImageCostCents: (imageProjects * 4 / 10).toFixed(1), // backward compatibility
          estimatedVideoCostCents: (videoProjects * 504 / 10).toFixed(1) // backward compatibility
        },
        projects: projectCosts
      });
    } catch (error) {
      console.error("Error getting actual costs:", error);
      res.status(500).json({ message: "Failed to get actual costs" });
    }
  });

  // Admin endpoint to get platform stats
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({ message: "Failed to get platform stats" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Async function to process CGI projects
async function processProject(projectId: string) {
  let totalCostMillicents = 0; // Track actual API costs in millicents (1/1000 USD)
  
  try {
    console.log(`🚀 Starting CGI processing for project ${projectId}`);
    
    // Get project details for debugging
    const project = await storage.getProject(projectId);
    console.log(`🔍 Project details:`, {
      id: projectId,
      contentType: project?.contentType,
      status: project?.status,
      title: project?.title
    });
    if (!project) {
      throw new Error("Project not found");
    }

    // Update status to processing
    await storage.updateProject(projectId, { 
      status: "processing", 
      progress: 10 
    });

    // Step 1: Enhance prompt with Gemini AI
    await storage.updateProject(projectId, { 
      status: "enhancing_prompt", 
      progress: 25 
    });

    // Helper function to extract relative path from full URL
    const extractRelativePath = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // Extract path after /public-objects/
        const pathname = urlObj.pathname;
        const match = pathname.match(/\/public-objects\/(.+)/);
        return match ? match[1] : url; // Return relative path or original URL as fallback
      } catch (error) {
        console.warn("Could not parse URL, using as path:", url);
        return url; // Use original string as path if URL parsing fails
      }
    };

    // Extract relative paths for Object Storage
    const productImagePath = extractRelativePath(project.productImageUrl || "");
    const sceneImagePath = extractRelativePath(project.sceneImageUrl || "");
    const sceneVideoPath = extractRelativePath(project.sceneVideoUrl || "");
    
    console.log("Media paths for Gemini:", { 
      productImagePath, 
      sceneImagePath, 
      sceneVideoPath, 
      contentType: project.contentType 
    });

    // Use appropriate scene path (prefer video over image for video projects)
    const scenePath = project.contentType === "video" && sceneVideoPath ? 
      sceneVideoPath : sceneImagePath;
    const isSceneVideo = project.contentType === "video" && sceneVideoPath;

    // Integrate with Gemini AI for prompt enhancement (use video-specific enhancement for video projects)
    let enhancedPrompt;
    try {
      if (project.contentType === "video") {
        const { enhanceVideoPromptWithGemini } = await import('./services/gemini');
        const result = await enhanceVideoPromptWithGemini(
          productImagePath,
          scenePath,
          project.description || "CGI video generation",
          {
            duration: project.videoDurationSeconds || undefined,
            isSceneVideo: !!isSceneVideo
          }
        );
        enhancedPrompt = result.enhancedPrompt;
      } else {
        enhancedPrompt = await enhancePromptWithGemini(
          productImagePath,
          scenePath,
          project.description || "CGI image generation"
        );
      }
    } finally {
      // Record cost even if call fails
      totalCostMillicents += COSTS.GEMINI_PROMPT_ENHANCEMENT;
    }

    await storage.updateProject(projectId, { 
      enhancedPrompt,
      progress: 50 
    });

    // Step 2: Generate image with Gemini 2.5 Flash Image
    await storage.updateProject(projectId, { 
      status: "generating_image", 
      progress: 60 
    });

    // Integrate with Gemini for multi-image generation - now returns structured data
    let geminiImageResult;
    try {
      geminiImageResult = await generateImageWithGemini(
        productImagePath,
        sceneImagePath,
        enhancedPrompt
      );
    } finally {
      // Record cost even if call fails
      totalCostMillicents += COSTS.GEMINI_IMAGE_GENERATION;
    }
    
    console.log("Gemini image generation result:", {
      base64Length: geminiImageResult.base64.length,
      mimeType: geminiImageResult.mimeType,
      timestamp: new Date().toISOString()
    });
    
    // Extract file extension from MIME type for proper file handling
    const mimeToExtension: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp'
    };
    
    const fileExtension = mimeToExtension[geminiImageResult.mimeType] || 'png';
    console.log("Using file extension:", fileExtension, "for MIME type:", geminiImageResult.mimeType);
    
    // Save the generated image to Cloudinary
    const imageBuffer = Buffer.from(geminiImageResult.base64, 'base64');
    
    // Scene preservation validation (basic check)
    if (imageBuffer.length < 1000) {
      console.warn("Generated image is suspiciously small - scene preservation may be insufficient");
    }
    console.log("Scene preservation check - generated image size:", imageBuffer.length, "bytes");
    
    // Upload to Cloudinary
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const publicId = `cgi-generated/generated-${uniqueSuffix}`;
    
    console.log("Uploading to Cloudinary with public_id:", publicId);
    
    const cloudinaryResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          folder: 'cgi-generated',
          format: fileExtension,
          quality: 'auto:best'
        },
        (error: any, result: any) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("Cloudinary upload success:", {
              public_id: result.public_id,
              url: result.secure_url,
              format: result.format,
              bytes: result.bytes
            });
            resolve(result);
          }
        }
      ).end(imageBuffer);
    });
    
    const imageResult = { url: (cloudinaryResult as any).secure_url };

    await storage.updateProject(projectId, { 
      outputImageUrl: imageResult.url,
      progress: 75 
    });

    // Step 2.5: Enhance video prompt from generated image (NEW STEP!)
    let finalVideoPrompt = enhancedPrompt; // Default to image prompt
    let audioPrompt: string | undefined = undefined;
    
    if (project.contentType === "video") {
      console.log("🎬 Step 2.5: Analyzing generated image for optimal video production...");
      await storage.updateProject(projectId, { 
        status: "generating_video", 
        progress: 78 
      });

      try {
        const { enhanceVideoPromptFromGeneratedImage } = await import('./services/gemini');
        
        const videoEnhancement = await enhanceVideoPromptFromGeneratedImage(
          geminiImageResult, // Use the generated image data
          {
            duration: project.videoDurationSeconds || 10,
            includeAudio: false,
            userDescription: project.description || "",
            productName: project.title || "Product"
          }
        );

        finalVideoPrompt = videoEnhancement.enhancedVideoPrompt;
        audioPrompt = videoEnhancement.audioPrompt;

        // Add cost for video prompt enhancement
        totalCostMillicents += COSTS.GEMINI_VIDEO_ANALYSIS;

        console.log("🎬 Video prompt enhanced successfully:", {
          originalPromptLength: enhancedPrompt.length,
          enhancedPromptLength: finalVideoPrompt.length,
          cameraMovements: videoEnhancement.cameraMovements.substring(0, 80) + "...",
          audioIncluded: !!audioPrompt,
          additionalCost: "$0.003"
        });

      } catch (error) {
        console.warn("⚠️ Video prompt enhancement failed, using original:", error);
        // Continue with original prompt if enhancement fails
        await storage.updateProject(projectId, { 
          status: "generating_video", 
          progress: 80 
        });
      }
    }

    // Step 3: Generate video if requested
    console.log("🎬 Checking video generation condition:", {
      projectId,
      contentType: project.contentType,
      shouldGenerateVideo: project.contentType === "video",
      imageUrl: imageResult.url,
      promptLength: finalVideoPrompt.length
    });
    
    if (project.contentType === "video") {
      console.log("🎬 Starting video generation for project:", projectId);
      await storage.updateProject(projectId, { 
        status: "generating_video", 
        progress: 80 
      });

      try {
        // Integrate with Kling AI for video generation
        console.log("🎬 Attempting to import kling-video service...");
        const { generateVideoWithKling } = await import('./services/kling-video');
        console.log("🎬 kling-video service imported successfully:", typeof generateVideoWithKling);
        let videoResult;
        try {
          console.log("🎬 Calling generateVideoWithKling with:", {
            imageUrl: imageResult.url,
            promptLength: finalVideoPrompt.length,
            promptType: finalVideoPrompt === enhancedPrompt ? "original" : "video-enhanced",
            duration: project.videoDurationSeconds || 10,
            includeAudio: false,
            hasAudioPrompt: false
          });
          
          // Use the video-enhanced prompt and selected video duration
          videoResult = await generateVideoWithKling(
            imageResult.url, 
            finalVideoPrompt, // Use enhanced video prompt instead of original
            project.videoDurationSeconds || 10,
            false // Audio disabled
          );
          
          console.log("🎬 generateVideoWithKling returned:", {
            success: !!videoResult,
            hasUrl: !!videoResult?.url,
            videoUrl: videoResult?.url?.substring(0, 50) + "..."
          });
          
          // Only update video URL if generation succeeded
          await storage.updateProject(projectId, { 
            outputVideoUrl: videoResult.url,
            progress: 95 
          });
          
          console.log("Video generation completed successfully:", {
            projectId,
            videoUrl: videoResult.url,
            duration: videoResult.duration
          });
          
        } finally {
          // Record cost even if video generation fails
          totalCostMillicents += COSTS.VIDEO_GENERATION;
        }
      } catch (videoError) {
        console.error("❌ VIDEO GENERATION FAILED:", {
          projectId,
          errorMessage: videoError instanceof Error ? videoError.message : "Unknown error",
          errorStack: videoError instanceof Error ? videoError.stack : "No stack trace",
          imageUrl: imageResult.url,
          promptLength: finalVideoPrompt.length
        });
        
        // Store error in database instead of hiding it
        await storage.updateProject(projectId, { 
          errorMessage: `Video generation failed: ${videoError instanceof Error ? videoError.message : "Unknown error"}`,
          status: "failed"
        });
        
        // Don't continue as completed - mark as failed
        throw videoError;
      }
    }

    // Mark as completed and update actual cost
    console.log(`Total actual cost for project ${projectId}: $${(totalCostMillicents / 1000).toFixed(4)} (${totalCostMillicents} millicents)`);
    
    await storage.updateProject(projectId, { 
      status: "completed", 
      progress: 100,
      actualCost: totalCostMillicents
    });

    console.log(`CGI processing completed for project ${projectId}`);
  } catch (error) {
    console.error(`CGI processing failed for project ${projectId}:`, error);
    
    // Mark as failed and store error message with actual cost incurred
    console.log(`Actual cost incurred despite failure: $${(totalCostMillicents / 1000).toFixed(4)} (${totalCostMillicents} millicents)`);
    await storage.updateProject(projectId, { 
      status: "failed", 
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      actualCost: totalCostMillicents
    });
  }
}
