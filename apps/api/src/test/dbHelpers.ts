import { prisma } from "../lib/prisma.js";

// Listed only for readability; TRUNCATE ... CASCADE in one statement resolves
// FK ordering itself, so this doesn't need to be topologically sorted.
const TABLES = [
  "StockTransaction",
  "MaterialIssueItem",
  "MaterialIssue",
  "Approval",
  "GoodsReceiveItem",
  "GoodsReceive",
  "PurchaseOrderItem",
  "PurchaseOrder",
  "MaterialReturnItem",
  "MaterialReturn",
  "StockTransferItem",
  "StockTransfer",
  "StockCountItem",
  "StockCount",
  "ProjectMaterialPrice",
  "UserSiteAccess",
  "ProjectCost",
  "ProjectRevenue",
  "Material",
  "Warehouse",
  "Project",
  "Employee",
  "Customer",
  "Category",
  "Supplier",
];

/** Test-only: wipes every table in the test database. Never called from application code. */
export async function resetDatabase(): Promise<void> {
  const quoted = TABLES.map((table) => `"${table}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}
