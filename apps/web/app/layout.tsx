import type { Metadata } from "next";
import "../styles/globals.css";
import { Inter } from "next/font/google";
import { cn } from "@execsuite/ui";
import { Providers } from "../providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ExecSuite Control",
  description: "Field-proven construction operations control center"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-slate-50 text-slate-900", inter.variable)}>
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
            <header className="flex items-center justify-between pb-8">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">ExecSuite Control</h1>
                <p className="text-sm text-slate-500">Projects, look-ahead, and field ops at a glance</p>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-500">
                <span>{process.env.NEXT_PUBLIC_ENV_LABEL ?? "Preview"}</span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              </div>
            </header>
            <main className="flex-1 pb-12">{children}</main>
            <footer className="border-t border-slate-200 pt-6 text-xs text-slate-500">
              &copy; {new Date().getFullYear()} ExecSuite. Operational excellence for field teams.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
