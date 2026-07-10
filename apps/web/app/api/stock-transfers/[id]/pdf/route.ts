import { renderToBuffer } from "@react-pdf/renderer";
import type { StockTransfer } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { registerFonts } from "../../../../../lib/pdf/fonts";
import { StockTransferPdf } from "../../../../../lib/pdf/StockTransferPdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let transfer: StockTransfer;
  try {
    transfer = await apiFetch<StockTransfer>(`/stock-transfers/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }

  registerFonts();
  const buffer = await renderToBuffer(StockTransferPdf({ transfer }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${transfer.docNo}.pdf"`,
    },
  });
}
