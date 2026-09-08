import { useGetPortalDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { 
  FileText, 
  CheckCircle2, 
  Archive, 
  Activity, 
  ArrowRight,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useGetPortalDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse bg-muted/50">
              <CardHeader className="h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Unable to load dashboard</h2>
        <p className="text-muted-foreground mb-6">There was a problem fetching your dashboard data.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const { counts, recentOpportunities, recentActivity } = dashboard;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your publishing operations</p>
        </div>
        <Link href="/opportunities/new">
          <Button>Create Opportunity</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Archived" 
          value={counts.archived} 
          icon={Archive} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Opportunities</h2>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                View all <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-4">
            {recentOpportunities.length === 0 ? (
              <Card className="p-8 text-center bg-card border-dashed">
                <p className="text-muted-foreground">No opportunities created yet.</p>
              </Card>
            ) : (
              recentOpportunities.map((opp) => (
                <Card key={opp.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row border-l-4 border-primary">
                    <div className="flex-1 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={opp.status} />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          {opp.department}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-card-foreground">
                        <Link href={`/opportunities/${opp.id}`} className="hover:text-primary transition-colors">
                          {opp.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {opp.summary}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-5 sm:w-48 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-border">
                      <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Deadline</div>
                      <div className="font-medium">{opp.deadline ? format(new Date(opp.deadline), "MMM d, yyyy") : "Open until filled"}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentActivity.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No recent activity.
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 flex gap-4">
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium text-foreground">{activity.actorName}</span>
                          {" "}
                          <span className="text-muted-foreground">{formatAction(activity.action)}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon }: { title: string, value: number, description?: string, icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-secondary text-secondary-foreground border-border",
    published: "bg-primary/10 text-primary border-primary/20",
    closed: "bg-muted text-muted-foreground border-border",
    filled: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    archived: "bg-accent text-accent-foreground border-border",
  };
  
  const className = styles[status] || styles.draft;
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${className}`}>
      {status}
    </span>
  );
}

function formatAction(action: string) {
  // Convert API action strings to readable text if necessary
  return action.replace(/_/g, " ").toLowerCase();
}
