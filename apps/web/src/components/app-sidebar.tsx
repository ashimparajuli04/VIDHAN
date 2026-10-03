"use client";

import * as React from "react";
import { SidebarToggleIcon } from "@/components/sidebar-toggle-icon";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Gauge,
  Inbox,
  Library,
  LifeBuoy,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/features/auth/provider";
import { useChat } from "@/features/chat/store";

const navItems = [
  {
    title: "New chat",
    href: "/chat",
    icon: MessageSquarePlus,
  },
  {
    title: "Lawyer Catalogue",
    href: "/lawyers",
    icon: BriefcaseBusiness,
  },
  {
    title: "My requests",
    href: "/requests",
    icon: Inbox,
  },
  {
    title: "Repo",
    href: "/repo",
    icon: Library,
  },
  {
    title: "Support",
    href: "/support",
    icon: LifeBuoy,
  },
  {
    title: "Usage",
    href: "/usage",
    icon: Gauge,
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { sessions } = useChat();

  const collapsed = state === "collapsed";
  const displayName = user?.name ?? "Account";
  const displayEmail = user?.email ?? "";

  return (
    <Sidebar collapsible="icon">
      {/* ───────────────── Header ───────────────── */}

      <SidebarHeader className="border-b-0 px-2 py-3">
        <div
          className={[
            "flex items-center",
            collapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          {collapsed ? (
            <>
              {/* Logo — swaps to an expand button on hover. */}

              <div className="group/logo-expand relative">
                <Link
                  href="/chat"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-150 hover:bg-sidebar-accent group-hover/logo-expand:scale-90 group-hover/logo-expand:opacity-0"
                >
                  <BrandLogo className="size-14 shrink-0" />
                </Link>

                {/* Expand */}

                <button
                  type="button"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  onClick={toggleSidebar}
                  className="absolute inset-0 hidden pointer-events-none items-center justify-center rounded-lg text-sidebar-foreground/60 opacity-0 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/logo-expand:pointer-events-auto group-hover/logo-expand:opacity-100 md:flex"
                >
                  <SidebarToggleIcon className="size-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logo */}

              <Link
                href="/chat"
                className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-accent"
              >
                <BrandLogo className="size-14 shrink-0" />

                <span className="truncate font-brand text-lg font-extrabold uppercase tracking-[0.08em]">
                  Vidhan
                </span>
              </Link>

              {/* Collapse */}

              <button
                type="button"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                onClick={toggleSidebar}
                className="hidden size-9 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:flex"
              >
                <SidebarToggleIcon className="size-5" />
              </button>
            </>
          )}
        </div>
      </SidebarHeader>

      {/* ───────────────── Content ───────────────── */}

      <SidebarContent className="px-2">
        {/* Main navigation */}

        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/chat"
                    ? pathname === "/" || pathname === "/chat"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-11 rounded-lg"
                    >
                      <Link href={item.href}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent conversations */}

        {!collapsed && (
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel className="px-2 text-[13px] font-medium text-sidebar-foreground/60">
              Recent
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {sessions.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      asChild
                      className="group h-11 rounded-lg px-2 text-sm font-normal"
                    >
                      <Link href={`/chat?id=${chat.id}`}>
                        <MessageSquare className="size-4 shrink-0 opacity-50" />

                        <span className="min-w-0 flex-1 truncate">
                          {chat.title}
                        </span>

                        <button
                          type="button"
                          aria-label={`More options for ${chat.title}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          className="hidden size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-sidebar-accent group-hover:flex group-hover:opacity-100"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ───────────────── Footer ───────────────── */}

      <SidebarFooter className="border-t-0 p-2">
        {/* User */}

        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={`${displayName} - ${displayEmail}`}
                  className="rounded-lg"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
                    <User className="size-5" />
                  </div>

                  <div className="grid min-w-0 flex-1 text-left text-[15px] leading-tight">
                    <span className="truncate font-medium">{displayName}</span>

                    <span className="truncate text-[13px] text-sidebar-foreground/60">
                      {displayEmail}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="w-60 rounded-xl"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="text-[15px] font-medium">{displayName}</p>
                  <p className="text-[13px] text-muted-foreground">{displayEmail}</p>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem variant="destructive" onSelect={logout}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}