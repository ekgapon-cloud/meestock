import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type WarehouseType } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

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

async function findOrCreateWarehouse(name: string, type: WarehouseType, projectId?: string) {
  const existing = await prisma.warehouse.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.warehouse.create({ data: { name, type, ...(projectId ? { projectId } : {}) } });
}

async function findOrCreateSupplier(name: string) {
  const existing = await prisma.supplier.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.supplier.create({ data: { name } });
}

async function main() {
  const category = await findOrCreateCategory("สายไฟ");
  const customer = await findOrCreateCustomer("ลูกค้าทดสอบ");
  const supplier = await findOrCreateSupplier("ซัพพลายเออร์ทดสอบ");

  const project = await prisma.project.upsert({
    where: { code: "PRJ-001" },
    update: {},
    create: {
      code: "PRJ-001",
      name: "โครงการทดสอบ",
      customerId: customer.id,
      startDate: new Date(),
      contractValue: 1000000,
      status: "IN_PROGRESS",
    },
  });

  const centralWarehouse = await findOrCreateWarehouse("คลังกลาง", "CENTRAL");
  const siteWarehouse = await findOrCreateWarehouse("ไซต์ทดสอบ", "SITE", project.id);

  const material = await prisma.material.upsert({
    where: { code: "MAT-001" },
    update: {},
    create: {
      code: "MAT-001",
      name: "สายไฟ THW 2.5 sq.mm.",
      categoryId: category.id,
      unit: "เมตร",
      standardCost: 15.5,
    },
  });

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.employee.upsert({
    where: { email: "admin@meestock.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@meestock.local",
      role: "WAREHOUSE",
      accessLevel: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  const storekeeperPasswordHash = await bcrypt.hash("Store123!", 10);
  const storekeeper = await prisma.employee.upsert({
    where: { email: "storekeeper@meestock.local" },
    update: {},
    create: {
      name: "ทดสอบ คลังไซต์",
      email: "storekeeper@meestock.local",
      role: "WAREHOUSE",
      accessLevel: "STAFF",
      passwordHash: storekeeperPasswordHash,
    },
  });

  await prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId: storekeeper.id, warehouseId: siteWarehouse.id } },
    update: {},
    create: { employeeId: storekeeper.id, warehouseId: siteWarehouse.id },
  });

  const requesterPasswordHash = await bcrypt.hash("Request123!", 10);
  const requester = await prisma.employee.upsert({
    where: { email: "requester@meestock.local" },
    update: {},
    create: {
      name: "ทดสอบ ผู้เบิก",
      email: "requester@meestock.local",
      role: "REQUESTER",
      accessLevel: "STAFF",
      passwordHash: requesterPasswordHash,
    },
  });

  await prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId: requester.id, warehouseId: siteWarehouse.id } },
    update: {},
    create: { employeeId: requester.id, warehouseId: siteWarehouse.id },
  });

  const approverPasswordHash = await bcrypt.hash("Approve123!", 10);
  const approver = await prisma.employee.upsert({
    where: { email: "approver@meestock.local" },
    update: {},
    create: {
      name: "ทดสอบ ผู้อนุมัติ",
      email: "approver@meestock.local",
      role: "APPROVER",
      accessLevel: "STAFF",
      passwordHash: approverPasswordHash,
    },
  });

  await prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId: approver.id, warehouseId: siteWarehouse.id } },
    update: {},
    create: { employeeId: approver.id, warehouseId: siteWarehouse.id },
  });

  const executivePasswordHash = await bcrypt.hash("Executive123!", 10);
  const executive = await prisma.employee.upsert({
    where: { email: "executive@meestock.local" },
    update: {},
    create: {
      name: "ทดสอบ ผู้บริหาร",
      email: "executive@meestock.local",
      role: "EXECUTIVE",
      accessLevel: "MANAGER",
      passwordHash: executivePasswordHash,
    },
  });

  await prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId: executive.id, warehouseId: siteWarehouse.id } },
    update: {},
    create: { employeeId: executive.id, warehouseId: siteWarehouse.id },
  });

  const purchasingPasswordHash = await bcrypt.hash("Purchasing123!", 10);
  const purchasing = await prisma.employee.upsert({
    where: { email: "purchasing@meestock.local" },
    update: {},
    create: {
      name: "ทดสอบ ฝ่ายจัดซื้อ",
      email: "purchasing@meestock.local",
      role: "PURCHASING",
      accessLevel: "STAFF",
      passwordHash: purchasingPasswordHash,
    },
  });

  await prisma.userSiteAccess.upsert({
    where: { employeeId_warehouseId: { employeeId: purchasing.id, warehouseId: siteWarehouse.id } },
    update: {},
    create: { employeeId: purchasing.id, warehouseId: siteWarehouse.id },
  });

  const existingStock = await prisma.stockTransaction.findFirst({
    where: { materialId: material.id, warehouseId: siteWarehouse.id, refDocId: "SEED_INITIAL_STOCK" },
  });
  if (!existingStock) {
    await prisma.stockTransaction.create({
      data: {
        type: "RECEIVE",
        materialId: material.id,
        warehouseId: siteWarehouse.id,
        quantityChange: 500,
        unitCost: material.standardCost,
        refDocType: "SEED",
        refDocId: "SEED_INITIAL_STOCK",
        performedById: admin.id,
      },
    });
  }

  console.log("Seed complete:", {
    admin: { email: admin.email, password: "Admin123!" },
    storekeeper: { email: storekeeper.email, password: "Store123!", siteWarehouseId: siteWarehouse.id },
    requester: { email: requester.email, password: "Request123!" },
    approver: { email: approver.email, password: "Approve123!" },
    executive: { email: executive.email, password: "Executive123!" },
    purchasing: { email: purchasing.email, password: "Purchasing123!" },
    centralWarehouseId: centralWarehouse.id,
    siteWarehouseId: siteWarehouse.id,
    projectId: project.id,
    materialId: material.id,
    supplierId: supplier.id,
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
