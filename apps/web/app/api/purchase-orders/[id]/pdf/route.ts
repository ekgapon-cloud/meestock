import { renderToBuffer } from "@react-pdf/renderer";
import type { PurchaseOrder } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { PurchaseOrderPdf } from "../../../../../lib/pdf/PurchaseOrderPdf";
import { registerFonts } from "../../../../../lib/pdf/fonts";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let po: PurchaseOrder;
  try {
    po = await apiFetch<PurchaseOrder>(`/purchase-orders/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }

  registerFonts();
  const buffer = await renderToBuffer(PurchaseOrderPdf({ po }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${po.docNo}.pdf"`,
    },
  });
}
