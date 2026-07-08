/**
 * Demo/sample data — 3 SITE warehouses, 3 material issues each (varied statuses),
 * and 5 purchase orders (varied statuses). Separate from seed.ts (the stable baseline
 * accounts) so re-running it doesn't touch or depend on manual test data created elsewhere.
 *
 * Drives everything through the real service layer (not raw Prisma writes) so the demo
 * data goes through the exact same validation/workflow rules the app enforces — docNo
 * generation, state machine transitions, atomic stock transactions, PO status derivation.
 *
 * Idempotent: bails out early if PRJ-DEMO-A already exists.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

// Service-layer imports — these files construct their own `prisma` via lib/prisma.ts,
// which will share the same underlying connection pool via the adapter singleton pattern.
import { createSiteAccess } from "../src/repositories/userSiteAccessRepository.js";
import { createMaterialIssue, approveMaterialIssue, rejectMaterialIssue, fulfillMaterialIssue } from "../src/services/materialIssueService.js";
import { createPurchaseOrderWithValidation, updatePurchaseOrderStatus } from "../src/services/purchaseOrderService.js";
import { createGoodsReceiveWithValidation } from "../src/services/goodsReceiveService.js";

async function findOrCreateCategory(name: string) {
  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.category.create({ data: { name } });
}

async function findOrCreateCustomer(name: string) {
  const existing = await prisma.customer.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.customer.create({ data: { name } });
}

async function findOrCreateSupplier(name: string) {
  const existing = await prisma.supplier.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.supplier.create({ data: { name } });
}

async function findOrCreateMaterial(code: string, name: string, categoryId: string, unit: string, standardCost: number) {
  const existing = await prisma.material.findUnique({ where: { code } });
  if (existing) return existing;
  return prisma.material.create({ data: { code, name, categoryId, unit, standardCost } });
}

async function main() {
  const existingDemo = await prisma.project.findUnique({ where: { code: "PRJ-DEMO-A" } });
  if (existingDemo) {
    console.log("Demo data already seeded (PRJ-DEMO-A exists) — skipping. Delete it first to reseed.");
    return;
  }

  // --- Reuse the baseline test employees from seed.ts ---
  const admin = await prisma.employee.findUniqueOrThrow({ where: { email: "admin@meestock.local" } });
  const storekeeper = await prisma.employee.findUniqueOrThrow({ where: { email: "storekeeper@meestock.local" } });
  const requester = await prisma.employee.findUniqueOrThrow({ where: { email: "requester@meestock.local" } });
  const approver = await prisma.employee.findUniqueOrThrow({ where: { email: "approver@meestock.local" } });
  const purchasing = await prisma.employee.findUniqueOrThrow({ where: { email: "purchasing@meestock.local" } });

  // --- Master data: a few more materials so the demo isn't repeating one SKU everywhere ---
  const wireCategory = await findOrCreateCategory("สายไฟ");
  const protectionCategory = await findOrCreateCategory("อุปกรณ์ป้องกันไฟฟ้า");
  const conduitCategory = await findOrCreateCategory("ท่อร้อยสายไฟ");
  const fittingCategory = await findOrCreateCategory("อุปกรณ์ไฟฟ้าทั่วไป");

  const wire = await findOrCreateMaterial("MAT-001", "สายไฟ THW 2.5 sq.mm.", wireCategory.id, "เมตร", 15.5);
  const breaker = await findOrCreateMaterial("MAT-010", "เบรกเกอร์ 20A", protectionCategory.id, "ตัว", 185);
  const conduit = await findOrCreateMaterial("MAT-011", "ท่อร้อยสายไฟ PVC 1/2 นิ้ว", conduitCategory.id, "เส้น", 42);
  const socket = await findOrCreateMaterial("MAT-012", "ปลั๊กไฟ 3 ตา", fittingCategory.id, "ชุด", 65);
  const switchItem = await findOrCreateMaterial("MAT-013", "สวิตช์ไฟ 1 ทาง", fittingCategory.id, "ตัว", 38);

  const supplierA = await findOrCreateSupplier("ซัพพลายเออร์ทดสอบ");
  const supplierB = await findOrCreateSupplier("บริษัท ไฟฟ้าไทย จำกัด");
  const supplierC = await findOrCreateSupplier("ห้างหุ้นส่วน วัสดุก่อสร้างรุ่งเรือง");

  // --- 3 sites, each its own customer + project + SITE warehouse ---
  const customer1 = await findOrCreateCustomer("บริษัท สร้างบ้าน จำกัด");
  const customer2 = await findOrCreateCustomer("บริษัท คอนโดมิเนียม กรุงเทพ จำกัด");
  const customer3 = await findOrCreateCustomer("การไฟฟ้าส่วนภูมิภาค (โครงการขยายเขต)");

  const project1 = await prisma.project.create({
    data: {
      code: "PRJ-DEMO-A",
      name: "โครงการบ้านจัดสรร สุขุมวิท 101",
      customerId: customer1.id,
      startDate: new Date("2026-05-01"),
      contractValue: 4500000,
      status: "IN_PROGRESS",
    },
  });
  const project2 = await prisma.project.create({
    data: {
      code: "PRJ-DEMO-B",
      name: "โครงการคอนโด ริเวอร์ไซด์ ทาวเวอร์",
      customerId: customer2.id,
      startDate: new Date("2026-04-15"),
      contractValue: 12000000,
      status: "IN_PROGRESS",
    },
  });
  const project3 = await prisma.project.create({
    data: {
      code: "PRJ-DEMO-C",
      name: "โครงการขยายเขตไฟฟ้า อ.บางบัวทอง",
      customerId: customer3.id,
      startDate: new Date("2026-06-01"),
      contractValue: 2800000,
      status: "IN_PROGRESS",
    },
  });

  const siteA = await prisma.warehouse.create({
    data: { name: "ไซต์ A - บ้านจัดสรรสุขุมวิท", type: "SITE", projectId: project1.id },
  });
  const siteB = await prisma.warehouse.create({
    data: { name: "ไซต์ B - คอนโดริเวอร์ไซด์", type: "SITE", projectId: project2.id },
  });
  const siteC = await prisma.warehouse.create({
    data: { name: "ไซต์ C - ขยายเขตบางบัวทอง", type: "SITE", projectId: project3.id },
  });

  // --- Grant the baseline test employees access to all 3 new sites ---
  for (const site of [siteA, siteB, siteC]) {
    for (const employee of [requester, approver, storekeeper, purchasing, admin]) {
      await createSiteAccess(employee.id, site.id);
    }
  }

  // --- Seed initial stock per site so fulfillment has something to draw from ---
  for (const site of [siteA, siteB, siteC]) {
    for (const [material, qty] of [
      [wire, 300],
      [breaker, 40],
      [conduit, 150],
      [socket, 60],
      [switchItem, 60],
    ] as const) {
      await prisma.stockTransaction.create({
        data: {
          type: "RECEIVE",
          materialId: material.id,
          warehouseId: site.id,
          quantityChange: qty,
          unitCost: material.standardCost,
          refDocType: "SEED_DEMO",
          refDocId: `SEED_DEMO_STOCK_${site.id}_${material.id}`,
          performedById: admin.id,
        },
      });
    }
  }

  // --- Material issues: 3 per site, varied outcomes across the 5 possible statuses ---
  async function issueFulfilled(projectId: string, warehouseId: string, materialId: string, qty: number) {
    const issue = await createMaterialIssue({ projectId, warehouseId, items: [{ materialId, requestedQty: qty }] }, requester.id, "127.0.0.1", null);
    await approveMaterialIssue(issue.id, approver.id, {}, null);
    await fulfillMaterialIssue(issue.id, storekeeper.id, "127.0.0.1", null);
  }

  async function issuePendingApproval(projectId: string, warehouseId: string, materialId: string, qty: number) {
    await createMaterialIssue({ projectId, warehouseId, items: [{ materialId, requestedQty: qty }] }, requester.id, "127.0.0.1", null);
  }

  async function issueRejected(projectId: string, warehouseId: string, materialId: string, qty: number, reason: string) {
    const issue = await createMaterialIssue({ projectId, warehouseId, items: [{ materialId, requestedQty: qty }] }, requester.id, "127.0.0.1", null);
    await rejectMaterialIssue(issue.id, approver.id, { reason }, null);
  }

  async function issueApprovedOnly(projectId: string, warehouseId: string, materialId: string, qty: number) {
    const issue = await createMaterialIssue({ projectId, warehouseId, items: [{ materialId, requestedQty: qty }] }, requester.id, "127.0.0.1", null);
    await approveMaterialIssue(issue.id, approver.id, {}, null);
  }

  async function issuePartiallyFulfilled(projectId: string, warehouseId: string, materialId: string, requestQty: number) {
    // Request more than the seeded stock so fulfill can only issue part of it.
    const issue = await createMaterialIssue({ projectId, warehouseId, items: [{ materialId, requestedQty: requestQty }] }, requester.id, "127.0.0.1", null);
    await approveMaterialIssue(issue.id, approver.id, {}, null);
    await fulfillMaterialIssue(issue.id, storekeeper.id, "127.0.0.1", null);
  }

  // Site A: fulfilled, pending approval, partially fulfilled (shortfall — requests more wire than the 300m seeded)
  await issueFulfilled(project1.id, siteA.id, breaker.id, 8);
  await issuePendingApproval(project1.id, siteA.id, socket.id, 15);
  await issuePartiallyFulfilled(project1.id, siteA.id, wire.id, 500);

  // Site B: fulfilled, approved-not-yet-fulfilled, rejected
  await issueFulfilled(project2.id, siteB.id, conduit.id, 40);
  await issueApprovedOnly(project2.id, siteB.id, switchItem.id, 20);
  await issueRejected(project2.id, siteB.id, breaker.id, 25, "งบประมาณไตรมาสนี้เต็มแล้ว");

  // Site C: pending approval, fulfilled, rejected
  await issuePendingApproval(project3.id, siteC.id, wire.id, 80);
  await issueFulfilled(project3.id, siteC.id, socket.id, 10);
  await issueRejected(project3.id, siteC.id, conduit.id, 60, "รอยืนยันสเปกจากวิศวกรก่อน");

  // --- 5 purchase orders, varied lifecycle stages ---
  // PO1: left as DRAFT
  await createPurchaseOrderWithValidation(
    { supplierId: supplierA.id, items: [{ materialId: wire.id, orderedQty: 200, unitCost: 15.8 }] },
    purchasing.id,
    "127.0.0.1",
  );

  // PO2: marked ORDERED, nothing received yet
  const po2 = await createPurchaseOrderWithValidation(
    { supplierId: supplierB.id, items: [{ materialId: breaker.id, orderedQty: 50, unitCost: 180 }] },
    purchasing.id,
    "127.0.0.1",
  );
  await updatePurchaseOrderStatus(po2.id, { status: "ORDERED" });

  // PO3: ORDERED then fully received -> RECEIVED
  const po3 = await createPurchaseOrderWithValidation(
    { supplierId: supplierC.id, items: [{ materialId: conduit.id, orderedQty: 100, unitCost: 41 }] },
    purchasing.id,
    "127.0.0.1",
  );
  await updatePurchaseOrderStatus(po3.id, { status: "ORDERED" });
  await createGoodsReceiveWithValidation(
    { warehouseId: siteA.id, purchaseOrderId: po3.id, items: [{ materialId: conduit.id, quantity: 100, unitCost: 41 }] },
    storekeeper.id,
    "127.0.0.1",
    null,
  );

  // PO4: ORDERED then partially received -> PARTIALLY_RECEIVED
  const po4 = await createPurchaseOrderWithValidation(
    { supplierId: supplierA.id, items: [{ materialId: socket.id, orderedQty: 80, unitCost: 63 }] },
    purchasing.id,
    "127.0.0.1",
  );
  await updatePurchaseOrderStatus(po4.id, { status: "ORDERED" });
  await createGoodsReceiveWithValidation(
    { warehouseId: siteB.id, purchaseOrderId: po4.id, items: [{ materialId: socket.id, quantity: 30, unitCost: 63 }] },
    storekeeper.id,
    "127.0.0.1",
    null,
  );

  // PO5: CANCELLED
  const po5 = await createPurchaseOrderWithValidation(
    { supplierId: supplierB.id, items: [{ materialId: switchItem.id, orderedQty: 40, unitCost: 37 }] },
    purchasing.id,
    "127.0.0.1",
  );
  await updatePurchaseOrderStatus(po5.id, { status: "CANCELLED" });

  console.log("Demo data seeded:", {
    sites: [siteA.name, siteB.name, siteC.name],
    projects: [project1.code, project2.code, project3.code],
    materialIssues: "9 total (3 per site, varied statuses)",
    purchaseOrders: "5 total (DRAFT, ORDERED, RECEIVED, PARTIALLY_RECEIVED, CANCELLED)",
  });
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
