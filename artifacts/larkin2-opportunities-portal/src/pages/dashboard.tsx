import { useGetPortalDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { 
  FileText, 
  CheckCircle2, 
  Archive, 
  Activity, 
  ArrowRight,
  Clock,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { PageHeader } from "@/components/brand";

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useGetPortalDashboard();

  if (isLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 animate-pulse">
        <PageHeader title="Dashboard" subtitle="Overview of your publishing operations" className="rounded-[28px] border border-border bg-card p-5 sm:p-7" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 rounded-[28px]">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-[#171b1d] border-[#2a2f31] rounded-[22px]">
              <CardHeader className="h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center break-words min-w-0">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6 shrink-0">
          <Activity className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-mono text-2xl font-medium tracking-tight mb-3">Unable to load dashboard</h2>
        <p className="text-muted-foreground mb-8 max-w-md">There was a problem fetching your dashboard data. This might be a temporary connection issue.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase tracking-wider" onClick={() => window.location.reload()}>Retry Connection</Button>
      </div>
    );
  }

  const { counts, recentOpportunities, recentActivity } = dashboard;

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your publishing operations"
        className="sticky top-4 sm:top-6 xl:top-10 z-20 rounded-[28px] border border-border bg-card p-5 sm:p-7 mb-0"
        action={
          <Link href="/opportunities/new" className="w-full lg:w-auto block">
            <Button className="w-full rounded-full border-0 font-mono text-xs uppercase tracking-wider h-11 px-6">
              Create Opportunity
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
        <StatCard 
          title="Published Roles" 
          value={counts.published} 
          icon={CheckCircle2} 
          description={`${counts.closingSoon} closing soon`}
        />
        <StatCard 
          title="Drafts" 
          value={counts.draft} 
          icon={FileText} 
        />
        <StatCard 
          title="Filled" 
          value={counts.filled} 
          icon={Briefcase}
        />
        <StatCard 
          title="Archived" 
          value={counts.archived} 
          icon={Archive} 
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 min-w-0">
        <div className="xl:col-span-2 space-y-5 min-w-0 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
            <h2 className="font-mono text-xl font-medium tracking-tight break-words">Recent Opportunities</h2>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-transparent p-0 flex items-center group">
                View all <ArrowRight className="ml-2 w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4 min-w-0">
            {recentOpportunities.length === 0 ? (
              <div className="p-12 text-center bg-[#171b1d] border border-dashed border-[#2a2f31] rounded-[20px]">
                <p className="text-muted-foreground text-sm">No opportunities created yet.</p>
              </div>
            ) : (
              recentOpportunities.map((opp) => (
                <Link key={opp.id} href={`/opportunities/${opp.id}`} className="block min-w-0">
                  <div className="group bg-[#171b1d] border border-[#2a2f31] hover:border-primary/50 transition-colors flex flex-col lg:flex-row cursor-pointer min-w-0 overflow-hidden rounded-[20px]">
                    <div className="flex-1 p-5 sm:p-6 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <StatusBadge status={opp.status} />
                        <span className="text-[10px] text-primary uppercase tracking-[0.15em] font-medium truncate min-w-0">
                          {opp.department}
                        </span>
                      </div>
                      <h3 className="font-mono text-lg sm:text-xl font-medium tracking-tight text-foreground group-hover:text-primary transition-colors mb-2 break-words">
                        {opp.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed break-words">
                        {opp.summary}
                      </p>
                    </div>
                    <div className="bg-[#101315] p-5 sm:p-6 lg:w-48 flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-3 border-t lg:border-t-0 lg:border-l border-[#2a2f31] shrink-0 min-w-0">
                      <div className="text-[10px] text-[#85898a] lg:mb-2 uppercase tracking-[0.15em] shrink-0">Deadline</div>
                      <div className="min-w-0 max-w-full text-right lg:text-left text-sm font-medium text-foreground break-words">{opp.deadline ? format(new Date(opp.deadline), "MMM d, yyyy") : "Open until filled"}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5 min-w-0 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <h2 className="font-mono text-xl font-medium tracking-tight border-b border-border pb-4 break-words">Activity Log</h2>
          
          <div className="bg-[#171b1d] border border-[#2a2f31] min-w-0 overflow-hidden rounded-[20px]">
            <div className="divide-y divide-[#2a2f31]">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground break-words">
                  No recent activity.
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="p-5 flex gap-4 hover:bg-[#101315] transition-colors min-w-0">
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#e9e5df] leading-snug break-words">
                        <span className="font-medium text-white">{activity.actorName}</span>
                        {" "}
                        <span className="text-[#85898a]">{formatAction(activity.action)}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] uppercase tracking-wider text-[#85898a]">
                        <Clock className="w-3 h-3 shrink-0" />
                        {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon }: { title: string, value: number, description?: string, icon: any }) {
  return (
    <Card className="bg-[#171b1d] border border-[#2a2f31] rounded-[22px] shadow-none min-w-0 flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 space-y-0 shrink-0 min-w-0">
        <CardTitle className="text-[11px] font-medium text-[#85898a] uppercase tracking-[0.15em] truncate pr-2">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-primary shrink-0" />
      </CardHeader>
      <CardContent className="px-6 pb-6 min-w-0 flex-1 flex flex-col justify-end">
        <div className="font-mono text-4xl font-medium tracking-tight text-foreground truncate">{value}</div>
        {description && (
          <p className="text-[11px] text-primary mt-2 font-medium tracking-wide break-words">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-[#1d2020] text-card border-transparent",
    published: "bg-primary text-[#080a0c] border-transparent font-bold",
    closed: "bg-transparent text-[#85898a] border-[#85898a]",
    filled: "bg-[#e9e5df] text-[#1d2020] border-transparent font-bold",
    archived: "bg-transparent text-[#2a2f31] border-[#2a2f31]",
  };
  
  const className = styles[status] || styles.draft;
  
  return (
    <span className={`px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase border whitespace-nowrap shrink-0 ${className}`}>
      {status}
    </span>
  );
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").toLowerCase();
}
