import { findSuppliers } from "../repositories/supplierRepository.js";

export function listSuppliers() {
  return findSuppliers();
}
