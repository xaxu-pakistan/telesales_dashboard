"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children, role }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <main className="flex-1 w-full lg:max-w-[calc(100vw-18rem)] relative overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
