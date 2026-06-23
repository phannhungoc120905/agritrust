import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "../components/shared/WalletContextProvider";
import { AuthProvider } from "../hooks/useAuth";
import AgentationWrapper from "../components/AgentationWrapper";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgriTrust — Nền tảng Ký quỹ Giao dịch Nông sản B2B thông minh",
  description: "Kết hợp đàm phán hội thoại AI và Hợp đồng thông minh Solana bảo đảm quyền lợi giao thương cho Nông dân và Thương lái.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
  suppressHydrationWarning
  className="min-h-full flex flex-col bg-white text-neutral-900"
>
  <WalletContextProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </WalletContextProvider>

  {process.env.NODE_ENV === "development" && (
    <AgentationWrapper />
  )}
</body>
    </html>
  );
}
