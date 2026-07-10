/**
 * DTOs describing the apps/api JSON contract, shared with apps/web.
 * Type-only — no runtime code, no build step. Both apps import via `import type`
 * so this file is resolved for type-checking only, never executed at runtime,
 * which sidesteps the two apps using different moduleResolution settings
 * (apps/web: bundler, apps/api: nodenext) — keep this a single file with no
 * internal relative imports so that never becomes a problem here either.
 */

export type EmployeeRole = "REQUESTER" | "APPROVER" | "WAREHOUSE" | "EXECUTIVE" | "PURCHASING";
export type AccessLevel = "STAFF" | "MANAGER" | "ADMIN";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface AuthEmployee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  accessLevel: AccessLevel;
}

export interface LoginResponse {
  token: string;
  employee: AuthEmployee;
}

export interface Me extends AuthEmployee {
  siteAccess: string[] | "ALL";
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
}

/** unitCost/standardCost are `null` when the caller's accessLevel is STAFF — see apps/api's costVisibilityService. */
export interface Material {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  unit: string;
  standardCost: string | null;
  supplierId: string | null;
  reorderPoint: string | null;
  safetyStock: string | null;
  leadTimeDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  supplier: Supplier | null;
}

/** GET /materials/:id and other single-material endpoints don't compute this -- list-only. */
export interface MaterialListItem extends Material {
  remainingQty: number;
}

export interface MaterialListResponse {
  items: MaterialListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EmployeeRef {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  accessLevel: AccessLevel;
}

export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Project {
  id: string;
  code: string;
  name: string;
  customerId: string;
  startDate: string;
  endDate: string | null;
  contractValue: string;
  materialBudget: string | null;
  laborBudget: string | null;
  otherBudget: string | null;
  status: ProjectStatus;
}

export type WarehouseType = "CENTRAL" | "SITE" | "TEMPORARY";

export interface Warehouse {
  id: string;
  name: string;
  type: WarehouseType;
  projectId: string | null;
  /** Only present on the `/warehouses` list response, not on nested references elsewhere. */
  project?: Project | null;
}

export type IssueStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PARTIALLY_FULFILLED" | "FULFILLED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Approval {
  id: string;
  approverId: string;
  approver: EmployeeRef;
  status: ApprovalStatus;
  approvedAt: string | null;
  note: string | null;
}

export interface MaterialIssueItem {
  id: string;
  materialIssueId: string;
  materialId: string;
  requestedQty: string;
  approvedQty: string | null;
  issuedQty: string | null;
  unitCost: string | null;
  isShortfall: boolean;
  shortfallNote: string | null;
  material: Material;
}

export interface MaterialIssue {
  id: string;
  docNo: string;
  date: string;
  projectId: string;
  warehouseId: string;
  requesterId: string;
  approvalId: string | null;
  status: IssueStatus;
  fulfilledById: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  requester: EmployeeRef;
  fulfilledBy: EmployeeRef | null;
  warehouse: Warehouse;
  project: Project;
  approval: Approval | null;
  items: MaterialIssueItem[];
  /** Badge-only SLA flag, computed server-side from createdAt/approval.approvedAt — no notifications exist. */
  isOverdue: boolean;
}

export interface MaterialIssueListResponse {
  items: MaterialIssue[];
  total: number;
  page: number;
  limit: number;
  summary: { countByStatus: Partial<Record<IssueStatus, number>> };
}

export type POStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  materialId: string;
  orderedQty: string;
  receivedQty: string;
  unitCost: string;
  material: Material;
}

