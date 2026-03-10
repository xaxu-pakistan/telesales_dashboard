"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Filters } from "@/components/Filters";
import { CustomerTable } from "@/components/CustomerTable";
import { ExportButton } from "@/components/ExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2 } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState({ customers: [], hasNextPage: false, endCursor: null });
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const isFirstLoad = useRef(true);

  const queryString = searchParams.toString();

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (isFirstLoad.current) {
        setInitialLoading(true);
      } else {
        setFilterLoading(true);
      }
      setError(null);

      try {
        const res = await fetch(`/api/customers${queryString ? `?${queryString}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setFilterLoading(false);
          isFirstLoad.current = false;
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const handleLoadMore = async () => {
    if (!data.endCursor || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const sep = queryString ? "&" : "?";
      const res = await fetch(`/api/customers${queryString ? `?${queryString}` : ""}${sep}cursor=${data.endCursor}`);
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

  const uniqueTags = Array.from(
    new Set(data.customers.flatMap((c) => c.tags || []))
  ).sort();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-[#0a0a0a] to-[#0a0a0a] text-white p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-400 to-zinc-600">
            XAXU Telesales Dashboard
          </h1>
          <p className="text-zinc-500 font-medium tracking-wide text-sm flex items-center gap-2">
            Showing{" "}
            <span className="text-zinc-300 font-semibold">
              {data.customers.length}
            </span>{" "}
            customer{data.customers.length !== 1 ? "s" : ""}
            {(filterLoading || loadingMore) && (
              <span className="inline-flex items-center gap-1 text-zinc-500 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" /> updating...
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="bg-black/50 border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Filters uniqueTags={uniqueTags} />

      {error ? (
        <div className="bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-lg mb-6">
          <p className="font-medium">Failed to load data from Shopify</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm underline opacity-80 hover:opacity-100"
          >
            Retry
          </button>
        </div>
      ) : initialLoading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[56px] w-full bg-zinc-900/50 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className={`space-y-6 transition-opacity duration-200 ${filterLoading ? "opacity-60" : "opacity-100"}`}>
          <CustomerTable customers={data.customers} />
          
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-zinc-800/50">
            {data.hasNextPage && (
              <Button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                variant="outline"
                className="w-full md:w-64 bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Customers"
                )}
              </Button>
            )}
            <div className="flex justify-end w-full">
              <ExportButton data={data.customers} />
            </div>
          </div>
        </div>
      )}
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
