import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetPortalSession } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Briefcase, 
  Settings, 
  LogOut,
  Menu,
  User as UserIcon
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { clerkBasePath } from "@/lib/clerk";

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
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${
              isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </div>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary" />
            <span className="font-semibold tracking-wide text-sm uppercase">Larkin2 Portal</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>
        
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <UserIcon size={14} />
                </div>
                <div className="flex flex-col items-start text-left flex-1 truncate">
                  <span className="text-sm font-medium truncate w-full">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
                  <span className="text-xs text-muted-foreground capitalize">{session?.member?.role?.replace("_", " ")}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                {user?.emailAddresses[0]?.emailAddress}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: clerkBasePath || "/" })}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary" />
            <span className="font-semibold text-sm uppercase">Larkin2</span>
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-card border-r border-border">
              <div className="h-16 flex items-center px-6 border-b border-border">
                <span className="font-semibold text-sm uppercase">Menu</span>
              </div>
              <nav className="p-4 space-y-1">
                <div onClick={() => setMobileMenuOpen(false)}>
                  <NavLinks />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
