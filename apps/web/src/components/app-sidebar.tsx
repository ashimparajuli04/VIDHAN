"use client";

import * as React from "react";
import { SidebarToggleIcon } from "@/components/sidebar-toggle-icon";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Inbox,
  Library,
  LifeBuoy,
  MessageSquare,
  MessageSquarePlus,
  MoreHorizontal,
  Trash2,
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { useAuth } from "@/features/auth/provider";
import { useChat } from "@/features/chat/store";
import type { TChatSessionView } from "@/features/chat/types";
import { getMembership } from "@/features/enterprise/api";
import type { TEnterpriseMembership } from "@vidhan/schema";
import { cn } from "@/lib/utils";

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
] as const;

// Shown only to approved Enterprise members; the server computes it so a
// revoked membership removes the tab on the next reload.
const ENTERPRISE_ITEM = {
  title: "Enterprise",
  href: "/enterprise",
  icon: Building2,
} as const;

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const { sessions, deleteSession, refresh } = useChat();

  const [pendingDelete, setPendingDelete] =
    React.useState<TChatSessionView | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [enterprise, setEnterprise] = React.useState<TEnterpriseMembership | null>(
    null
  );
  const [enterpriseLoaded, setEnterpriseLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getMembership()
      .then((membership) => {
        if (!active) return;
        setEnterprise(membership);
        setEnterpriseLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setEnterprise(null);
        setEnterpriseLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const collapsed = state === "collapsed";
  const displayName = user?.name ?? "Account";
  const displayEmail = user?.email ?? "";

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteSession(pendingDelete.id);
      // Static export forbids useSearchParams in the layout, so read the
      // active session straight from the URL.
      const activeId = new URLSearchParams(window.location.search).get("id");
      if (pendingDelete.id === activeId) router.push("/chat");
    } catch {
      void refresh();
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

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
                  className="flex items-center justify-center rounded-lg py-1.5 transition-all duration-150 hover:bg-sidebar-accent group-hover/logo-expand:scale-90 group-hover/logo-expand:opacity-0"
                >
                  <BrandLogo className="size-11 shrink-0" />
                </Link>

                {/* Expand */}

                <button
                  type="button"
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                  onClick={toggleSidebar}
                  className="absolute inset-0 hidden pointer-events-none items-center justify-center rounded-lg text-sidebar-foreground/60 opacity-0 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/logo-expand:pointer-events-auto group-hover/logo-expand:opacity-100 md:flex"
                >
                  <SidebarToggleIcon className="size-6" />
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
                <BrandLogo className="size-8 shrink-0" />

                <span className="truncate font-brand text-2xl font-extrabold uppercase tracking-[0.08em]">
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
                        <item.icon className="size-6" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {enterpriseLoaded && enterprise && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(ENTERPRISE_ITEM.href)}
                    tooltip={ENTERPRISE_ITEM.title}
                    className="h-11 rounded-lg"
                  >
                    <Link href={ENTERPRISE_ITEM.href}>
                      <ENTERPRISE_ITEM.icon className="size-6" />
                      <span>{ENTERPRISE_ITEM.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          className="h-11 rounded-lg px-2 text-sm font-normal"
                        >
                          <Link href={`/chat?id=${chat.id}`}>
                            <MessageSquare className="size-4 shrink-0 opacity-50" />

                            <span className="min-w-0 flex-1 truncate">
                              {chat.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </ContextMenuTrigger>

                      <ContextMenuContent className="w-44 rounded-xl">
                        <ContextMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(chat)}
                        >
                          <Trash2 />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction
                          showOnHover
                          aria-label={`More options for ${chat.title}`}
                          className="top-1/2 -translate-y-1/2 peer-data-[size=default]/menu-button:top-1/2"
                        >
                          <MoreHorizontal />
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="w-44 rounded-xl"
                      >
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(chat)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ───────────────── Footer ───────────────── */}

      <SidebarFooter className="border-t-0 p-2">
        {/* Theme — the mobile header carries the mobile copy of this toggle. */}

        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <ThemeToggle
              showLabel={!collapsed}
              className={cn(
                "rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "size-10"
              )}
            />
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User — clicking opens the account page. */}

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={`${displayName} - ${displayEmail}`}
              className="rounded-lg"
            >
              <Link href="/account">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
                  <User className="size-5" />
                </div>

                <div className="grid min-w-0 flex-1 text-left text-[15px] leading-tight">
                  <span className="truncate font-medium">{displayName}</span>

                  <span className="truncate text-[13px] text-sidebar-foreground/60">
                    {displayEmail}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title}&rdquo; and its messages will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>

            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}