"use client";

import { useEffect, useState, Suspense } from "react";
import { ReturnsTable } from "@/components/ReturnsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Loader2, Box, Search } from "lucide-react";

function ReturnsContent() {
  const [data, setData] = useState({ returns: [], total: 0, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const fetchReturns = async (isSync = false) => {
    if (!isSync) setLoading(true);
    else setSyncing(true);

    try {
      const query = new URLSearchParams({
        search,
        status,
        sync: isSync ? "true" : "false"
      });
      const res = await fetch(`/api/returns?${query}`);
      const json = await res.json();
      
      if (json.error) {
          console.error("API Error:", json.error);
          return;
      }

      if (!isSync) {
          setData({
              returns: json.returns || [],
              total: json.total || 0,
              hasNextPage: json.hasNextPage || false
          });
      } else {
          // If sync was triggered, wait a bit and re-fetch
          setTimeout(() => fetchReturns(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReturns();
    }, 500);
    return () => clearTimeout(timer);
  }, [search, status]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Order Returns
          </h1>
          <p className="text-muted-foreground font-medium text-sm flex items-center gap-2">
            Managing <span className="text-foreground font-bold">{data.total || data.returns.length}</span> returns
            {(loading || syncing) && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchReturns(true)}
            variant="outline"
            className="rounded-xl"
            disabled={syncing}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            Sync Returns
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Return ID, Name or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          {["all", "OPEN", "CLOSED", "CANCELLED"].map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
              className="rounded-xl capitalize text-xs h-10 px-4"
            >
              {s.toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <main>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border/40 rounded-3xl shadow-xl overflow-hidden">
            <ReturnsTable returns={data.returns} />
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8" /></div>}>
      <ReturnsContent />
    </Suspense>
  );
}
