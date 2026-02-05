# BoilerMap

**A comprehensive campus event discovery and room booking platform for Purdue University.**

BoilerMap enables students and clubs to discover campus events through an interactive map interface, manage club memberships, book rooms, and coordinate activities across campus. Built with React, TypeScript, Express, and MySQL.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)
- [Code Structure](#code-structure)
- [Database Schema](#database-schema)
- [Testing](#testing)
- [Project Status](#project-status)
- [Known Limitations](#known-limitations)

---

## Overview

BoilerMap is a full-stack web application designed to centralize campus event discovery and room booking at Purdue University. The platform provides:

- **Interactive campus map** with real-time event visualization using Leaflet
- **Event management system** with RSVP tracking and email notifications
- **Club management** with membership tracking and admin controls
- **Room booking system** with approval workflows
- **User authentication** with email verification and password recovery
- **Social features** including posts, tags, and event popularity tracking

---

## Features

### For Students
- Browse events on an interactive campus map
- Search and filter events by date, location, and attendance
- RSVP to events and receive email reminders
- Join clubs and view club profiles
- Create and manage user profiles with interests/tags
- Like and interact with posts and events

### For Club Administrators
- Create and manage events
- Book campus rooms for events
- Send email blasts to club members
- Manage club membership and admin roles
- Track event RSVPs and attendance
- Upload club and event photos

### For System Administrators
- Approve or deny room booking requests
- Manage user accounts and permissions
- View booking management dashboard
- Monitor system activity

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Port 5173)                    │
│  React 19 + TypeScript + Vite + TailwindCSS + Leaflet       │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────▼───────────────────────────────────────┐
│                     Backend (Port 3000)                     │
│         Express + TypeScript + JWT + Nodemailer             │
└─────────────────────┬───────────────┬───────────────────────┘
                      │ Prisma ORM    │ AWS SDK
┌─────────────────────▼───────────────┼───────────────────────┐
│                   MySQL Database    │    S3 Storage         │
│                   (Port 3306)       │    (LocalStack)       │
│              Users, Clubs, Events   │    (Port 4566)        │
└─────────────────────────────────────┴───────────────────────┘
```

**Key Components:**
- **Frontend**: Single-page application with client-side routing
- **Backend**: RESTful API with JWT-based authentication
- **Database**: Relational database with Prisma ORM for type-safe queries
- **Email Service**: Nodemailer for verification codes and notifications
- **File Storage**: S3-compatible storage (LocalStack for development, AWS S3 for production)

---

## Technology Stack

### Frontend
- **React 19.2** - UI framework
- **TypeScript** - Type safety
- **Vite 7.1** - Build tool and dev server
- **TailwindCSS 4.1** - Utility-first CSS framework
- **React Router 7.9** - Client-side routing
- **Leaflet 1.9** - Interactive maps
- **React Big Calendar 1.19** - Calendar views
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express 5.1** - Web framework
- **TypeScript** - Type safety
- **Prisma 6.17** - ORM and database toolkit
- **JWT (jsonwebtoken 9.0)** - Authentication
- **Nodemailer 7.0** - Email service
- **Multer 2.0** - File upload handling
- **AWS SDK v3** - S3 storage integration
- **CORS** - Cross-origin resource sharing

### Database & Storage
- **MySQL 8.0+** - Relational database
- **Prisma Client** - Type-safe database access
- **LocalStack** - Local S3 emulation for development
- **AWS S3** - Production file storage

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **ts-node** - TypeScript execution

---

## Development Setup

### Prerequisites

- **Node.js 18+** (LTS version recommended)
- **MySQL 8.0+**
- **Docker & Docker Compose** (for LocalStack S3)
- **npm** or **yarn**
- **Git**

### 1. Install Docker (Required for S3/LocalStack)

**macOS:**
```bash
brew install --cask docker
# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose-v2
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

**Windows:**
Download Docker Desktop from https://www.docker.com/products/docker-desktop

**Verify installation:**
```bash
docker --version
docker compose version
```

### 2. Install MySQL

1. Download from [MySQL Community Downloads](https://dev.mysql.com/downloads/mysql/)
2. Choose the version matching your system:
   - **Intel/AMD CPU** → x86 version
   - **Apple Silicon (M1/M2/M3)** → ARM version
3. Install with default options
4. **Set a root password** during installation (save this)

**Verify MySQL is running:**
- macOS: System Preferences → MySQL
- Windows: Services → MySQL
- Linux: `sudo systemctl status mysql`

### 3. Install MySQL Workbench (Optional)

Download from [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) for a GUI to manage your database.

**Connection settings:**
```
Hostname: localhost
Port: 3306
Username: root
Password: <your root password>
```

### 4. Clone the Repository

```bash
git clone <repository-url>
cd BoilerMap
```

### 5. Start LocalStack (S3 Storage)

LocalStack provides a local S3-compatible storage service for development.

```bash
# From the project root directory
docker compose up -d localstack

# Verify LocalStack is running
docker compose ps

# Check LocalStack health
curl http://localhost:4566/_localstack/health
```

**What this does:**
- Starts LocalStack container on port 4566
- Automatically creates the `boilermap-images` S3 bucket
- Sets up bucket policy for image access

**To stop LocalStack:**
```bash
docker compose down
```

**To view LocalStack logs:**
```bash
docker compose logs localstack
```

### 6. Backend Setup

```bash
cd src/backend
npm install
```

### 7. Configure Environment Variables

Create `src/backend/.env` by copying the example file:

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```env
# Database Configuration
DATABASE_URL="mysql://root:<YOUR_PASSWORD>@localhost:3306/BoilerMapDB"

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Authentication
JWT_SECRET=your_random_secret_key_here

# Server
PORT=3000

# S3/LocalStack Configuration (defaults work for local development)
S3_ENDPOINT=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_BUCKET_NAME=boilermap-images
```

**Important:**
- Replace `<YOUR_PASSWORD>` with your MySQL root password
- For `EMAIL_PASS`, use a [Gmail App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Generate a secure random string for `JWT_SECRET`: `openssl rand -base64 32`
- S3 settings are pre-configured for LocalStack (no changes needed for local development)
- **Never commit `.env` to version control**

### 8. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Optional: Seed test data
# Run seed.sql in MySQL Workbench or CLI
```

### 9. Test Database Connection

```bash
node testPrisma.js
```

Expected output: List of users and confirmation messages.

### 10. Frontend Setup

```bash
cd ../frontend
npm install
```

### 11. Start Development Servers

**Terminal 1 - LocalStack (if not already running):**
```bash
cd BoilerMap
docker compose up -d localstack
```

**Terminal 2 - Backend:**
```bash
cd src/backend
npm start
```
Backend runs on `http://localhost:3000`

**Terminal 3 - Frontend:**
```bash
cd src/frontend
npm start
```
Frontend runs on `http://localhost:5173`

### 12. Access the Application

Open your browser to `http://localhost:5173`

**Quick Start Script:**
```bash
# Build frontend and start backend (production-like)
./reset_start.sh
```

### 13. Verify S3 Integration

Test that S3 storage is working:

```bash
# List buckets in LocalStack
aws --endpoint-url=http://localhost:4566 s3 ls

# Should show: boilermap-images

# Upload a test file
aws --endpoint-url=http://localhost:4566 s3 cp test.jpg s3://boilermap-images/test.jpg

# List bucket contents
aws --endpoint-url=http://localhost:4566 s3 ls s3://boilermap-images/
```

**Note:** If you don't have AWS CLI installed, you can install it via:
- macOS: `brew install awscli`
- Linux: `sudo apt install awscli`
- Or skip this step - the app will test the connection automatically

---

## Code Structure

```
BoilerMap/
├── docs/                          # Project documentation
│   ├── BoilerMap Charter.pdf
│   ├── BoilerMap Design Doc.pdf
│   └── Sprint Planning Documents
│
├── docker-compose.yml             # Docker services (LocalStack, MySQL)
├── localstack/
│   └── init-aws.sh               # S3 bucket initialization script
│
├── src/
│   ├── backend/                   # Express + TypeScript backend
│   │   ├── index.ts              # Main server file with all API routes
│   │   ├── rsvp_email_job.ts     # Scheduled RSVP reminder emails
│   │   ├── testPrisma.js         # Database connection test
│   │   ├── .env.example          # Environment variables template
│   │   ├── config/
│   │   │   ├── database.ts       # Prisma database config
│   │   │   ├── email.ts          # Nodemailer config
│   │   │   ├── multer.ts         # File upload config
│   │   │   └── s3.ts             # AWS S3/LocalStack config
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication routes
│   │   │   ├── users.ts          # User management (with S3 photo upload)
│   │   │   ├── clubs.ts          # Club operations
│   │   │   ├── events.ts         # Event management (with S3 image upload)
│   │   │   └── ...
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema definition
│   │   ├── uploads/              # Local fallback for default photos
│   │   ├── photos/               # Legacy local photo storage
│   │   ├── tests/                # Jest test files
│   │   └── package.json
│   │
│   ├── frontend/                  # React + TypeScript frontend
│   │   ├── src/
│   │   │   ├── main.tsx          # Application entry point
│   │   │   ├── App.tsx           # Main app component with routing
│   │   │   ├── BoilerMap.tsx     # Main dashboard with tabs
│   │   │   │
│   │   │   ├── Map.tsx           # Building/location map component
│   │   │   ├── EventMap.tsx      # Event visualization map
│   │   │   │
│   │   │   ├── Profile.tsx       # User profile management
│   │   │   ├── Signup.tsx        # User registration
│   │   │   ├── VerifyPage.tsx    # Email verification
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   ├── ProtectedRoute.tsx # Auth guard component
│   │   │   │
│   │   │   ├── ClubsList.tsx     # Browse all clubs
│   │   │   ├── ClubProfile.tsx   # Individual club page
│   │   │   │
│   │   │   ├── EventSearch.tsx   # Search/filter events
│   │   │   ├── EventDetails.tsx  # Event detail page
│   │   │   ├── EventCreator.tsx  # Create new events
│   │   │   ├── EventInfo.tsx     # Event information display
│   │   │   ├── RSVP.tsx          # RSVP management
│   │   │   │
│   │   │   ├── RoomListing.tsx   # Browse available rooms
│   │   │   ├── RoomInfo.tsx      # Room details and booking
│   │   │   ├── BookRoom.tsx      # Room booking form
│   │   │   ├── BookingManagement.tsx # Admin booking approval
│   │   │   │
│   │   │   ├── EmailBlast.tsx    # Send emails to club members
│   │   │   ├── EventEmailBlast.tsx # Event-specific emails
│   │   │   ├── AdminPortal.tsx   # Admin dashboard
│   │   │   │
│   │   │   └── 404.tsx           # Error page
│   │   │
│   │   ├── purdue_buildings_with_coords.json # Building location data
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   │
│   └── db/                        # Database scripts
│       ├── seed.sql              # Test data
│       └── events_testing.sql    # Event test data
│
├── reset_start.sh                 # Build frontend + start backend
└── README.md
```

### Key File Descriptions

#### Backend (`src/backend/`)

- **`index.ts`** (2577 lines) - Monolithic server file containing:
  - All REST API endpoints (~50+ routes)
  - Authentication middleware (JWT)
  - Email service configuration (Nodemailer)
  - File upload handling (Multer)
  - Database queries (Prisma)

  **Major route groups:**
  - `/api/signup`, `/api/login`, `/api/verify` - Authentication
  - `/api/forgot-password`, `/api/reset-password` - Password recovery
  - `/api/user/*` - User profile management
  - `/api/clubs/*` - Club CRUD operations
  - `/api/events/*` - Event management and search
  - `/api/room-booking-requests` - Room booking system
  - `/api/rsvp/*` - RSVP management
  - `/api/posts/*` - Social posts
  - `/api/tags/*` - Tag system

- **`prisma/schema.prisma`** - Defines 20+ database models including:
  - User, Club, Event, Room, Booking
  - Post, Tag, RSVP
  - Many-to-many relationship tables
  - Indexes and constraints

- **`rsvp_email_job.ts`** - Cron job for sending RSVP reminder emails

#### Frontend (`src/frontend/src/`)

**Routing Structure:**
- `/` - Main dashboard (BoilerMap.tsx)
- `/signup`, `/verify` - Registration flow
- `/profile` - User profile
- `/clubs`, `/clubs/:id` - Club browsing
- `/events`, `/events/search`, `/event/:eventId` - Event discovery
- `/eventcreator` - Create events (club admins)
- `/room_listing`, `/room`, `/book` - Room booking
- `/email`, `/event_email` - Email blasts (admins)
- `/userInfo` - Protected user settings
- `/admin` - Admin portal

**Component Architecture:**
- **Layout Components**: Navigation, tabs, modals
- **Map Components**: Leaflet integration with custom markers
- **Form Components**: Booking, event creation, profile editing
- **List Components**: Clubs, events, rooms with search/filter
- **Protected Routes**: JWT verification before rendering

---

## Database Schema

### Core Models

**Users**
- Authentication (email/password, JWT tokens)
- Profile information (name, bio, photo)
- Relationships: memberships, bookings, RSVPs, posts

**Clubs**
- Club information (name, description, contact)
- Unique `authId` for admin verification
- Relationships: members, admins, events, posts

**Events**
- Linked to a booking and room
- Hosted by a club
- Tracks RSVPs and popularity
- Supports recurring events

**Rooms**
- Building code and room number
- Capacity limits
- Amenities (many-to-many)
- Booking availability

**Bookings**
- Room reservation requests
- Approval workflow (PENDING → APPROVED/DENIED)
- Links to events upon approval
- Fallback room support

**Tags**
- Categorization system
- Applied to users, posts, and events
- Enables interest-based filtering

### Relationships

```
User ←→ ClubMembership ←→ Club
User ←→ ClubAdmin ←→ Club
User → Booking → Event ← Club
Event → Room
Event ←→ RSVP ←→ User
User → Post ← Club
Post/Event/User ←→ Tags
```

### Database Diagram

See the [Database Schema Overview](#database-schema-overview) Mermaid diagram above for a visual representation.

**Key Constraints:**
- Email must end with `@purdue.edu` (enforced in backend)
- Unique usernames and emails
- Booking times cannot overlap for the same room
- Events require approved bookings
- Club admins verified via `authId`

---

## Testing

### Backend Tests

```bash
cd src/backend
npm test
```

**Test Coverage:**
- API endpoint testing with Supertest
- Database operations with Prisma
- Authentication flows
- Located in `src/backend/tests/`

### Frontend Tests

```bash
cd src/frontend
npm test
```

**Note:** Frontend tests are currently minimal. Test infrastructure is in place but requires expansion.

### Manual Testing

1. **User Registration Flow:**
   - Sign up with `@purdue.edu` email
   - Verify with 6-digit code (5-minute expiry)
   - Login and receive JWT token

2. **Event Discovery:**
   - Browse events on map
   - Filter by date/location/attendance
   - RSVP to events

3. **Room Booking:**
   - Search available rooms
   - Submit booking request
   - Admin approves → Event created

4. **Club Management:**
   - Join clubs as member
   - Admins create events and send emails

---

## Project Status

### Current Development Status

**Phase:** Active Development
**Version:** 1.0.0
**Last Updated:** 2025

### Completed Features
- ✅ User authentication with email verification
- ✅ Interactive campus map with Leaflet
- ✅ Event creation and RSVP system
- ✅ Club management and membership
- ✅ Room booking with approval workflow
- ✅ Email notifications (verification, password reset, RSVP reminders)
- ✅ Search and filtering for events
- ✅ Profile photo uploads
- ✅ Tag-based categorization
- ✅ Admin portal for booking management

### In Progress
- 🚧 Comprehensive test coverage
- 🚧 Event calendar view improvements
- 🚧 Mobile responsiveness optimization

### Planned Features
- 📋 Real-time notifications (WebSocket)
- 📋 Event analytics dashboard
- 📋 Advanced search with Elasticsearch
- 📋 Social feed with post interactions
- 📋 Calendar integration (Google Calendar, iCal)
- 📋 Push notifications for mobile
- 📋 Accessibility improvements (WCAG 2.1)

---

## Known Limitations

### Security
- ⚠️ **Passwords stored in plaintext** - No bcrypt hashing implemented
- ⚠️ **CORS enabled for all origins** - Development-only configuration
- ⚠️ **No rate limiting** - API endpoints vulnerable to abuse
- ⚠️ **JWT secrets in .env** - Should use key management service in production

### Performance
- Database queries not optimized (N+1 query issues in some endpoints)
- No caching layer (Redis recommended for production)
- Large file uploads not chunked
- No CDN for static assets

### Scalability
- Monolithic backend architecture (single `index.ts` file)
- ✅ **S3-compatible storage now implemented** (LocalStack for dev, AWS S3 for production)
- No horizontal scaling support
- Single database instance (no replication)

---

## Troubleshooting

### Common Issues

**MySQL Connection Failed**
```bash
Error: Can't connect to MySQL server on 'localhost'
```
- Ensure MySQL is running: `sudo systemctl start mysql` (Linux) or check System Preferences (macOS)
- Verify credentials in `.env` file
- Check port 3306 is not blocked by firewall

**Prisma Client Not Generated**
```bash
Error: @prisma/client did not initialize yet
```
- Run: `npx prisma generate`
- Restart your development server

**Frontend Can't Reach Backend**
```bash
Failed to fetch: http://localhost:3000/api/...
```
- Ensure backend is running on port 3000
- Check CORS configuration in `index.ts`
- Verify no other service is using port 3000

**Email Verification Not Sending**
- Verify `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Use Gmail App Password, not regular password
- Check Gmail "Less secure app access" settings

**Database Schema Out of Sync**
```bash
npx prisma db push
# or for migrations
npx prisma migrate dev
```

**LocalStack/S3 Connection Issues**
```bash
Error: connect ECONNREFUSED 127.0.0.1:4566
```
- Ensure LocalStack is running: `docker compose ps`
- Start LocalStack: `docker compose up -d localstack`
- Check LocalStack logs: `docker compose logs localstack`
- Verify health: `curl http://localhost:4566/_localstack/health`

**S3 Bucket Not Found**
```bash
Error: The specified bucket does not exist
```
- The init script should create it automatically on first run
- Manually create bucket:
  ```bash
  aws --endpoint-url=http://localhost:4566 s3 mb s3://boilermap-images
  ```
- Or restart LocalStack: `docker compose restart localstack`

**Image Upload Failing**
- Check S3 environment variables in `.env`
- Verify LocalStack is running and healthy
- Check backend logs for detailed error messages
- Ensure file size is under 5MB limit

---

## Additional Resources

- **Prisma Documentation**: https://www.prisma.io/docs
- **React Documentation**: https://react.dev
- **Leaflet Documentation**: https://leafletjs.com
- **Express Documentation**: https://expressjs.com
- **MySQL Documentation**: https://dev.mysql.com/doc
- **LocalStack Documentation**: https://docs.localstack.cloud
- **AWS SDK for JavaScript v3**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest
- **Docker Compose Documentation**: https://docs.docker.com/compose

---

## Team Notes

### Development Workflow

1. **Pull latest changes**: `git pull origin main`
2. **Install dependencies**: `npm install` (if package.json changed)
3. **Update database**: `npx prisma db push` (if schema changed)
4. **Start dev servers**: Backend first, then frontend
5. **Test changes**: Run tests before committing
6. **Commit**: Use descriptive commit messages
7. **Push**: `git push origin <branch-name>`

### Database Management

**Reset Database:**
```bash
cd src/backend
npx prisma migrate reset  # Deletes all data!
npx prisma db push
```

**View Database:**
```bash
npx prisma studio  # Opens GUI at http://localhost:5555
```

**Backup Database:**
```bash
mysqldump -u root -p BoilerMapDB > backup.sql
```

### Code Style

- **Linting**: `npm run lint` (frontend)
- **Formatting**: `npm run fmt` (frontend uses Prettier)
- **Pre-commit hooks**: Husky runs linting automatically

### Environment Variables

**Never commit:**
- `.env` files
- `node_modules/`
- Database credentials
- API keys
- AWS credentials (use `test/test` for LocalStack only)

**Always use:**
- `.env.example` for documenting required variables (already provided in `src/backend/.env.example`)
- Environment-specific configs for dev/staging/prod
- LocalStack for local S3 development (free, no AWS account needed)

**S3 Configuration:**
- **Local Development**: Use LocalStack defaults (endpoint: `http://localhost:4566`, credentials: `test/test`)
- **Production**: Update to real AWS S3 credentials and bucket
- **Bucket Name**: `boilermap-images` (created automatically by init script)

---
