import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "slidein — 管理画面",
  description: "DM自動化 管理ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="dark">
      <body className="flex min-h-screen">
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
