/*
  Warnings:

  - Added the required column `passwordHash` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Employee` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "UserSiteAccess" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSiteAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSiteAccess_warehouseId_idx" ON "UserSiteAccess"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSiteAccess_employeeId_warehouseId_key" ON "UserSiteAccess"("employeeId", "warehouseId");

-- AddForeignKey
ALTER TABLE "UserSiteAccess" ADD CONSTRAINT "UserSiteAccess_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSiteAccess" ADD CONSTRAINT "UserSiteAccess_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
