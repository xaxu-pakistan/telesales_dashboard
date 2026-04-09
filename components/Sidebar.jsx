"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Menu, X, Box as BoxIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Sidebar({ role }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/returns", label: "Returns", icon: BoxIcon },
  ];

  if (role === "super admin") {
    links.push({ href: "/users", label: "Manage Users", icon: Users });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border/50 shadow-sm w-64 lg:w-72 transition-all duration-300 relative z-40">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
          XAXU Admin
        </h2>
        {role && (
          <div className="mt-2 text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary w-fit capitalize border border-primary/20">
            {role}
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-md"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm"
              }`}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-6 left-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-background shadow-md border-border/50 rounded-xl"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>
    </>
  );
}
