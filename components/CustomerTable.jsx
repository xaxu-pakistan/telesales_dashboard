"use client";

import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FollowupBadge } from "./FollowupBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, PhoneIcon, MailIcon, UserIcon, BoxIcon, CalendarClockIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 50;

function truncate(str, len = 40) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

// Row is a plain function, NOT a React component (no hooks inside)
function CustomerRow({ index, c, loadingId, onMarkDone }) {
  const isOverdue = c.followupStatus === "overdue";
  const isDueToday = c.followupStatus === "due-today";
  const isDone = c.followupStatus === "done";

  let bgClass = "border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-all duration-200 bg-black/40";
  if (isOverdue) bgClass = "border-b border-red-900/40 bg-red-950/10 hover:bg-red-900/20 transition-all duration-200";
  if (isDueToday) bgClass = "border-b border-amber-900/40 bg-amber-950/10 hover:bg-amber-900/20 transition-all duration-200";
  if (isDone) bgClass = "border-b border-zinc-900/40 bg-zinc-950/50 opacity-60 hover:bg-zinc-900/40 transition-all duration-200";

  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—";

  return (
    <div className={`flex items-center px-4 py-3 ${bgClass} group`}>
      <div className="w-12 shrink-0 text-zinc-500 text-sm font-light">{index + 1}</div>

      {/* Name */}
      <div className="w-48 shrink-0 pr-4 text-sm font-medium flex items-center gap-2 min-w-0">
        <UserIcon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0 transition-colors" />
        {c.adminUrl ? (
          <a href={c.adminUrl} target="_blank" rel="noopener noreferrer"
            className="text-zinc-200 hover:text-white hover:underline transition-colors truncate">
            {name}
          </a>
        ) : <span className="truncate">{name}</span>}
      </div>

      {/* Phone */}
      <div className="w-32 shrink-0 truncate pr-4 text-sm text-zinc-400 flex items-center gap-1.5">
        {c.phone ? <><PhoneIcon className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{c.phone}</span></> : "—"}
      </div>

      {/* Email */}
      <div className="w-48 shrink-0 truncate pr-4 text-sm text-zinc-400 flex items-center gap-1.5">
        {c.email ? <><MailIcon className="w-3 h-3 text-zinc-500 shrink-0" /><span className="truncate">{c.email}</span></> : "—"}
      </div>

      {/* Tags */}
      <div className="w-32 shrink-0 flex gap-1 flex-wrap pr-4 items-center">
        {c.tags && c.tags.length > 0 ? (
          <>
            {c.tags.slice(0, 2).map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-300 border-zinc-700">{t}</Badge>
            ))}
            {c.tags.length > 2 && <span className="text-xs text-zinc-500">+{c.tags.length - 2}</span>}
          </>
        ) : <span className="text-zinc-600">—</span>}
      </div>

      {/* Note */}
      <div className="w-48 shrink-0 pr-4 text-sm text-zinc-400 flex items-center">
        {c.note ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-zinc-600 hover:text-zinc-200 transition-colors">
                  {truncate(c.note)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-words bg-zinc-800 text-zinc-100 border-zinc-700 shadow-xl">
                <p>{c.note}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-zinc-600">—</span>}
      </div>

      {/* Last Order Name */}
      <div className="w-24 shrink-0 pr-4 text-sm text-zinc-300 flex items-center gap-1.5">
        {c.lastOrder?.name ? (
          <><BoxIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" /><span className="truncate">{c.lastOrder.name}</span></>
        ) : <span className="text-zinc-600">—</span>}
      </div>

      {/* Order Date */}
      <div className="w-32 shrink-0 pr-4 text-sm text-zinc-400 flex items-center gap-1.5">
        {c.lastOrder?.processedAt ? (
          <><CalendarIcon className="w-3 h-3 text-zinc-500 shrink-0" />{new Date(c.lastOrder.processedAt).toLocaleDateString("en-GB")}</>
        ) : <span className="text-zinc-600">—</span>}
      </div>

      {/* Items */}
      <div className="w-48 shrink-0 pr-4 text-sm text-zinc-400 flex items-center">
        {c.lastOrder?.items?.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-zinc-600 truncate max-w-full hover:text-zinc-200 transition-colors">
                  {truncate(c.lastOrder.items.map(i => i.title).join(", "), 30)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-words bg-zinc-800 text-zinc-100 border-zinc-700 shadow-xl">
                <p>{c.lastOrder.items.map(i => i.title).join(", ")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-zinc-600">—</span>}
      </div>

      {/* Amount */}
      <div className="w-24 shrink-0 pr-4 text-sm font-semibold text-emerald-400">
        {c.lastOrder ? `Rs. ${Number(c.lastOrder.amount).toLocaleString()}` : <span className="text-zinc-600">—</span>}
      </div>

      {/* Follow-up Date */}
      <div className="w-32 shrink-0 pr-4 flex items-center">
        {c.followupDate ? (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shadow-sm ${
            isOverdue   ? "bg-red-500/10 text-red-400 border-red-500/20" :
            isDueToday  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            isDone      ? "bg-zinc-800/50 text-zinc-500 border-zinc-700/50" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
          }`}>
            <CalendarClockIcon className="w-3.5 h-3.5 shrink-0" />
            {c.followupDate}
          </div>
        ) : (
          <span className="text-sm text-zinc-600">—</span>
        )}
      </div>

      {/* Status Badge */}
      <div className="w-32 shrink-0 pr-4 flex items-center">
        <FollowupBadge status={c.followupStatus} />
      </div>

      {/* Action */}
      <div className="w-24 shrink-0 flex items-center justify-end">
        <Button
          size="sm"
          variant={isDone ? "outline" : "default"}
          className={!isDone
            ? "bg-white text-black hover:bg-zinc-200 text-xs"
            : "bg-black text-white hover:bg-zinc-900 border-zinc-800 text-xs"}
          disabled={loadingId === c.customerId}
          onClick={() => onMarkDone(c.customerId, isDone)}
        >
          {loadingId === c.customerId ? "..." : isDone ? "Unmark" : "Mark Done"}
        </Button>
      </div>
    </div>
  );
}

export function CustomerTable({ customers }) {
  const router = useRouter();

  // ✅ ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS
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

  // ✅ Early return AFTER all hooks
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/50 border border-zinc-900 rounded-lg">
        <p className="text-zinc-400 mb-4 text-lg">No customers match your filters</p>
        <Button onClick={() => router.push(window.location.pathname)}>Reset Filters</Button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto border border-zinc-800/60 rounded-xl bg-black/40 backdrop-blur-xl shadow-2xl">
      <div className="min-w-[1400px]">
        {/* Header */}
        <div className="flex items-center px-4 py-3 bg-zinc-900/80 border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <div className="w-12 shrink-0">#</div>
          <div className="w-48 shrink-0 pr-4">Customer Name</div>
          <div className="w-32 shrink-0 pr-4">Phone</div>
          <div className="w-48 shrink-0 pr-4">Email</div>
          <div className="w-32 shrink-0 pr-4">Tags</div>
          <div className="w-48 shrink-0 pr-4">Note</div>
          <div className="w-24 shrink-0 pr-4">Last Order</div>
          <div className="w-32 shrink-0 pr-4">Order Date</div>
          <div className="w-48 shrink-0 pr-4">Items</div>
          <div className="w-24 shrink-0 pr-4">Amount</div>
          <div className="w-32 shrink-0 pr-4">Follow-up Date</div>
          <div className="w-32 shrink-0 pr-4">Status</div>
          <div className="w-24 shrink-0 text-right">Action</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {paginatedCustomers.map((c, i) => (
            <CustomerRow
              key={c.customerId || i}
              index={(safePage - 1) * ITEMS_PER_PAGE + i}
              c={c}
              loadingId={loadingId}
              onMarkDone={handleMarkDone}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-900/80 border-t border-zinc-800/80 text-sm">
          <div className="text-zinc-400 font-medium">
            Showing{" "}
            <span className="text-zinc-200">{(safePage - 1) * ITEMS_PER_PAGE + 1}</span>
            {" "}–{" "}
            <span className="text-zinc-200">{Math.min(safePage * ITEMS_PER_PAGE, customers.length)}</span>
            {" "}of{" "}
            <span className="text-zinc-200">{customers.length}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="px-3 font-medium text-zinc-400 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
