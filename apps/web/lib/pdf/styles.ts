import { StyleSheet } from "@react-pdf/renderer";

// Same brand colors as app/globals.css (sampled from the company logo).
export const COLORS = {
  primary: "#cc0812",
  gold: "#fdbc02",
  goldBg: "#fdf3d9",
  text: "#1a1d23",
  textMuted: "#6b6459",
  border: "#c9c2b5",
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 10,
    color: COLORS.text,
    padding: 36,
  },
  letterhead: {
    justifyContent: "center",
    minHeight: 44,
    paddingLeft: 56,
    borderBottom: `2px solid ${COLORS.text}`,
    paddingBottom: 10,
    marginBottom: 16,
  },
  // Positioned with `fixed` (page-relative, rendered in a separate pass) — see
  // PdfLetterhead.tsx for why: a normal in-flow <Image> corrupts the first glyph of
  // whatever <Text> renders next, a real @react-pdf/renderer bug reproduced in isolation.
  // `top`/`left` mirror pdfStyles.page's own padding so it lines up with content flow.
  logo: {
    position: "absolute",
    top: 0,
    left: 0,
    // logo-icon.png is 687x655 — keep that aspect ratio so the gear isn't squished
    width: 46,
    height: 44,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "bold",
  },
  companyNameEn: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: "medium",
    color: COLORS.primary,
    backgroundColor: COLORS.goldBg,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  infoTile: {
    flexGrow: 1,
    minWidth: 110,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: 8,
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "medium",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  table: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowBody: {
    flexDirection: "row",
    borderTop: `1px solid ${COLORS.border}`,
  },
  tableHeaderCell: {
    backgroundColor: COLORS.goldBg,
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 9,
    padding: 6,
  },
  tableCell: {
    fontSize: 9,
    padding: 6,
  },
  hint: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 48,
  },
  signatureSlot: {
    flexGrow: 1,
    flexBasis: 0,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  signatureLine: {
    borderTop: `1px solid ${COLORS.textMuted}`,
    width: "100%",
    marginBottom: 6,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: "medium",
    marginBottom: 2,
  },
  signatureLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
  },
  signatureDate: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
