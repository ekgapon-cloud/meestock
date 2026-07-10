import { renderToBuffer } from "@react-pdf/renderer";
import type { StockCount } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { registerFonts } from "../../../../../lib/pdf/fonts";
import { StockCountPdf } from "../../../../../lib/pdf/StockCountPdf";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let count: StockCount;
  try {
    count = await apiFetch<StockCount>(`/stock-counts/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }

  registerFonts();
  const buffer = await renderToBuffer(StockCountPdf({ count }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${count.docNo}.pdf"`,
    },
  });
}
