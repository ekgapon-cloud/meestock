import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { getAccessibleWarehouseIds } from "../services/accessControlService.js";
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

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Authentication required");
  }
  return req.user;
}

export async function listMaterialsHandler(req: Request, res: Response) {
  const user = requireUser(req);
  const query = listMaterialsQuerySchema.parse(req.query);
  const accessibleWarehouseIds = await getAccessibleWarehouseIds(user.id, user.accessLevel);
  const result = await listMaterials(query, accessibleWarehouseIds);
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
