"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Blocks,
  CalendarDays,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  Command,
  CornerDownLeft,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@recallpilot/ui";
import { signOutAction } from "@/lib/auth-actions";
import { timeAgo } from "@/lib/format";
import { Avatar, Kbd } from "./ui";
import { DropdownMenu, type DropdownItem } from "./client-ui";

export interface ShellUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface ShellOrg {
  id: string;
  name: string;
  slug: string;
}

export interface ShellLocation {
  id: string;
  name: string;
  city: string | null;
}

export interface ShellNotification {
  id: string;
  kind: "message" | "revenue" | "recall" | "system";
  title: string;
  detail: string;
  at: Date;
}

export interface ShellSearchPatient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { href: "/app/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/app/patients", label: "Patients", icon: Users },
      { href: "/app/campaigns", label: "Recall campaigns", icon: Megaphone },
      { href: "/app/conversations", label: "Conversations", icon: MessageSquare },
      { href: "/app/appointments", label: "Appointments", icon: CalendarDays },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/app/revenue", label: "Revenue recovery", icon: CircleDollarSign },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/app/assistant", label: "AI assistant", icon: Sparkles },
      { href: "/app/integrations", label: "Integrations", icon: Blocks },
    ],
  },
];

const BOTTOM_LINKS: NavItem[] = [
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/help", label: "Help & support", icon: LifeBuoy },
];

