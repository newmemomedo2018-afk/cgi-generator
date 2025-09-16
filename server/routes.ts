import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertProjectSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { promises as fs, createReadStream, existsSync } from 'fs';
import path from 'path';
import { enhancePromptWithGemini, generateImageWithGemini } from './services/gemini';
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage';


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);


  // Get upload URL endpoint - returns presigned URL for direct client upload
  app.post('/api/get-upload-url', isAuthenticated, async (req: any, res) => {
    try {
      const { fileType } = req.body;
      
      // Extract file extension from MIME type
      const extensionMap: { [key: string]: string } = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg', 
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      
      const fileExtension = extensionMap[fileType] || 'jpg';
      
      const objectStorageService = new ObjectStorageService();
      const { url, objectPath, relativePath } = await objectStorageService.getImageUploadURL(req.user.id, fileExtension);
      
      res.json({ 
        uploadUrl: url,
        objectPath: objectPath,
        relativePath: relativePath
      });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Confirm upload endpoint - called after successful client upload
  app.post('/api/confirm-upload', isAuthenticated, async (req: any, res) => {
    try {
      const { objectPath, relativePath } = req.body;
      
      if (!objectPath || !relativePath) {
        return res.status(400).json({ message: "Object path and relative path required" });
      }

      // Verify the object exists in storage
      const objectStorageService = new ObjectStorageService();
      try {
        await objectStorageService.getObjectFile(objectPath);
      } catch (error) {
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ message: "Uploaded file not found" });
        }
        throw error;
      }
      
      // Generate public URL for AI services using the known relative path
      const baseUrl = process.env.REPL_ID ? 
        `https://${process.env.REPL_ID}.${process.env.REPL_OWNER}.repl.co` : 
        'http://localhost:5000';
      const imageUrl = `${baseUrl}/public-objects/${relativePath}`;
      
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error confirming upload:", error);
      res.status(500).json({ message: "Failed to confirm upload" });
    }
  });

  // File serving endpoint - SECURED with authentication and path validation
  app.get('/api/files/*', isAuthenticated, async (req: any, res) => {
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
      
      // SECURITY: Validate user ownership - extract user ID from file path
      const pathParts = filename.split('/');
      if (pathParts.length < 2 || pathParts[0] !== 'uploads') {
        return res.status(403).json({ message: "Invalid file structure" });
      }
      
      const fileOwnerUserId = pathParts[1];
      if (fileOwnerUserId !== req.user.id) {
        return res.status(403).json({ message: "Access denied - not your file" });
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
      res.json(projects);
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

      const creditsNeeded = projectData.contentType === "image" ? 1 : 5;
      if (user.credits < creditsNeeded) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Create project
      const project = await storage.createProject({
        ...projectData,
        userId,
        creditsUsed: creditsNeeded,
        status: "pending"
      });

      // Deduct credits from user account
      await storage.updateUserCredits(userId, user.credits - creditsNeeded);

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
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
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
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, credits } = paymentIntent.metadata;
        
        // Update user credits
        const user = await storage.getUser(userId);
        if (user) {
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
          const mimeType = project.contentType === "video" ? "video/mp4" : "image/png";
          const fileName = `${project.title}_${project.id}.${project.contentType === "video" ? "mp4" : "png"}`;
          
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
  try {
    console.log(`Starting CGI processing for project ${projectId}`);
    
    // Get project details
    const project = await storage.getProject(projectId);
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
    
    console.log("Image paths for Gemini:", { productImagePath, sceneImagePath });

    // Integrate with Gemini AI for prompt enhancement
    const enhancedPrompt = await enhancePromptWithGemini(
      productImagePath,
      sceneImagePath,
      project.description || "CGI image generation"
    );

    await storage.updateProject(projectId, { 
      enhancedPrompt,
      progress: 50 
    });

    // Step 2: Generate image with Gemini 2.5 Flash Image
    await storage.updateProject(projectId, { 
      status: "generating_image", 
      progress: 60 
    });

    // Integrate with Gemini for multi-image generation
    const imageBase64 = await generateImageWithGemini(
      productImagePath,
      sceneImagePath,
      enhancedPrompt
    );
    
    // Save the generated image to Object Storage
    const objectStorageService = new ObjectStorageService();
    const { url: uploadUrl, objectPath, relativePath } = await objectStorageService.getImageUploadURL(
      project.userId, 
      'png'
    );
    
    // Convert Base64 to Buffer and upload
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: imageBuffer,
      headers: {
        'Content-Type': 'image/png'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload generated image');
    }
    
    // Generate public URL for the saved image
    const baseUrl = process.env.REPL_ID ? 
      `https://${process.env.REPL_ID}.${process.env.REPL_OWNER}.repl.co` : 
      'http://localhost:5000';
    const imageUrl = `${baseUrl}/public-objects/${relativePath}`;
    
    const imageResult = { url: imageUrl };

    await storage.updateProject(projectId, { 
      outputImageUrl: imageResult.url,
      progress: 75 
    });

    // Step 3: Generate video if requested
    if (project.contentType === "video") {
      await storage.updateProject(projectId, { 
        status: "generating_video", 
        progress: 80 
      });

      // Integrate with PiAPI/Kling for video generation
      const { generateVideoWithPiAPI } = require('./services/piapi');
      const videoResult = await generateVideoWithPiAPI(imageResult.url);

      await storage.updateProject(projectId, { 
        outputVideoUrl: videoResult.url,
        progress: 95 
      });
    }

    // Deduct credits from user
    const user = await storage.getUser(project.userId);
    if (user) {
      await storage.updateUserCredits(user.id, user.credits - project.creditsUsed);
    }

    // Mark as completed
    await storage.updateProject(projectId, { 
      status: "completed", 
      progress: 100 
    });

    console.log(`CGI processing completed for project ${projectId}`);
  } catch (error) {
    console.error(`CGI processing failed for project ${projectId}:`, error);
    
    // Mark as failed and store error message
    await storage.updateProject(projectId, { 
      status: "failed", 
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
