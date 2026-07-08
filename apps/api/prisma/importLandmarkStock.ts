import "dotenv/config";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] as string });
const prisma = new PrismaClient({ adapter });

const EXCEL_PATH = process.env["LANDMARK_EXCEL_PATH"];
if (!EXCEL_PATH) {
  throw new Error("LANDMARK_EXCEL_PATH environment variable is not set — point it at the source .xlsx file");
}
const ADMIN_EMAIL = "admin@meestock.local";

const UNIT_BY_CATEGORY: Record<string, string> = {
  "ท่อ": "เส้น",
  "box": "กล่อง",
  "ราง": "เมตร",
  "ราง TRAY": "เมตร",
  "สิ้นเปลือง": "ชิ้น",
  "กราวด์": "ชิ้น",
  "เหล็ก": "เส้น",
  "สายไฟ": "เมตร",
  "Switch": "ตัว",
  "หางปลา": "ตัว",
  "HDPE": "เส้น",
  "อื่นๆ": "ชิ้น",
};
const FALLBACK_UNIT = "ชิ้น";
const UNCATEGORIZED = "อื่นๆ";

function cellText(cell: ExcelJS.Cell | undefined): string {
  const v = cell?.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in (v as any)) {
    return (v as any).richText.map((r: any) => r.text).join("").trim();
  }
  if (typeof v === "object" && "result" in (v as any)) {
    return String((v as any).result ?? "").trim();
  }
  return String(v).trim();
}

function cellNumber(cell: ExcelJS.Cell | undefined): number | null {
  const v = cell?.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && "result" in (v as any)) {
    const r = (v as any).result;
    return typeof r === "number" ? r : null;
  }
  if (v instanceof Date) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function cellDate(cell: ExcelJS.Cell | undefined): Date | null {
  const v = cell?.value;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const msPerDay = 86400000;
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + v * msPerDay);
  }
  return null;
}

interface MaterialRow {
  seq: number;
  name: string;
  size: string | null;
  category: string;
  opening: number | null;
  price: number;
}

async function main() {
  const admin = await prisma.employee.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) throw new Error(`Admin employee ${ADMIN_EMAIL} not found - run clearTestData first`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const sumSheet = wb.getWorksheet("SUM")!;
  const rabSheet = wb.getWorksheet("รับ")!;

  // ---- Parse SUM sheet: material catalog + opening balance ----
  const materials: MaterialRow[] = [];
  const categoriesSeen = new Set<string>();

  sumSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const seq = cellNumber(row.getCell(1));
    if (seq === null) return;
    const namePart = cellText(row.getCell(2));
    const subtypePart = cellText(row.getCell(3));
    const sizePart = cellText(row.getCell(4));
    const category = cellText(row.getCell(5)) || UNCATEGORIZED;
    const opening = cellNumber(row.getCell(6));
    const price = cellNumber(row.getCell(10)) ?? 0;
    const discountPct = cellNumber(row.getCell(11)) ?? 0;

    const name = [namePart, subtypePart, sizePart].filter(Boolean).join(" ").trim() || `รายการ ${seq}`;
    categoriesSeen.add(category);

    materials.push({
      seq,
      name,
      size: sizePart || null,
      category,
      opening,
      price: Number((price * (1 - discountPct / 100)).toFixed(2)),
    });
  });

  console.log(`Parsed ${materials.length} material rows from SUM sheet`);

  // ---- Master data: Customer / Project / Warehouse ----
  const customer = await prisma.customer.create({
    data: { id: randomUUID(), name: "Project Landmark" },
  });
  const project = await prisma.project.create({
    data: {
      id: randomUUID(),
      code: "PRJ-LANDMARK",
      name: "Project Landmark",
      customerId: customer.id,
      startDate: new Date("2025-07-01T00:00:00Z"),
      contractValue: 0,
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { id: randomUUID(), name: "Project Landmark", type: "SITE", projectId: project.id },
  });

  // ---- Categories ----
  const categoryIdByName = new Map<string, string>();
  for (const name of categoriesSeen) {
    const cat = await prisma.category.create({ data: { id: randomUUID(), name } });
    categoryIdByName.set(name, cat.id);
  }

  // ---- Materials ----
  const materialIdBySeq = new Map<number, string>();
  const materialData = materials.map((m, idx) => {
    const id = randomUUID();
    materialIdBySeq.set(m.seq, id);
    const unit = UNIT_BY_CATEGORY[m.category] ?? FALLBACK_UNIT;
    return {
      id,
      code: `LM-${String(idx + 1).padStart(4, "0")}`,
      name: m.name,
      size: m.size,
      categoryId: categoryIdByName.get(m.category)!,
      unit,
      standardCost: m.price,
    };
  });
  await prisma.material.createMany({ data: materialData });
  console.log(`Created ${materialData.length} materials`);

  // ---- Opening balance transactions (ADJUSTMENT) ----
  const openingTx = materials
    .filter((m) => m.opening !== null && m.opening !== 0)
    .map((m) => {
      const materialId = materialIdBySeq.get(m.seq)!;
      const material = materialData.find((md) => md.id === materialId)!;
      return {
        id: randomUUID(),
        date: new Date("2025-07-01T00:00:00Z"),
        type: "ADJUSTMENT" as const,
        materialId,
        warehouseId: warehouse.id,
        projectId: project.id,
        quantityChange: m.opening as number,
        unitCost: material.standardCost,
        refDocType: "EXCEL_IMPORT_OPENING",
        refDocId: material.code,
        performedById: admin.id,
      };
    });

  // ---- Receive transactions from รับ sheet ----
  const dateColByIndex = new Map<number, Date>();
  const headerRow = rabSheet.getRow(1);
  for (let col = 7; col <= headerRow.cellCount; col++) {
    const d = cellDate(headerRow.getCell(col));
    if (d) dateColByIndex.set(col, d);
  }

  const receiveTx: any[] = [];
  rabSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const seq = cellNumber(row.getCell(1));
    if (seq === null) return;
    const materialId = materialIdBySeq.get(seq);
    if (!materialId) return;
    const material = materialData.find((md) => md.id === materialId)!;

    for (const [col, date] of dateColByIndex) {
      const qty = cellNumber(row.getCell(col));
      if (!qty || qty <= 0) continue;
      receiveTx.push({
        id: randomUUID(),
        date,
        type: "RECEIVE" as const,
        materialId,
        warehouseId: warehouse.id,
        projectId: project.id,
        quantityChange: qty,
        unitCost: material.standardCost,
        refDocType: "EXCEL_IMPORT_RECEIVE",
        refDocId: `${material.code}_${date.toISOString().slice(0, 10)}`,
        performedById: admin.id,
      });
    }
  });

  console.log(`Prepared ${openingTx.length} opening-balance transactions, ${receiveTx.length} receive transactions`);

  const allTx = [...openingTx, ...receiveTx];
  const CHUNK = 500;
  for (let i = 0; i < allTx.length; i += CHUNK) {
    await prisma.stockTransaction.createMany({ data: allTx.slice(i, i + CHUNK) });
  }
  console.log(`Inserted ${allTx.length} stock transactions`);

  console.log("Import complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
