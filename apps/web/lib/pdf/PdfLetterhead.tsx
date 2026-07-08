import path from "node:path";
import { readFileSync } from "node:fs";
import { Image, Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

const LOGO_DATA = readFileSync(path.join(process.cwd(), "public/logo-full.png"));

export function PdfLetterhead() {
  return (
    <View style={pdfStyles.letterhead}>
      {/* `fixed` here isn't for repeat-on-every-page (this doc is one page) — it's a
          workaround for a real @react-pdf/renderer bug: a normal in-flow <Image>
          corrupts the first glyph of whatever <Text> renders next. Rendering it in
          the `fixed` pass instead (page-relative, separate from the main content
          flow) avoids the bug entirely — reproduced and confirmed in isolation. */}
      <Image src={{ data: LOGO_DATA, format: "png" }} style={pdfStyles.logo} fixed />
      <Text style={pdfStyles.companyName}>บริษัท เอ็มดับเบิ้ลอี เอ็นจิเนียริ่ง จำกัด</Text>
      <Text style={pdfStyles.companyNameEn}>M.Double E Engineering Co.,Ltd.</Text>
    </View>
  );
}
