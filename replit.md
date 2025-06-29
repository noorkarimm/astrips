# Travel Itinerary Generator

## Overview

This is a full-stack travel itinerary generator application that uses AI to create personalized trip plans. Users can describe their travel desires in natural language, and the system generates detailed day-by-day itineraries with activities, costs, and recommendations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4o for trip generation
- **Session Management**: Express sessions with PostgreSQL store
- **Development**: Hot reload with Vite middleware integration

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Migration Strategy**: Schema-first with automatic migrations
- **Connection**: Neon Database serverless PostgreSQL
- **Schema Location**: Shared between client and server (`/shared/schema.ts`)

## Key Components

### Core Entities
1. **Users**: Basic user management with username/password authentication
2. **Trips**: Generated travel itineraries with structured JSON data
3. **Itinerary Structure**: Day-by-day activities with time, location, cost, and category

### AI Integration
- **Service**: OpenAI GPT-4o model for natural language processing
- **Prompt Engineering**: Structured prompts for consistent JSON output
- **Response Validation**: Zod schemas ensure data integrity
- **Error Handling**: Graceful fallbacks for API failures

### Storage Strategy
- **Development**: In-memory storage for rapid prototyping
- **Production**: PostgreSQL with Drizzle ORM
- **Data Models**: Shared TypeScript interfaces between frontend and backend

## Data Flow

1. **User Input**: Natural language trip description via chat-like interface
2. **Validation**: Zod schema validation on both client and server
3. **AI Processing**: OpenAI API generates structured itinerary data
4. **Data Storage**: Trip saved to database with user preferences
5. **Response**: Formatted itinerary displayed with interactive UI components
6. **State Management**: TanStack Query caches responses and manages loading states

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **openai**: Official OpenAI SDK for GPT integration
- **drizzle-orm**: Type-safe database toolkit
- **@tanstack/react-query**: Server state management
- **zod**: Runtime type validation and schema definition

### UI Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form state management
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **esbuild**: Fast JavaScript bundler for production
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds React app to `/dist/public`
2. **Backend**: esbuild bundles Express server to `/dist/index.js`
3. **Database**: Drizzle pushes schema changes to PostgreSQL

### Environment Configuration
- **Development**: Local development with hot reload
- **Production**: Replit autoscale deployment
- **Database**: Environment variable configuration for connection strings
- **API Keys**: Secure environment variable management for OpenAI

### Deployment Targets
- **Platform**: Replit with autoscale configuration
- **Port Configuration**: Internal port 5000, external port 80
- **Process Management**: npm scripts for development and production modes

## Changelog

```
Changelog:
- June 21, 2025. Initial setup
- June 21, 2025. Added visual elements with image generation for restaurants, hotels, and activities
- June 21, 2025. Implemented hover preview cards with AI-generated images
- June 21, 2025. Added conversational trip planning with step-by-step questions
- June 21, 2025. Changed typography to Geist Mono for modern monospace design
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Visual interface preference: Wants visual elements and images for places like restaurants and hotels with hover previews.
Trip planning preference: AI should ask specific questions (destination, dates, vibe, stay style, activities) one by one before generating final itinerary.
Typography preference: Geist Mono or JetBrains Mono font for clean, modern appearance.
```