const SEGMENT_LABELS: Record<string, string> = {
  overview: "Overview",
  dashboard: "Overview",
  patients: "Patients",
  campaigns: "Recall campaigns",
  conversations: "Conversations",
  appointments: "Appointments",
  analytics: "Analytics",
  revenue: "Revenue recovery",
  assistant: "AI assistant",
  integrations: "Integrations",
  settings: "Settings",
  help: "Help & support",
  profile: "Profile",
  import: "Import patients",
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navBadge(href: string, dueCount: number, unreadCount: number): string | undefined {
  if (href === "/app/patients" && dueCount > 0) return dueCount > 999 ? `${Math.round(dueCount / 100) / 10}k` : String(dueCount);
  if (href === "/app/conversations" && unreadCount > 0) return String(unreadCount);
  return undefined;
}

export function AppShell({
  user,
  org,
  locations,
  dueCount,
  unreadCount,
  searchPatients,
  notifications,
  children,
}: {
  user: ShellUser;
  org: ShellOrg;
  locations: ShellLocation[];
  dueCount: number;
  unreadCount: number;
  searchPatients: ShellSearchPatient[];
  notifications: ShellNotification[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("rp:sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem("rp:sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  };

  const displayName = user.fullName || user.email.split("@")[0] || "Practice owner";

  return (
    <div className="dark app-theme min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface-1 lg:flex",
            collapsed ? "w-[60px]" : "w-[230px]"
          )}
        >
          <SidebarContent
            collapsed={collapsed}
            pathname={pathname}
            org={org}
            locations={locations}
            dueCount={dueCount}
            unreadCount={unreadCount}
            user={user}
            displayName={displayName}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            pathname={pathname}
            onOpenMobile={() => setMobileOpen(true)}
            onOpenPalette={() => setPaletteOpen(true)}
            notifications={notifications}
            notificationsOpen={notificationsOpen}
            notificationsRead={notificationsRead}
            onToggleNotifications={() => setNotificationsOpen((value) => !value)}
            onMarkRead={() => setNotificationsRead(true)}
            unreadCount={notificationsRead ? 0 : unreadCount}
          />
          <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="app-slide-left relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-line bg-surface-1 shadow-2xl">
            <div className="absolute right-2 top-3 z-10">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarContent
              collapsed={false}
              mobile
              pathname={pathname}
              org={org}
              locations={locations}
              dueCount={dueCount}
              unreadCount={unreadCount}
              user={user}
              displayName={displayName}
              onToggleCollapsed={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      {paletteOpen ? (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          searchPatients={searchPatients}
          dueCount={dueCount}
        />
      ) : null}
    </div>
  );
}

function SidebarContent({
  collapsed,
  mobile = false,
  pathname,
  org,
  locations,
  dueCount,
  unreadCount,
  user,
  displayName,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  mobile?: boolean;
  pathname: string;
  org: ShellOrg;
  locations: ShellLocation[];
  dueCount: number;
  unreadCount: number;
  user: ShellUser;
  displayName: string;
  onToggleCollapsed: () => void;
}) {
  return (
    <>
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center px-2" : "justify-between px-3.5")}>
        <Link href="/app/overview" className="flex min-w-0 items-center gap-2" aria-label="RecallPilot home">
          {collapsed ? (
            <span className="flex size-7 items-center justify-center rounded-[6px] bg-[#006ec3] text-[11px] font-bold text-white">R</span>
          ) : (
            <img src="/brand/logo-white.png" alt="RecallPilot" className="h-[18px] w-auto" />
          )}
        </Link>
        {!mobile ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex size-7 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        ) : null}
      </div>

      <div className={cn("px-2 pb-3", collapsed && "px-2")}>
        <WorkspaceSwitcher collapsed={collapsed} org={org} locations={locations} />
      </div>

      <nav className="app-scroll flex-1 overflow-y-auto px-2 pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-line" />
            ) : (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const badge = navBadge(item.href, dueCount, unreadCount);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex h-7 items-center gap-2.5 rounded-[5px] text-[12px] font-medium transition-colors",
                      collapsed ? "justify-center px-0" : "px-2",
                      active
                        ? "bg-[#0c1a33] text-ink"
                        : "text-[#93a0b8] hover:bg-white/[0.035] hover:text-[#dbe4f3]"
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[#53d2e5]" />
                    ) : null}
                    <Icon className={cn("size-4 shrink-0", active ? "text-[#7fd8e7]" : "text-[#7e8ca6] group-hover:text-[#b9c5d9]")} strokeWidth={1.8} />
                    {collapsed ? null : (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge ? (
                          <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-[#8796af]">{badge}</span>
                        ) : null}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-2 py-2">
        <div className="space-y-0.5">
          {BOTTOM_LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex h-7 items-center gap-2.5 rounded-[5px] text-[12px] font-medium transition-colors",
                  collapsed ? "justify-center px-0" : "px-2",
                  active ? "bg-[#0c1a33] text-ink" : "text-[#93a0b8] hover:bg-white/[0.035] hover:text-[#dbe4f3]"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-[#7fd8e7]" : "text-[#7e8ca6]")} strokeWidth={1.8} />
                {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-2">
          <UserMenu collapsed={collapsed} user={user} displayName={displayName} />
        </div>
      </div>
    </>
  );
}

function WorkspaceSwitcher({ collapsed, org, locations }: { collapsed: boolean; org: ShellOrg; locations: ShellLocation[] }) {
  const items: DropdownItem[] = [
    { label: org.name, href: "/app/settings", icon: <Check className="text-[#53d2e5]" /> },
    ...locations.map((location) => ({
      label: `${location.name}${location.city ? ` · ${location.city}` : ""}`,
      href: "/app/settings",
      icon: <span className="block size-1.5 rounded-full bg-[#46536b]" />,
    })),
    { label: "Workspace settings", href: "/app/settings", icon: <Settings />, separator: true },
    { label: "Invite teammates", href: "/app/settings", icon: <Plus /> },
  ];

  return (
    <DropdownMenu
      align="start"
      className="w-full"
      menuClassName="w-[240px]"
      ariaLabel="Switch workspace"
      trigger={
        <span
          className={cn(
            "flex w-full items-center gap-2 rounded-[6px] border border-line bg-surface-2 p-1.5 text-left transition-colors hover:bg-surface-3",
            collapsed && "justify-center border-transparent bg-transparent p-1"
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-[#2b5b8d]/50 bg-[#0b2a4d] text-[10px] font-semibold text-[#8ed8ff]">
            {org.name.slice(0, 1)}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-[#dbe4f3]">{org.name}</span>
                <span className="block text-[10px] text-muted-foreground">{locations.length} location{locations.length === 1 ? "" : "s"}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </>
          )}
        </span>
      }
      items={items}
    />
  );
}

function UserMenu({ collapsed, user, displayName }: { collapsed: boolean; user: ShellUser; displayName: string }) {
  const items: DropdownItem[] = [
    { label: "Profile", href: "/app/profile", icon: <UserRound /> },
    { label: "Settings", href: "/app/settings", icon: <Settings /> },
    { label: "Help & support", href: "/app/help", icon: <HelpCircle /> },
    { label: "Sign out", icon: <LogOut />, onSelect: () => void signOutAction(), separator: true, danger: true },
  ];
  return (
    <DropdownMenu
      align="start"
      className="w-full"
      menuClassName="w-[220px]"
      ariaLabel="Open user menu"
      trigger={
        <span
          className={cn(
            "flex w-full items-center gap-2 rounded-[5px] px-1 py-1 text-left transition-colors hover:bg-white/[0.035]",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar name={displayName} size="sm" />
          {collapsed ? null : (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium text-[#dbe4f3]">{displayName}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{user.email}</span>
            </span>
          )}
          {collapsed ? null : <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />}
        </span>
      }
      items={items}
    />
  );
}

function TopBar({
  pathname,
  onOpenMobile,
  onOpenPalette,
  notifications,
  notificationsOpen,
  notificationsRead,
  onToggleNotifications,
  onMarkRead,
  unreadCount,
}: {
  pathname: string;
  onOpenMobile: () => void;
  onOpenPalette: () => void;
  notifications: ShellNotification[];
  notificationsOpen: boolean;
  notificationsRead: boolean;
  onToggleNotifications: () => void;
  onMarkRead: () => void;
  unreadCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onToggleNotifications();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notificationsOpen, onToggleNotifications]);

  const segments = pathname.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1] ?? "overview";
  const label = SEGMENT_LABELS[leaf] ?? (segments[1] === "patients" ? "Patient profile" : segments[1] === "campaigns" ? "Campaign" : "Overview");
  const parent = segments.length > 2 ? SEGMENT_LABELS[segments[1] ?? ""] : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface-1/95 px-3 backdrop-blur sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenMobile}
          className="inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink lg:hidden"
        >
          <Menu className="size-4" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-[12px]">
          <span className="hidden text-muted-foreground sm:inline">Workspace</span>
          <span className="hidden text-[#3f4c61] sm:inline">/</span>
          {parent ? (
            <>
              <Link href={`/app/${segments[1]}`} className="hidden text-muted-foreground transition-colors hover:text-ink sm:inline">
                {parent}
              </Link>
              <span className="hidden text-[#3f4c61] sm:inline">/</span>
            </>
          ) : null}
          <span className="truncate font-medium text-ink">{label}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenPalette}
          className="group mr-1 hidden h-8 w-[248px] items-center gap-2 rounded-[6px] border border-line bg-surface-2 px-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-[#263a5c] hover:bg-surface-3 md:flex"
        >
          <Search className="size-3.5" />
          <span className="flex-1 truncate whitespace-nowrap">Search patients, pages…</span>
          <span className="flex items-center gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={onOpenPalette}
          className="inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-white/[0.05] hover:text-ink md:hidden"
        >
          <Search className="size-4" />
        </button>

        <div ref={ref} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={onToggleNotifications}
            className="relative inline-flex size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink"
          >
            <Bell className="size-4" />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#53d2e5] ring-2 ring-surface-1" />
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="app-pop-in absolute right-0 top-full z-50 mt-2 w-[340px] overflow-hidden rounded-[8px] border border-line bg-popover shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold text-ink">Notifications</p>
                  <span className="rounded-[4px] bg-white/[0.05] px-1 text-[10px] tabular text-muted-foreground">{notifications.length}</span>
                </div>
                <button
                  type="button"
                  onClick={onMarkRead}
                  className="text-[11px] text-muted-foreground transition-colors hover:text-ink"
                >
                  {notificationsRead ? "All read" : "Mark all read"}
                </button>
              </div>
              <div className="max-h-[360px] overflow-y-auto app-scroll">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-2.5 border-b border-line/70 px-3 py-2.5 last:border-b-0",
                      !notificationsRead && index < unreadCount ? "bg-[#53d2e5]/[0.025]" : ""
                    )}
                  >
                    <NotificationIcon kind={notification.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug text-[#dbe4f3]">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{notification.detail}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(notification.at)}</p>
                    </div>
                    {!notificationsRead && index < unreadCount ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#53d2e5]" /> : null}
                  </div>
                ))}
              </div>
              <Link
                href="/app/overview"
                onClick={onToggleNotifications}
                className="flex h-9 items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-ink"
              >
                Open activity feed <ArrowUpRight className="size-3" />
              </Link>
            </div>
          ) : null}
        </div>

        <Link
          href="/app/help"
          aria-label="Help and support"
          className="hidden size-8 items-center justify-center rounded-[5px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-ink sm:inline-flex"
        >
          <HelpCircle className="size-4" />
        </Link>
      </div>
    </header>
  );
}

function NotificationIcon({ kind }: { kind: ShellNotification["kind"] }) {
  const Icon = kind === "message" ? MessageSquare : kind === "revenue" ? CircleDollarSign : kind === "recall" ? Users : Check;
  const tone =
    kind === "message"
      ? "text-[#53d2e5] bg-[#53d2e5]/10"
      : kind === "revenue"
        ? "text-[#5bd39a] bg-[#5bd39a]/10"
        : kind === "recall"
          ? "text-[#e3b341] bg-[#e3b341]/10"
          : "text-[#7d8ba6] bg-white/[0.05]";
  return (
    <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px]", tone)}>
      <Icon className="size-3.5" />
    </span>
  );
}

