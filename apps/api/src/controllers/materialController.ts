import type { Request, Response } from "express";
import {
  createMaterialSchema,
  listMaterialsQuerySchema,
  updateMaterialSchema,
} from "../validation/materialSchema.js";
import {
  createMaterialWithValidation,
  deactivateMaterial,
  getMaterial,
  getMaterialByCode,
  listMaterials,
  listMaterialUnits,
  updateMaterialWithValidation,
} from "../services/materialService.js";

export async function listMaterialsHandler(req: Request, res: Response) {
  const query = listMaterialsQuerySchema.parse(req.query);
  const result = await listMaterials(query);
  res.json(result);
}

export async function listMaterialUnitsHandler(_req: Request, res: Response) {
  const units = await listMaterialUnits();
  res.json(units);
}

export async function getMaterialHandler(req: Request, res: Response) {
  const material = await getMaterial(req.params["id"] as string);
  res.json(material);
}

export async function getMaterialByCodeHandler(req: Request, res: Response) {
  const material = await getMaterialByCode(req.params["code"] as string);
  res.json(material);
}

export async function createMaterialHandler(req: Request, res: Response) {
  const input = createMaterialSchema.parse(req.body);
  const material = await createMaterialWithValidation(input);
  res.status(201).json(material);
}

export async function updateMaterialHandler(req: Request, res: Response) {
  const input = updateMaterialSchema.parse(req.body);
  const material = await updateMaterialWithValidation(req.params["id"] as string, input);
  res.json(material);
}

export async function deleteMaterialHandler(req: Request, res: Response) {
  await deactivateMaterial(req.params["id"] as string);
  res.status(204).send();
}
