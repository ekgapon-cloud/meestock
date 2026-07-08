import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Sarabun is the standard font for Thai official/business documents. react-pdf's built-in
// fonts (Helvetica etc.) have no Thai glyphs at all, so a real font must be registered.
// Static weight files only (not the variable-font build) — react-pdf/fontkit embeds a
// single fixed instance per registration, and variable fonts don't reliably resolve to
// the right weight that way.
let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;

  const fontDir = path.join(process.cwd(), "public/fonts");
  Font.register({
    family: "Sarabun",
    fonts: [
      { src: path.join(fontDir, "Sarabun-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontDir, "Sarabun-Medium.ttf"), fontWeight: "medium" },
      { src: path.join(fontDir, "Sarabun-Bold.ttf"), fontWeight: "bold" },
    ],
  });

  // react-pdf's default word-hyphenation logic assumes Latin scripts and can needlessly
  // split Thai words at line-wrap points — disable it.
  Font.registerHyphenationCallback((word) => [word]);
}
