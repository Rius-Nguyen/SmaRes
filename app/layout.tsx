import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/app/context/CartContext";
import { ToastProvider } from "@/components/ui/Toast";
import AppShell from "@/components/AppShell";

const playfairDisplay = Playfair_Display({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmaRes - Nhà Hàng Ẩm Thực Việt Nam Đương Đại",
  description: "Trải nghiệm ẩm thực tinh tế, đặt bàn và xem thực đơn thông minh tại SmaRes Gastronomy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${playfairDisplay.variable} ${beVietnamPro.variable}`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col antialiased bg-[#faf8f5] text-[#1c1917] font-sans selection:bg-[#dcfce7] selection:text-[#14532d]">
        <CartProvider>
          <ToastProvider>
            <AppShell>
              {children}
            </AppShell>
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
