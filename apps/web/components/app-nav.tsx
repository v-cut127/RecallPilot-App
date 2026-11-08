"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@recallpilot/ui";

const links = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/import", label: "Import patients" },
  { href: "/audit", label: "Free audit" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href || (link.href !== "/audit" && pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-[7px] px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-pill text-ink" : "text-muted-foreground hover:bg-card hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
