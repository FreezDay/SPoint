CREATE TABLE "ServiceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceName" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "serviceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ServiceRecord_serviceDate_idx" ON "ServiceRecord"("serviceDate");
CREATE INDEX "ServiceRecord_staffId_idx" ON "ServiceRecord"("staffId");
