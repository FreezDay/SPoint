-- CreateEnum
CREATE TYPE "TattooSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PhotoKind" AS ENUM ('DRAFT', 'PROGRESS', 'FINAL');

-- CreateTable
CREATE TABLE "CrmClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TattooProject" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceName" TEXT,
    "description" TEXT,
    "placement" TEXT,
    "size" TEXT,
    "cost" DECIMAL(65,30),
    "plannedSessions" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TattooProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TattooSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "status" "TattooSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TattooSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT,
    "kind" "PhotoKind" NOT NULL DEFAULT 'PROGRESS',
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TattooSession_projectId_sessionNumber_key" ON "TattooSession"("projectId", "sessionNumber");

-- AddForeignKey
ALTER TABLE "TattooProject" ADD CONSTRAINT "TattooProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TattooSession" ADD CONSTRAINT "TattooSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "TattooProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TattooSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
