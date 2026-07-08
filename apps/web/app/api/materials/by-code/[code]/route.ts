import { NextResponse } from "next/server";
import type { Material } from "shared-types";
import { apiFetch, ApiError } from "../../../../../lib/api";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  try {
    const material = await apiFetch<Material>(`/materials/by-code/${encodeURIComponent(params.code)}`);
    return NextResponse.json(material);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    }
    throw err;
  }
}
