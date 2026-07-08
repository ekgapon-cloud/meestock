-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Material_barcode_key" ON "Material"("barcode");

