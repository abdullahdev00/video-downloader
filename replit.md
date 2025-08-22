# Overview

This is an all-in-one video downloader web application built with React, Express.js, and TypeScript. The application allows users to download videos from multiple platforms including YouTube, TikTok, Instagram, Facebook, Twitter/X, Vimeo, Reddit, Pinterest, LinkedIn, and Dailymotion. It features a modern, responsive UI with dark/light theme support, video quality selection, download history tracking, and comprehensive FAQ section.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state and local React state for UI state
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting light/dark modes with CSS variables

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with rate limiting and error handling middleware
- **Video Processing**: yt-dlp integration for video extraction from multiple platforms
- **Storage**: In-memory storage with interface abstraction for future database integration
- **Rate Limiting**: Express rate limiter with different limits for general API usage and downloads

## Data Storage Solutions
- **Current**: In-memory storage using Maps for development/testing
- **Database Ready**: Drizzle ORM configured with PostgreSQL schemas
- **Tables**: Download history and video info caching with proper indexing
- **Migrations**: Drizzle Kit setup for database schema management

## Authentication and Authorization
- **Current**: No authentication system implemented
- **Session Management**: Express session configuration present but not actively used
- **Rate Limiting**: IP-based rate limiting as primary protection mechanism

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver for serverless environments
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **@tanstack/react-query**: Server state management for React
- **express-rate-limit**: Rate limiting middleware for API protection

### UI and Styling
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **cmdk**: Command palette/search interface

### Form and Validation
- **@hookform/resolvers**: Form validation resolvers
- **drizzle-zod**: Zod integration for Drizzle ORM schema validation
- **zod**: TypeScript-first schema validation

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution engine for Node.js
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tooling

### Video Processing
- **yt-dlp**: External command-line tool for video extraction (not in package.json as it's a system dependency)

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: URL-safe unique ID generator
- **clsx**: Utility for constructing className strings conditionally