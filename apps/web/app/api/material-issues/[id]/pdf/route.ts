import { renderToBuffer } from "@react-pdf/renderer";
import type { MaterialIssue } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";
import { MaterialIssuePdf } from "../../../../../lib/pdf/MaterialIssuePdf";
import { registerFonts } from "../../../../../lib/pdf/fonts";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let issue: MaterialIssue;
  try {
    issue = await apiFetch<MaterialIssue>(`/material-issues/${params.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }

  registerFonts();
  const buffer = await renderToBuffer(MaterialIssuePdf({ issue }));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${issue.docNo}.pdf"`,
    },
  });
}
