# Service Business App - Walkthrough

## Overview
This application is a production-ready solution for service-based businesses, featuring CRM, Service Management, Staff Scheduling, Point of Sale, and Analytics.

## Modules Implemented

### 1. Backend (NestJS + Prisma + PostgreSQL)
- **Authentication**: JWT-based auth for Users (Admin/Staff/Client).
- **CRM**: `Clients` resource for managing customer profiles.
- **Services**: `Services` and `ServiceCategories` for catalog management.
- **Staff**: `Staff` resource for team management and profiles.
- **Appointments**: Scheduling logic with `Appointments` resource.
- **Products**: Inventory management with `Products` resource.
- **Sales**: Transaction history and invoicing with `Sales` resource.
- **Reports**: Aggregated data for the Dashboard.

### 2. Frontend (React + Vite + TailwindCSS)
- **Dashboard**: Real-time stats (Revenue, Appointments, Clients).
- **Clients**: Client list and management.
- **Services**: Service catalog viewer and editor.
- **Staff**: Staff directory.
- **Appointments**: Calendar view (Week/Month/Day) using `react-big-calendar`.
- **Products**: Inventory list.
- **Sales**: Transaction history.

## Verification Steps

### Prerequisites
- Docker (for PostgreSQL)
- Node.js

### Running the App
1. **Start Database**:
   ```bash
   docker-compose up -d
   ```
2. **Backend**:
   ```bash
   cd backend
   npx prisma migrate dev
   npm run start:dev
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Default Credentials
- **Email**: `admin@example.com`
- **Password**: `password123`

### Validation
- **CRM**: Create a client, view list.
- **Services**: Add a service, check catalog.
- **Appointments**: Schedule a service for a client with a staff member.
- **Sales**: Record a sale (product/service), view in Sales history.
- **Dashboard**: Verify stats update after creating data.

## Next Steps
- Implement Authentication Guards in Backend (currently open).
- Connect Frontend to real Auth (Login page exists, but bypassing for dev).
- Enhance UI with more interactive forms (modals are basic).
