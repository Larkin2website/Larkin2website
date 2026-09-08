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
  ChevronRight
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
import { useState } from "react";
import { clerkBasePath } from "@/lib/clerk";
import { Larkin2Wordmark } from "@/components/brand";

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: session } = useGetPortalSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/opportunities", label: "Opportunities", icon: Briefcase },
    ...(session?.member?.role === "super_admin" 
      ? [{ href: "/settings", label: "Settings", icon: Settings }] 
      : []),
  ];

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
        const Icon = item.icon;
        
        return (
          <Link key={item.href} href={item.href}>
            <div className={`group flex items-center justify-between px-4 py-3 text-sm transition-all cursor-pointer border-l-2 min-h-[44px] ${
              isActive 
                ? "border-primary bg-primary/5 text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}>
              <div className="flex items-center gap-3">
                <Icon size={16} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"} />
                <span className="uppercase tracking-widest text-[10px]">{item.label}</span>
              </div>
              <ChevronRight size={14} className={`transition-transform ${isActive ? "text-primary translate-x-0" : "text-transparent -translate-x-2 group-hover:text-muted-foreground group-hover:translate-x-0"}`} />
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-[#080a0c]">
        <div className="h-20 flex items-center px-8 border-b border-border/50 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Larkin2Wordmark />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2 border-l border-border pl-2">Portal</span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        
        <div className="p-4 border-t border-border/50 bg-card/30 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-4 py-6 h-auto hover:bg-accent/50">
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
                  <UserIcon size={14} className="text-muted-foreground" />
                </div>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-[#171b1d] border-border rounded-none shadow-2xl">
              <DropdownMenuLabel className="font-mono font-medium text-xs uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
              <DropdownMenuItem disabled className="text-xs">
                {user?.emailAddresses[0]?.emailAddress}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-none text-xs uppercase tracking-wider font-medium">
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden h-16 shrink-0 border-b border-border bg-[#080a0c] flex items-center justify-between px-4 sticky top-0 z-30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Larkin2Wordmark />
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 hover:bg-accent/50 text-foreground">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-[#080a0c] border-r border-border rounded-none flex flex-col">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
                <Larkin2Wordmark />
              </div>
              <nav className="py-4 space-y-1 flex-1 overflow-y-auto">
                <div onClick={() => setMobileMenuOpen(false)}>
                  <NavLinks />
                </div>
              </nav>
              <div className="p-4 border-t border-border/50 bg-card/30 shrink-0">
                <div className="flex items-center gap-3 px-2 py-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center shrink-0">
                    <UserIcon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex flex-col items-start text-left flex-1 min-w-0">
                    <span className="text-sm font-medium truncate w-full">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate w-full mt-0.5">{session?.member?.role?.replace("_", " ")}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-border rounded-none h-11 text-xs uppercase tracking-wider font-medium" onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1200px] mx-auto w-full p-4 sm:p-6 md:p-8 lg:p-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}