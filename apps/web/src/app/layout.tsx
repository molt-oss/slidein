import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "slidein — Admin",
  description: "DM automation admin dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
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
