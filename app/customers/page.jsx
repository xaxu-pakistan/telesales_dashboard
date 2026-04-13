"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Filters } from "@/components/Filters";
import { CustomerTable } from "@/components/CustomerTable";
import { ExportButton } from "@/components/ExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { RefreshCcw, Loader2, Users, AlertCircle, Clock, CalendarCheck, LogOut } from "lucide-react";

function StatCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-card border border-border/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState({ customers: [], hasNextPage: false, endCursor: null });
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [error, setError] = useState(null);
  const isFirstLoad = useRef(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const queryString = searchParams.toString();

  const fetchData = async (isSilent = false) => {
    if (isSilent) setIsSyncing(true);
    if (!isSilent) {
      if (isFirstLoad.current) setInitialLoading(true);
      else setFilterLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/customers${queryString ? `?${queryString}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      if (isSilent) {
        // Intelligent Merge for Silent Refresh
        setData(prev => {
          // Create a map of existing customers for fast lookup
          const customerMap = new Map(prev.customers.map(c => [c.customerId || c.id, c]));
          
          // Update/Add new customers from the latest fetch
          json.customers.forEach(newC => {
            customerMap.set(newC.customerId || newC.id, newC);
          });
          
          // Convert back to array and sort (to keep "Major Usman" at the top if he just ordered)
          const merged = Array.from(customerMap.values()).sort((a, b) => {
            const dateA = new Date(a.lastOrder?.processedAt || 0);
            const dateB = new Date(b.lastOrder?.processedAt || 0);
            return dateB - dateA; // Newest first
          });

          return {
            ...json,
            customers: merged,
            // Keep the pagination state from previous data if we have more than 100
            total: json.total || prev.total,
            hasNextPage: prev.customers.length > json.customers.length ? prev.hasNextPage : json.hasNextPage,
            endCursor: prev.customers.length > json.customers.length ? prev.endCursor : json.endCursor
          };
        });
      } else {
        // Normal fetch (initial or filters)
        setData(json);
      }
    } catch (err) {
      if (!isSilent) setError(err.message);
    } finally {
      setIsSyncing(false);
      if (!isSilent) {
        setInitialLoading(false);
        setFilterLoading(false);
        isFirstLoad.current = false;
      }
    }
  };

  const triggerSync = async () => {
    try {
      setFilterLoading(true);
      const res = await fetch("/api/customers?sync=true");
      if (!res.ok) throw new Error("Failed to start sync");
      // Optionally poll for status, but for now just wait and refresh after a bit
      setTimeout(() => fetchData(true), 3000);
    } catch (err) {
      setError("Sync failed: " + err.message);
    } finally {
      setFilterLoading(false);
    }
  };

  // Initial and Filter-based fetch
  useEffect(() => {
    fetchData();
  }, [queryString]);

  // Near real-time sync (every 30 seconds) + Window Focus revalidation
  useEffect(() => {
    const handleFocus = () => {
      if (!loadingMore && !filterLoading) {
        fetchData(true);
      }
    };

    window.addEventListener("focus", handleFocus);

    const interval = setInterval(() => {
      if (!loadingMore && !filterLoading) {
        fetchData(true); 
      }
    }, 30000); // 30 seconds for near real-time

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [queryString, loadingMore, filterLoading]);

  const handleUpdateNoteLocal = (customerId, note) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => 
        (c.customerId === customerId || c.id === customerId) ? { ...c, note } : c
      )
    }));
  };


  const handleLoadMore = async () => {
    if (!data.hasNextPage || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const skip = data.customers.length;
      const sep = queryString ? "&" : "?";
      const res = await fetch(`/api/customers${queryString ? `?${queryString}` : ""}${sep}skip=${skip}`);
      if (!res.ok) throw new Error("Failed to fetch more data");
      const json = await res.json();
      
      setData(prev => ({
        customers: [...prev.customers, ...json.customers],
        hasNextPage: json.hasNextPage,
        endCursor: json.endCursor
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const overdueCount = data.customers.filter(c => c.followupStatus === "overdue").length;
  const dueTodayCount = data.customers.filter(c => c.followupStatus === "due-today").length;
  const upcomingCount = data.customers.filter(c => c.followupStatus === "upcoming").length;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/60">
              Telesales Dashboard
            </h1>
            <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
              Managing <span className="text-foreground font-bold">{data.total || data.customers.length}</span> active prospects
              {(filterLoading || loadingMore || isSyncing) && (
                <span className="inline-flex items-center gap-1 text-primary text-xs animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> syncing...
                </span>
              )}
              {!filterLoading && !loadingMore && !isSyncing && (
                <span className="text-[10px] opacity-50 ml-2">
                  Last checked: {lastChecked}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={triggerSync}
              variant="outline"
              className="rounded-xl border-border/50 hover:bg-accent transition-all duration-300"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Sync
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Loaded" 
            value={data.customers.length} 
            icon={Users} 
            colorClass="bg-blue-500/10 text-blue-500"
          />
          <StatCard 
            title="Overdue" 
            value={overdueCount} 
            icon={AlertCircle} 
            colorClass="bg-red-500/10 text-red-500"
          />
          <StatCard 
            title="Due Today" 
            value={dueTodayCount} 
            icon={Clock} 
            colorClass="bg-amber-500/10 text-amber-500"
          />
          <StatCard 
            title="Upcoming" 
            value={upcomingCount} 
            icon={CalendarCheck} 
            colorClass="bg-emerald-500/10 text-emerald-500"
          />
        </div>

        {/* Filters Section */}
        <section className="mb-8">
          <Filters />
        </section>

        {/* Main Content */}
        <main>
          {error ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl mb-6 flex flex-col items-center">
              <p className="font-semibold text-lg">Communication error with Shopify</p>
              <p className="text-sm opacity-80 mt-1">{error}</p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4 border-destructive/20 hover:bg-destructive/10 transition-colors"
              >
                Attempt Recovery
              </Button>
            </div>
          ) : initialLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl opacity-50" />
              ))}
            </div>
          ) : (
            <div className={`space-y-8 transition-all duration-500 ${filterLoading ? "opacity-50 blur-[1px]" : "opacity-100 blur-0"}`}>
              <div className="bg-card border border-border/40 rounded-3xl shadow-xl overflow-hidden">
                <CustomerTable 
                  customers={data.customers} 
                  onNoteUpdated={handleUpdateNoteLocal}
                />
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12">
                {data.hasNextPage ? (
                  <Button 
                    onClick={handleLoadMore} 
                    disabled={loadingMore}
                    variant="secondary"
                    className="w-full md:w-80 rounded-2xl h-12 font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Retrieve More Records"
                    )}
                  </Button>
                ) : (
                  <div className="text-muted-foreground text-sm font-medium">
                    Reached end of the list
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <ExportButton data={data.customers} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] p-8 text-zinc-400 text-center flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          <p className="text-sm">Loading dashboard...</p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
