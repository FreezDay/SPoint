# Service Business Application - Implementation Plan

## Goal Description
Build a modular, production-ready SaaS-style application for service-based businesses (salons, barbershops, etc.). The system will handle CRM, scheduling, point-of-sale, inventory, and analytics.

## User Review Required
> [!IMPORTANT]
> - **Tech Stack**: Confirmed to be NestJS (Backend), React + React Router + Tailwind (Frontend), PostgreSQL (Database).
> - **Docker**: Will be used for local development of the database.
> - **Authentication**: JWT-based auth with RBAC (Role-Based Access Control).

## Proposed Architecture

### Backend (NestJS)
- **Framework**: NestJS for modular architecture.
- **Language**: TypeScript.
- **Database ORM**: Prisma or TypeORM (Proposing Prisma for type safety and ease of use).
- **Authentication**: Passport.js with JWT strategy.
- **Documentation**: Swagger/OpenAPI (built-in with NestJS).

### Frontend (React)
- **Framework**: React (Vite).
- **Styling**: TailwindCSS for rapid, custom design.
- **State Management**: Zustand or React Context for global state.
- **Data Fetching**: TanStack Query (React Query) for efficient server state management.
- **UI Components**: Headless UI + Tailwind or a lightweight component library like Shadcn/UI for premium aesthetics.

### Database (PostgreSQL / SQLite)
- **Production**: PostgreSQL.
- **Development**: SQLite (if Docker/Postgres not available locally).
- Relational schema to handle complex relationships between staff, services, appointments, and clients.

## Proposed Changes / Structure

### Directory Structure
```
/service-business-app
  ├── backend/         # NestJS Application
  ├── frontend/        # React Application
  ├── docker-compose.yml
  └── README.md
```

### Modules Breakdown
1.  **Auth Module**: Login, Registration, Password Reset, Role Guards.
2.  **User Module**: Staff and Admin management.
3.  **Client Module**: CRM features.
4.  **Service Module**: Catalog of services, pricing, duration.
5.  **Appointment Module**: Booking logic, availability checks, calendar events.
6.  **Product Module**: Inventory, stock alerts.
7.  **Sale Module**: Invoices, transaction history.
8.  **Analytics Module**: Aggregation of data for KPIs.

## Verification Plan

### Automated Tests
- Backend: Unit tests (Jest) for services and controllers. E2E tests for critical flows (Booking).
- Frontend: Component testing (optional for this phase), manual verification.

### Manual Verification
- Verify Docker containers spin up correctly.
- Test User Registration and Login flows.
- Create a Service and book an Appointment.
- Verify Dashboard statistics update after a sale/appointment.
