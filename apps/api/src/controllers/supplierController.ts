import type { Request, Response } from "express";
import { listSuppliers } from "../services/supplierService.js";

export async function listSuppliersHandler(_req: Request, res: Response) {
  const suppliers = await listSuppliers();
  res.json(suppliers);
}
