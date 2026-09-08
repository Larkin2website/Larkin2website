import { useState } from "react";
import { useGetPortalSession, useListPortalOpportunities, getListPortalOpportunitiesQueryKey, OpportunityStatus } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/pages/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from "lucide-react";

export default function OpportunitiesPage() {
  const { data: session } = useGetPortalSession();
  const canWrite = session?.permissions.includes("opportunities:write") ?? false;
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | "all">("all");
  const [sortField, setSortField] = useState<"updatedAt" | "title" | "deadline">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Debounced search could be added here, but keeping it simple for now
  // Assuming the user hits enter or we use a basic form
  
  const params = {
    page,
    pageSize: 15,
    q: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    sort: sortField,
    order: sortOrder
  };

  const { data: pageData, isLoading } = useListPortalOpportunities(params, {
    query: {
      queryKey: getListPortalOpportunitiesQueryKey(params)
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset page on new search
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground mt-1">Manage public roles and job postings.</p>
        </div>
        {canWrite && (
          <Link href="/opportunities/new">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Opportunity
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search titles or departments..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border"
          />
        </form>
        
        <div className="flex gap-4">
          <Select 
            value={statusFilter} 
            onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
          >
            <SelectTrigger className="w-[140px] bg-background">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="filled">Filled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={`${sortField}-${sortOrder}`} 
            onValueChange={(v) => {
              const [field, order] = v.split("-");
              setSortField(field as any);
              setSortOrder(order as any);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt-desc">Newest First</SelectItem>
              <SelectItem value="updatedAt-asc">Oldest First</SelectItem>
              <SelectItem value="title-asc">Title (A-Z)</SelectItem>
              <SelectItem value="deadline-asc">Deadline (Soonest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Deadline</th>
                <th className="px-6 py-4 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading opportunities...
                  </td>
                </tr>
              ) : !pageData?.items.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No opportunities match your filters.
                  </td>
                </tr>
              ) : (
                pageData.items.map((opp) => (
                  <tr key={opp.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/opportunities/${opp.id}`} className="font-semibold text-card-foreground group-hover:text-primary transition-colors block">
                        {opp.title}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1">/{opp.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{opp.department}</td>
                    <td className="px-6 py-4"><StatusBadge status={opp.status} /></td>
                    <td className="px-6 py-4">
                      {opp.deadline ? (
                        <span className={new Date(opp.deadline) < new Date() ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {format(new Date(opp.deadline), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(opp.updatedAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pageData && pageData.pageCount > 1 && (
          <div className="border-t border-border p-4 flex items-center justify-between bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageData.pageSize) + 1} to {Math.min(page * pageData.pageSize, pageData.total)} of {pageData.total} results
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(pageData.pageCount, p + 1))}
                disabled={page >= pageData.pageCount}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
