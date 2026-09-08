import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-20 flex items-center px-8 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-primary" />
          <span className="font-semibold tracking-widest text-sm uppercase text-foreground">Larkin2 Publishing</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-full mb-4">
            <Briefcase className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            Opportunities Portal
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            The internal cockpit for managing public roles. Create, review, and confidently publish opportunities to the Larkin2 careers site.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-in">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base group">
                Sign In to Portal
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        &copy; {new Date().getFullYear()} Larkin2 Production. All rights reserved.
      </footer>
    </div>
  );
}
