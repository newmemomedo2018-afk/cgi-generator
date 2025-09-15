# Overview

CGI Generator is a SaaS platform that allows users to create professional CGI images and videos using AI technology. Users upload a product image and scene image, and the system uses multiple AI services (Gemini AI and Fal.ai) to generate integrated CGI content. The platform operates on a credit-based system where users receive 5 free credits upon registration, with image generation costing 1 credit and video generation costing 5 credits.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript in a single-page application architecture. It uses Vite as the build tool and development server, with Tailwind CSS for styling and shadcn/ui components for the UI framework. The application follows a component-based architecture with:

- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Authentication**: JWT token-based authentication stored in localStorage
- **Styling**: Tailwind CSS with CSS variables for theming, RTL (right-to-left) support for Arabic interface
- **Forms**: React Hook Form with Zod validation

The frontend is organized into pages (landing, dashboard, pricing), reusable components, and utility functions. It includes features like drag-and-drop file uploads, real-time progress tracking, and responsive design.

## Backend Architecture
The backend follows a REST API architecture built with Node.js and Express. Key architectural decisions include:

- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **File Upload**: Multer for handling multipart/form-data uploads
- **API Structure**: RESTful endpoints organized by feature (auth, projects, uploads)
- **Error Handling**: Centralized error handling middleware
- **Environment Configuration**: Environment variables for API keys and database connections

The server implements a modular structure with separate files for authentication, database operations, routes, and external service integrations.

## Data Storage Solutions
The system uses PostgreSQL as the primary database with the following schema design:

- **Users Table**: Stores user credentials, profile information, credit balance, and Stripe integration fields
- **Projects Table**: Tracks CGI generation projects with status, content type, and result URLs
- **Transactions Table**: Records credit purchases and usage for billing purposes
- **Sessions Table**: Manages user sessions for authentication

The database uses Drizzle ORM for type-safe queries and schema management, with migrations handled through drizzle-kit.

## Authentication and Authorization
The system implements JWT-based authentication with the following flow:

- **Registration/Login**: Users authenticate with email/password, receive JWT tokens
- **Token Management**: Tokens stored in localStorage with 7-day expiration
- **Protected Routes**: Middleware validates JWT tokens for API access
- **Session Persistence**: Query invalidation maintains authentication state across page refreshes

The authentication system includes password hashing with bcrypt and supports both traditional login and potential integration with Replit OAuth.

## External Dependencies

### AI Services
- **Gemini AI**: Google's generative AI for prompt enhancement and optimization ($0.001-$0.003 per request)
- **Fal.ai**: AI image and video generation service ($0.05 for images, $0.50 for videos)

### Cloud Services  
- **Cloudinary**: Image and video storage and optimization service
- **Neon Database**: Serverless PostgreSQL database hosting

### Payment Processing
- **Stripe**: Payment processing for credit purchases (configured but not fully implemented)

### Development Tools
- **Replit**: Development environment with specialized plugins for cartographer and dev banner
- **Vite**: Build tool and development server with React plugin
- **TypeScript**: Type safety across frontend and backend

### UI Components
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Pre-built component library built on Radix UI

The system architecture supports a multi-stage AI processing pipeline where user inputs are enhanced through Gemini AI before being processed by Fal.ai for final content generation, with progress tracking and real-time updates throughout the process.