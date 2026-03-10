"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FollowupBadge } from "./FollowupBadge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PhoneIcon, UserIcon, BoxIcon, CalendarClockIcon, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 50;

function truncate(str, len = 40) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

function CustomerRow({ index, c, loadingId, onMarkDone }) {
  const isOverdue = c.followupStatus === "overdue";
  const isDueToday = c.followupStatus === "due-today";
  const isDone = c.followupStatus === "done";

  let bgClass = "hover:bg-accent/40 transition-all duration-300";
  if (isOverdue) bgClass = "bg-red-500/5 hover:bg-red-500/10 transition-all duration-300";
  if (isDueToday) bgClass = "bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-300";
  if (isDone) bgClass = "opacity-50 grayscale-[0.5] hover:opacity-80 transition-all duration-300";

  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—";

  return (
    <tr className={`${bgClass} border-b border-border/40 group`}>
      <td className="px-6 py-4 text-xs font-mono text-muted-foreground w-12">{index + 1}</td>

      {/* Name */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {name[0]}
          </div>
          <div className="flex flex-col min-w-0">
            {c.adminUrl ? (
              <a href={c.adminUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm font-semibold hover:text-primary hover:underline transition-colors truncate flex items-center gap-1">
                {name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : <span className="text-sm font-semibold truncate">{name}</span>}
          </div>
        </div>
      </td>

      {/* Phone */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium whitespace-nowrap">
          <PhoneIcon className="w-3.5 h-3.5 opacity-50" />
          {c.phone || "—"}
        </div>
      </td>

      {/* Note */}
      <td className="px-6 py-4 max-w-[200px]">
        {c.note ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help truncate block">
                  {truncate(c.note)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 rounded-2xl border-border/50 shadow-2xl">
                <p className="text-sm leading-relaxed">{c.note}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-muted-foreground opacity-30">—</span>}
      </td>

      {/* Order Info */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
            <BoxIcon className="w-3 h-3 text-primary" />
            {c.lastOrder?.name || "—"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <CalendarIcon className="w-3 h-3 opacity-50" />
            {c.lastOrder?.processedAt ? new Date(c.lastOrder.processedAt).toLocaleDateString("en-GB") : "—"}
          </div>
        </div>
      </td>

      {/* Items */}
      <td className="px-6 py-4 max-w-[180px]">
        {c.lastOrder?.items?.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground bg-accent/50 px-2.5 py-1 rounded-full border border-border/30 cursor-help truncate block">
                  {c.lastOrder.items.length} item{c.lastOrder.items.length > 1 ? 's' : ''}: {truncate(c.lastOrder.items.map(i => i.title).join(", "), 20)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-4 rounded-3xl border-border/50 shadow-2xl">
                <div className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-widest opacity-60">Order Contents</p>
                  <ul className="space-y-2">
                    {c.lastOrder.items.map((i, idx) => (
                      <li key={idx} className="text-sm flex justify-between gap-4 border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-medium">{i.title} {i.variantTitle && i.variantTitle !== "Default Title" ? `(${i.variantTitle})` : ""}</span>
                        <span className="text-primary font-bold">x{i.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-muted-foreground opacity-30">—</span>}
      </td>

      {/* Amount */}
      <td className="px-6 py-4">
        <span className="text-sm font-bold tabular-nums">
          {c.lastOrder ? `Rs. ${Number(c.lastOrder.amount).toLocaleString()}` : "—"}
        </span>
      </td>

      {/* Follow-up */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          {c.followupDate ? (
            <>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                isOverdue   ? "bg-red-500/10 text-red-600 border-red-500/20" :
                isDueToday  ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                isDone      ? "bg-muted text-muted-foreground border-border" :
                              "bg-blue-500/10 text-blue-600 border-blue-500/20"
              }`}>
                <CalendarClockIcon className="w-3 h-3" />
                {c.followupDate}
              </div>
              <FollowupBadge status={c.followupStatus} />
            </>
          ) : <span className="text-muted-foreground opacity-30">—</span>}
        </div>
      </td>

      {/* Action */}
      <td className="px-6 py-4 text-right">
        <Button
          size="sm"
          variant={isDone ? "outline" : "default"}
          className={`rounded-xl h-9 px-4 text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 ${
            isDone ? "border-border/50 hover:bg-accent" : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
          }`}
          disabled={loadingId === c.customerId}
          onClick={() => onMarkDone(c.customerId, isDone)}
        >
          {loadingId === c.customerId ? "..." : isDone ? "Unmark" : "Mark Done"}
        </Button>
      </td>
    </tr>
  );
}

export function CustomerTable({ customers }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(customers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCustomers = customers.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleMarkDone = async (customerId, isDone) => {
    setLoadingId(customerId);
    try {
      const method = isDone ? "DELETE" : "POST";
      await fetch(`/api/followup/${customerId}`, { method });
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    } finally {
      setLoadingId(null);
    }
  };

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-2">
          <UserIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">No match found</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Try adjusting your search or filters to find what you're looking for.
        </p>
        <Button variant="outline" className="rounded-xl mt-2" onClick={() => router.push(window.location.pathname)}>Clear all filters</Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-accent/30 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <th className="px-6 py-4 text-left font-bold">#</th>
              <th className="px-6 py-4 text-left font-bold">Customer Profile</th>
              <th className="px-6 py-4 text-left font-bold">Contact</th>
              <th className="px-6 py-4 text-left font-bold">Notes</th>
              <th className="px-6 py-4 text-left font-bold">Latest Transaction</th>
              <th className="px-6 py-4 text-left font-bold">Order Contents</th>
              <th className="px-6 py-4 text-left font-bold">Revenue</th>
              <th className="px-6 py-4 text-left font-bold">Follow-up Schedule</th>
              <th className="px-6 py-4 text-right font-bold">Execution</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((c, i) => (
              <CustomerRow
                key={c.customerId || i}
                index={(safePage - 1) * ITEMS_PER_PAGE + i}
                c={c}
                loadingId={loadingId}
                onMarkDone={handleMarkDone}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 gap-4 bg-accent/10">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Displaying <span className="text-foreground">{(safePage - 1) * ITEMS_PER_PAGE + 1}</span>–<span className="text-foreground">{Math.min(safePage * ITEMS_PER_PAGE, customers.length)}</span> of <span className="text-foreground">{customers.length}</span> entries
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-xl px-4 border-border/50 transition-all active:scale-95 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border/50 rounded-xl text-xs font-bold tabular-nums">
              <span className="text-primary">{safePage}</span>
              <span className="opacity-30">/</span>
              <span className="text-muted-foreground">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-xl px-4 border-border/50 transition-all active:scale-95 disabled:opacity-30"
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
