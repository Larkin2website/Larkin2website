import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetPortalSession } from "@workspace/api-client-react";
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
import { clerkBasePath } from "@/lib/clerk";
import { Larkin2Wordmark } from "@/components/brand";

interface PortalLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "larkin2-portal-sidebar-collapsed";

export function PortalLayout({ children }: PortalLayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: session } = useGetPortalSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    { href: "/opportunities", label: "Opportunities", icon: Briefcase },
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
            className={`group flex items-center min-h-11 text-sm transition-all border-l-2 ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            } ${
              isActive 
                ? "border-primary bg-primary/5 text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
              <div className={`flex items-center min-w-0 ${collapsed ? "justify-center" : "gap-3"}`}>
                <Icon size={16} className={isActive ? "text-primary shrink-0" : "text-muted-foreground shrink-0 group-hover:text-foreground transition-colors"} />
                {!collapsed && <span className="uppercase tracking-widest text-[10px] break-words truncate">{item.label}</span>}
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
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Desktop Sidebar */}
      <aside className={`hidden h-full min-h-0 xl:flex flex-col border-r border-border bg-[#080a0c] shrink-0 transition-[width] duration-300 ease-out ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <div className={`h-20 flex items-center border-b border-border/50 shrink-0 min-w-0 ${sidebarCollapsed ? "justify-center px-3" : "justify-between gap-3 px-6"}`}>
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
        
        <nav className="flex-1 min-h-0 py-6 space-y-1 overflow-y-auto min-w-0">
          <NavLinks collapsed={sidebarCollapsed} />
        </nav>
        
        <div className={`${sidebarCollapsed ? "p-3" : "p-4"} border-t border-border/50 bg-card/30 shrink-0 min-w-0`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full h-auto hover:bg-accent/50 min-w-0 ${sidebarCollapsed ? "justify-center p-2" : "justify-start gap-3 px-4 py-6"}`}
                aria-label={sidebarCollapsed ? "Open account menu" : undefined}
                data-testid="button-account-menu"
              >
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
                  <UserIcon size={14} className="text-muted-foreground" />
                </div>
                {!sidebarCollapsed && <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                </div>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-[#171b1d] border-border rounded-none shadow-2xl">
              <DropdownMenuLabel className="font-mono font-medium text-xs uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
              <DropdownMenuItem disabled className="text-xs break-all">
                {user?.emailAddresses[0]?.emailAddress}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-none text-xs uppercase tracking-wider font-medium">
                <LogOut className="mr-2 h-3.5 w-3.5 shrink-0" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="h-full min-h-0 flex-1 flex flex-col min-w-0 bg-background relative z-10">
        {/* Mobile Header */}
        <header className="xl:hidden h-16 shrink-0 border-b border-border bg-[#080a0c] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 min-w-0">
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
                    <span className="text-sm font-medium truncate w-full">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-border rounded-none h-11 text-xs uppercase tracking-wider font-medium" onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}>
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-[1400px] mx-auto w-full p-4 sm:p-6 lg:p-8 xl:p-10 min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
