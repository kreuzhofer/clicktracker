# Campaign Click Tracker

A YouTube-focused click tracker and URL shortener system that enables marketing teams to create, manage, and track marketing campaigns linked from YouTube video descriptions.

## Features

- Campaign management with YouTube video integration
- URL shortening and click tracking
- Conversion tracking and revenue attribution
- Comprehensive analytics dashboard
- Real-time YouTube video metrics integration

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL
- Redis
- JWT Authentication
- YouTube Data API integration

### Frontend
- React 18 with TypeScript
- Material-UI (MUI)
- Vite build tool
- React Router
- Recharts for analytics visualization

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- YouTube Data API key

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env.development
```

2. Fill in your environment variables, especially:
   - `YOUTUBE_API_KEY`: Your YouTube Data API key
   - `JWT_SECRET`: A secure random string
   - Database credentials

### Running with Docker

1. Start all services:
```bash
docker-compose up -d
```

2. For development with hot reload:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
├── backend/                 # Node.js API server
│   ├── src/                # Source code
│   ├── Dockerfile          # Production Docker image
│   ├── Dockerfile.dev      # Development Docker image
│   └── package.json        # Dependencies and scripts
├── frontend/               # React application
│   ├── src/                # Source code
│   ├── Dockerfile          # Production Docker image
│   ├── Dockerfile.dev      # Development Docker image
│   └── package.json        # Dependencies and scripts
├── docker-compose.yml      # Production services
├── docker-compose.dev.yml  # Development overrides
└── .env.example           # Environment template
```

## Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Documentation

The API will be available at `http://localhost:3001` with the following main endpoints:

- `GET /health` - Health check
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns/:id/links` - Add campaign link
- `GET /:shortCode` - Redirect shortened URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details