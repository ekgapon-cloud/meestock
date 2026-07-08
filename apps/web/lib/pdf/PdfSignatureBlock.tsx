import { Text, View } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

interface SignatureSlot {
  label: string;
  name?: string;
}

export function PdfSignatureBlock({ slots }: { slots: SignatureSlot[] }) {
  return (
    <View style={pdfStyles.signatureBlock}>
      {slots.map((slot) => (
        <View style={pdfStyles.signatureSlot} key={slot.label}>
          <View style={pdfStyles.signatureLine} />
          <Text style={pdfStyles.signatureName}>{slot.name || " "}</Text>
          <Text style={pdfStyles.signatureLabel}>{slot.label}</Text>
          <Text style={pdfStyles.signatureDate}>วันที่ ____ / ____ / ____</Text>
        </View>
      ))}
    </View>
  );
}
