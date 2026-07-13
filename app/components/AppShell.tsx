"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { House, Persons, Wrench, Xmark } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useAuth } from "../context/AuthContext";
import Nav from "./Nav";

interface NavigationItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
        <House className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold tracking-tight">
          NestOps
        </span>
        <span className="block text-[11px] text-muted">
          Property operations
        </span>
      </span>
    </Link>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isPublicPage = pathname === "/" || pathname === "/auth" || pathname === "/invite";

  if (!user || isPublicPage) return <>{children}</>;

  const navigationItems: NavigationItem[] =
    user.role === "Landlord"
      ? [
          {
            href: "/landlord/properties",
            label: "Properties",
            icon: House,
          },
          {
            href: "/landlord/maintenance-requests",
            label: "Maintenance",
            icon: Wrench,
          },
        ]
      : user.role === "Tenant"
        ? [
            {
              href: "/tenant",
              label: "My unit",
              icon: House,
            },
          ]
        : [
          { href: "/users", label: "Users", icon: Persons },
          { href: "/properties", label: "Properties", icon: House },
          {
            href: "/maintenance-requests",
            label: "Maintenance",
            icon: Wrench,
          },
        ];

  const sidebarContent = (
    <>
      <div className="flex h-18 items-center px-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          Workspace
        </p>
        <nav aria-label="Primary navigation" className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMobileOpen(false)}
                className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted hover:bg-default/50 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${
                    isActive
                      ? "text-background"
                      : "text-muted group-hover:text-foreground"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-default/70 bg-surface lg:flex">
        {sidebarContent}
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside
            aria-label="Mobile navigation"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,86vw)] flex-col border-r border-default/70 bg-surface shadow-2xl"
          >
            <Button
              isIconOnly
              aria-label="Close navigation"
              className="absolute right-3 top-4"
              size="sm"
              variant="tertiary"
              onPress={() => setIsMobileOpen(false)}
            >
              <Xmark className="size-4" />
            </Button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:pl-64">
        <Nav onOpenNavigation={() => setIsMobileOpen(true)} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