interface PaletteResult {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ElementType;
}

function CommandPalette({
  onClose,
  searchPatients,
  dueCount,
}: {
  onClose: () => void;
  searchPatients: ShellSearchPatient[];
  dueCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const results = useMemo<PaletteResult[]>(() => {
    const needle = query.trim().toLowerCase();
    const navResults: PaletteResult[] = [
      ...NAV_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          id: `nav-${item.href}`,
          group: "Navigate",
          label: item.label,
          sublabel: group.label,
          href: item.href,
          icon: item.icon,
        }))
      ),
      ...BOTTOM_LINKS.map((item) => ({
        id: `nav-${item.href}`,
        group: "Navigate",
        label: item.label,
        sublabel: "System",
        href: item.href,
        icon: item.icon,
      })),
    ].filter((item) => !needle || item.label.toLowerCase().includes(needle) || (item.sublabel ?? "").toLowerCase().includes(needle));

    const patientResults: PaletteResult[] = searchPatients
      .filter(
        (patient) =>
          !needle ||
          patient.name.toLowerCase().includes(needle) ||
          (patient.email ?? "").toLowerCase().includes(needle) ||
          (patient.phone ?? "").includes(needle)
      )
      .slice(0, 5)
      .map((patient) => ({
        id: `patient-${patient.id}`,
        group: "Patients",
        label: patient.name,
        sublabel: patient.phone ?? patient.email ?? "No contact",
        href: `/app/patients/${patient.id}`,
        icon: UserRound,
      }));

    const actionResults: PaletteResult[] = [
      { id: "action-import", group: "Quick actions", label: "Import patients from CSV", href: "/app/import", icon: Upload, sublabel: "Data" },
      { id: "action-campaign", group: "Quick actions", label: "Create a recall campaign", href: "/app/campaigns", icon: Megaphone, sublabel: "Campaigns" },
      { id: "action-review", group: "Quick actions", label: `Review ${dueCount.toLocaleString("en-US")} due patients`, href: "/app/patients?status=needs_recall", icon: Users, sublabel: "Patients" },
    ].filter((item) => !needle || item.label.toLowerCase().includes(needle) || (item.sublabel ?? "").toLowerCase().includes(needle));

    return [...navResults.slice(0, 7), ...patientResults, ...actionResults];
  }, [query, searchPatients, dueCount]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => Math.min(results.length - 1, index + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
      }
      if (event.key === "Enter") {
        const result = results[active];
        if (result) {
          event.preventDefault();
          onClose();
          router.push(result.href);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onClose, results, router]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteResult[]>();
    for (const result of results) {
      const list = map.get(result.group) ?? [];
      list.push(result);
      map.set(result.group, list);
    }
    return [...map.entries()];
  }, [results]);

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[10vh] sm:pt-[14vh]">
      <button type="button" aria-label="Close search" className="fixed inset-0 cursor-default bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
      <div className="app-fade-in relative z-10 w-full max-w-[580px] overflow-hidden rounded-[10px] border border-line bg-popover shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <div className="flex h-11 items-center gap-2 border-b border-line px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or jump to…"
            className="h-full flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted-foreground"
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5 app-scroll">
          {groups.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">No results for “{query}”.</div>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="mb-1.5">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{group}</p>
                {items.map((result) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => {
                        onClose();
                        router.push(result.href);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-[5px] px-2 py-1.5 text-left transition-colors",
                        index === active ? "bg-[#0c1a33] text-ink" : "text-[#a9b6cc] hover:bg-white/[0.035]"
                      )}
                    >
                      <Icon className={cn("size-3.5 shrink-0", index === active ? "text-[#7fd8e7]" : "text-[#6e7c95]")} />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{result.label}</span>
                      {result.sublabel ? <span className="max-w-[150px] truncate text-[10px] text-muted-foreground">{result.sublabel}</span> : null}
                      {index === active ? <CornerDownLeft className="size-3 text-muted-foreground" /> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          </span>
          <span className="flex items-center gap-1">
            <Command className="size-3" /> K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
