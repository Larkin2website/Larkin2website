import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import { getGetPortalSessionQueryKey, useDeletePortalDemoSession, useGetPortalSession } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Briefcase, 
  Settings, 
  LogOut,
  Menu,
  User as UserIcon,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clerkBasePath } from "@/lib/clerk";
import { Larkin2Wordmark } from "@/components/brand";
import { portalDemoMode, portalTestAccessLabel } from "@/lib/demo-mode";
import { clearDemoSessionCache } from "@/lib/demo-session-cache";

interface PortalLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "larkin2-portal-sidebar-collapsed";

function ClerkSignOutAction({ mobile = false }: { mobile?: boolean }) {
  const { signOut } = useClerk();
  if (mobile) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-border rounded-none h-11 text-xs uppercase tracking-wider font-medium"
        onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}
      >
        <LogOut className="mr-2 h-4 w-4 shrink-0" />
        <span>Sign Out</span>
      </Button>
    );
  }
  return (
    <DropdownMenuItem
      onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}
      className={mobile
        ? "text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-none text-xs uppercase tracking-wider font-medium"
        : "text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-none text-xs uppercase tracking-wider font-medium"}
    >
      <LogOut className="mr-2 h-3.5 w-3.5 shrink-0" />
      <span>Sign Out</span>
    </DropdownMenuItem>
  );
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [location, navigate] = useLocation();
  const { data: session } = useGetPortalSession();
  const displayName = session?.member?.displayName ?? "Larkin2 Demo";
  const email = session?.member?.email ?? "demo@larkin2.invalid";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const endDemoSession = useDeletePortalDemoSession();
  const signOutDemo = async () => {
    await endDemoSession.mutateAsync();
    await clearDemoSessionCache(queryClient, getGetPortalSessionQueryKey());
    queryClient.clear();
    setMobileMenuOpen(false);
    navigate("/", { replace: true });
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // The sidebar still works when storage is unavailable.
    }
  }, [sidebarCollapsed]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/opportunities", label: "Opportunities", icon: Target },
    { href: "/roles", label: "Roles", icon: Briefcase },
    ...(session?.member?.role === "super_admin" 
      ? [{ href: "/settings", label: "Settings", icon: Settings }] 
      : []),
  ];

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
        const Icon = item.icon;
        
        const link = (
          <Link
            key={item.href}
            href={item.href}
            aria-label={collapsed ? item.label : undefined}
            data-testid={`link-sidebar-${item.label.toLowerCase()}`}
            className={`group flex items-center min-h-11 text-sm transition-all border rounded-full ${
              collapsed ? "justify-center px-2 mx-2" : "justify-between px-4 mx-3"
            } ${
              isActive 
                ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                : "border-border/60 text-muted-foreground hover:bg-accent/70 hover:text-foreground hover:border-border"
            }`}
          >
              <div className={`flex items-center min-w-0 ${collapsed ? "justify-center" : "flex-1 gap-3"}`}>
                <Icon size={16} className={isActive ? "text-primary shrink-0" : "text-muted-foreground shrink-0 group-hover:text-foreground transition-colors"} />
                {!collapsed && <span className="truncate text-[11px] uppercase tracking-widest text-foreground">{item.label}</span>}
              </div>
              {!collapsed && <ChevronRight size={14} className={`shrink-0 transition-transform ${isActive ? "text-primary translate-x-0" : "text-transparent -translate-x-2 group-hover:text-muted-foreground group-hover:translate-x-0"}`} />}
          </Link>
        );

        return collapsed ? (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>{item.label}</TooltipContent>
          </Tooltip>
        ) : link;
      })}
    </>
  );

  return (
    <div className="flex h-[100dvh] gap-3 overflow-hidden bg-background p-0 xl:p-3 text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Desktop Sidebar */}
      <aside className={`hidden h-full min-h-0 xl:flex flex-col overflow-hidden rounded-[28px] border border-border bg-[#080a0c] shrink-0 transition-[width] duration-300 ease-out ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <div className={`h-20 flex items-center shrink-0 min-w-0 ${sidebarCollapsed ? "justify-center px-3" : "justify-between gap-3 px-6"}`}>
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0" data-testid="link-sidebar-brand">
              <Larkin2Wordmark className="shrink-0" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2 border-l border-border pl-2 shrink-0">Portal</span>
            </Link>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!sidebarCollapsed}
                data-testid="button-toggle-sidebar"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
        
        <nav className="flex-1 min-h-0 py-3 space-y-2 overflow-y-auto min-w-0">
          <NavLinks collapsed={sidebarCollapsed} />
        </nav>
        
        <div className={`${sidebarCollapsed ? "m-2 p-2" : "m-3 p-2"} rounded-[20px] border border-border/60 bg-card/30 shrink-0 min-w-0`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full h-auto rounded-[14px] hover:bg-accent/70 min-w-0 ${sidebarCollapsed ? "justify-center p-2" : "justify-start gap-3 px-3 py-4"}`}
                aria-label={sidebarCollapsed ? "Open account menu" : undefined}
                data-testid="button-account-menu"
              >
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
                  <UserIcon size={14} className="text-muted-foreground" />
                </div>
                {!sidebarCollapsed && <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full">{displayName}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                </div>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="portal-dark-surface w-60 bg-[#171b1d] border-border rounded-none shadow-2xl">
              <DropdownMenuLabel className="font-mono font-medium text-xs uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
              <DropdownMenuItem disabled className="text-xs break-all">
                {email}
              </DropdownMenuItem>
              {portalDemoMode ? (
                <>
                  <DropdownMenuItem disabled className="text-primary text-[10px] uppercase tracking-wider">
                     {portalTestAccessLabel}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={signOutDemo}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-none text-xs uppercase tracking-wider font-medium"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <ClerkSignOutAction />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="h-full min-h-0 flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative z-10 xl:rounded-[28px] xl:border xl:border-border">
        {/* Mobile Header */}
        <header className="xl:hidden h-16 shrink-0 border-b border-border bg-[#080a0c] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 min-w-0 rounded-b-[22px]">
          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <Larkin2Wordmark className="shrink-0" />
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 hover:bg-accent/50 text-foreground shrink-0">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(280px,85vw)] p-0 bg-[#080a0c] border-r border-border rounded-none flex flex-col">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
                <Larkin2Wordmark />
              </div>
              <nav className="py-4 space-y-1 flex-1 overflow-y-auto">
                <div onClick={() => setMobileMenuOpen(false)}>
                  <NavLinks />
                </div>
              </nav>
              <div className="p-4 border-t border-border/50 bg-card/30 shrink-0 min-w-0">
                <div className="flex items-center gap-3 px-2 py-3 mb-2 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center shrink-0">
                    <UserIcon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start text-left flex-1 min-w-0">
                    <span className="text-sm font-medium truncate w-full">{displayName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                  </div>
                </div>
                {portalDemoMode ? (
                  <Button
                    variant="outline"
                    disabled={endDemoSession.isPending}
                    className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-border rounded-none h-11 text-xs uppercase tracking-wider font-medium"
                    onClick={signOutDemo}
                  >
                    <LogOut className="mr-2 h-4 w-4 shrink-0" />
                    <span>Sign Out</span>
                  </Button>
                ) : (
                  <ClerkSignOutAction mobile />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </header>
        {portalDemoMode && (
          <div className="shrink-0 border-b border-primary/30 bg-primary/10 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-primary">
            {portalTestAccessLabel} · not secure authentication
          </div>
        )}
        
        <div className="portal-workspace flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 xl:p-10 min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
