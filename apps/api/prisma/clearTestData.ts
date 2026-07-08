import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

const KEEP_EMPLOYEE_EMAIL = "admin@meestock.local";

async function main() {
  const keepEmployee = await prisma.employee.findUnique({ where: { email: KEEP_EMPLOYEE_EMAIL } });
  if (!keepEmployee) {
    throw new Error(`Employee ${KEEP_EMPLOYEE_EMAIL} not found - refusing to wipe without a known admin to keep`);
  }

  await prisma.$transaction([
    prisma.stockTransaction.deleteMany(),
    prisma.projectMaterialPrice.deleteMany(),
    prisma.goodsReceiveItem.deleteMany(),
    prisma.materialIssueItem.deleteMany(),
    prisma.materialReturnItem.deleteMany(),
    prisma.stockTransferItem.deleteMany(),
    prisma.stockCountItem.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.goodsReceive.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.materialIssue.deleteMany(),
    prisma.materialReturn.deleteMany(),
    prisma.stockTransfer.deleteMany(),
    prisma.stockCount.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.userSiteAccess.deleteMany(),
    prisma.material.deleteMany(),
    prisma.category.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.project.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.projectCost.deleteMany(),
    prisma.projectRevenue.deleteMany(),
    prisma.employee.deleteMany({ where: { email: { not: KEEP_EMPLOYEE_EMAIL } } }),
  ]);

  const remainingEmployees = await prisma.employee.count();
  console.log(`Cleared test/demo data. Employees remaining: ${remainingEmployees} (kept ${KEEP_EMPLOYEE_EMAIL})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
