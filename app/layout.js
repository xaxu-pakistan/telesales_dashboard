import { Outfit } from "next/font/google";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppLayout } from "@/components/AppLayout";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "XAXU Dashboard",
  description: "Shopify Customer Follow-up Dashboard",
};

export default async function RootLayout({ children }) {
  // Extract role from the request headers injected by middleware
  const headersList = await headers();
  const role = headersList.get("x-user-role") || null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased bg-background text-foreground selection:bg-primary/20 transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AppLayout role={role}>
              {children}
            </AppLayout>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
