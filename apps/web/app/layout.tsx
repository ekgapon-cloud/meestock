import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEE Stock",
  description: "ระบบบริหารจัดการสต๊อกวัสดุไฟฟ้าสำหรับงานก่อสร้าง",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
