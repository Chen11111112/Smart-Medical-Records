import type { Metadata } from "next";
import "@/styles/main.scss";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Emergency Web",
  description: "Emergency medical record interface",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
