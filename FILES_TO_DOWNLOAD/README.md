# Production Planning & Accounting System

A comprehensive SaaS multi-tenant business management system designed for production planning and accounting. The application is built with React.js (TypeScript), Express.js, and PostgreSQL, featuring an 8-level permission system and multi-tenant architecture.

## Features

- **Multi-tenant SaaS Architecture** with UUID-based tenant isolation
- **8-Level Permission System** (ADMIN → INTERN) with page-level access control
- **Production Management** with work orders, sub-jobs, and daily work logs
- **AI Chatbot Integration** with Gemini AI and advanced conversation management
- **Real-time Notifications** with customizable alerts
- **Business Operations** including customers, quotations, invoices, and inventory
- **Hybrid Authentication** supporting both Replit OpenID Connect and internal users

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Shadcn/ui** with Radix UI primitives
- **Tailwind CSS** for styling
- **TanStack Query** for server state management
- **React Hook Form** with Zod validation
- **Wouter** for routing

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Neon hosting
- **Drizzle ORM** with TypeScript schemas
- **Express Sessions** with database storage
- **Passport.js** for authentication

### AI Features
- **Gemini AI Integration** with "Bring Your Own Key" model
- **Smart Insights Panel** with real-time conversation analysis
- **Chart Generation** with Chart.js integration
- **Action Approval Workflow** for AI-powered recommendations

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon recommended)
- Gemini API key (optional, for AI features)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd production-planning-v2
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. Set up the database
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

## Environment Variables

See `.env.example` for a complete list of required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `MASTER_ENCRYPTION_KEY` - 32-character hex key for encrypting tenant API keys
- `GEMINI_API_KEY` - Optional, for AI features
- `SESSION_SECRET` - Secret for session management

## Authentication

Default admin credentials:
- Username: `admin`
- Password: `A0971-exp11`
- Role: System Administrator

## Project Structure

```
├── client/          # React frontend
├── server/          # Express.js backend
├── shared/          # Shared TypeScript schemas
├── migrations/      # Database migrations
└── uploads/         # File uploads storage
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes

## License

MIT

## Contributing

Please read the contributing guidelines before submitting pull requests.