export interface PurchaseOrder {
  id: string;
  docNo: string;
  date: string;
  supplierId: string;
  status: POStatus;
  createdById: string;
  createdAt: string;
  supplier: Supplier;
  createdBy: EmployeeRef;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface GoodsReceiveItem {
  id: string;
  goodsReceiveId: string;
  materialId: string;
  quantity: string;
  /** Redacted to null for STAFF accessLevel — see costVisibilityService. */
  unitCost: string | null;
  material: Material;
}

export interface GoodsReceive {
  id: string;
  docNo: string;
  date: string;
  warehouseId: string;
  supplierId: string | null;
  purchaseOrderId: string | null;
  createdById: string;
  createdAt: string;
  warehouse: Warehouse;
  supplier: Supplier | null;
  purchaseOrder: PurchaseOrder | null;
  createdBy: EmployeeRef;
  items: GoodsReceiveItem[];
}

export interface GoodsReceiveListResponse {
  items: GoodsReceive[];
  total: number;
  page: number;
  limit: number;
}

export interface StockTransferItem {
  id: string;
  stockTransferId: string;
  materialId: string;
  quantity: string;
  /** Source warehouse's weighted-avg cost at move time (from the TRANSFER_OUT ledger row). null for STAFF or in list responses. */
  unitCost?: string | null;
  material: Material;
}

export interface StockTransfer {
  id: string;
  docNo: string;
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdById: string;
  createdAt: string;
  fromWarehouse: Warehouse;
  toWarehouse: Warehouse;
  createdBy: EmployeeRef;
  items: StockTransferItem[];
}

export interface StockTransferListResponse {
  items: StockTransfer[];
  total: number;
  page: number;
  limit: number;
}

export interface StockValueItem {
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  warehouseId: string;
  balance: number;
  avgCost: number;
  value: number;
}

export interface StockValueReport {
  items: StockValueItem[];
  totalValue: number;
  valueByWarehouse: { warehouseId: string; value: number }[];
}

/** No cost data — every authenticated user, including STAFF, can read this. */
export interface StockBalanceReport {
  items: { materialId: string; warehouseId: string; balance: number }[];
}

export interface LowStockItem {
  materialId: string;
  materialName: string;
  warehouseId: string;
  balance: number;
  reorderPoint: number;
}

/** No cost data — every authenticated user, including STAFF, can read this. */
export interface LowStockReport {
  items: LowStockItem[];
}

export interface IssueHistoryReport {
  items: MaterialIssue[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalIssuedValue: number;
    countByStatus: Partial<Record<IssueStatus, number>>;
  };
}

export interface SiteAccessEntry {
  id: string;
  employeeId: string;
  warehouseId: string;
  createdAt: string;
  warehouse: Warehouse;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  accessLevel: AccessLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  siteAccess: SiteAccessEntry[];
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface ActiveProjectValueSite {
  warehouseId: string;
  warehouseName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string | null;
  percentage: number;
}

/** Percentage only — no cost data, every authenticated user including STAFF can read this. */
export interface SiteProgressReport {
  sites: ActiveProjectValueSite[];
}

export interface ExecutiveDashboard {
  totalStockValue: number;
  stockValueByWarehouse: { warehouseId: string; warehouseName: string | null; value: number }[];
  monthlyIssueTrend: { month: string; count: number; value: number }[];
  topIssuedMaterials: {
    materialId: string;
    materialCode: string | null;
    materialName: string | null;
    issuedQty: number;
    remainingQty: number;
  }[];
  topCostSites: { warehouseId: string; warehouseName: string | null; cost: number }[];
  lowStockMaterials: LowStockItem[];
  /** Money figures included — MANAGER/ADMIN accessLevel only, see costVisibilityService. */
  activeProjectValueBreakdown: {
    totalValue: number;
    sites: (ActiveProjectValueSite & { value: number })[];
  };
}

export interface StaffDashboard {
  weekStart: string;
  monthStart: string;
  issuesThisWeek: number;
  issuesThisMonth: number;
  receivesThisWeek: number;
  receivesThisMonth: number;
  issueStatusBreakdownThisMonth: Record<string, number>;
  topIssuedMaterialsThisWeek: { materialId: string; materialCode: string | null; materialName: string | null; issuedQty: number }[];
  topIssuedMaterialsThisMonth: { materialId: string; materialCode: string | null; materialName: string | null; issuedQty: number }[];
  lowStockCount: number;
  lowStockMaterials: LowStockItem[];
  overdueIssuesCount: number;
  /** Percentage only — no `value`/`totalValue`, since STAFF accessLevel must never see cost data. */
  activeProjectValueBreakdown: {
    sites: ActiveProjectValueSite[];
  };
}

export interface SiteFinancialSummary {
  warehouseId: string;
  warehouseName: string;
  projectId: string | null;
  projectName: string | null;
  projectCode: string | null;
  contractValue: number | null;
  materialBudget: number | null;
  remainingValue: number;
  issuedValue: number;
  receivedValue: number;
  lowStockCount: number;
  budgetUtilizationPct: number | null;
}

export interface SiteFinancialSummaryReport {
  sites: SiteFinancialSummary[];
  totals: {
    totalRemainingValue: number;
    totalIssuedValue: number;
    totalReceivedValue: number;
    totalLowStockCount: number;
  };
  dateFrom: string | null;
  dateTo: string | null;
}
