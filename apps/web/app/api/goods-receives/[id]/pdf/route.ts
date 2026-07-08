import { renderToBuffer } from "@react-pdf/renderer";
import type { GoodsReceive } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { GoodsReceivePdf } from "../../../../../lib/pdf/GoodsReceivePdf";
import { registerFonts } from "../../../../../lib/pdf/fonts";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let goodsReceive: GoodsReceive;
  try {
    goodsReceive = await apiFetch<GoodsReceive>(`/goods-receives/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }

  registerFonts();
  const buffer = await renderToBuffer(GoodsReceivePdf({ goodsReceive }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${goodsReceive.docNo}.pdf"`,
    },
  });
}
