"use client";

import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { FollowupBadge } from "./FollowupBadge";
import { OrderTrackingBadge } from "./OrderTrackingBadge";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  PhoneIcon,
  UserIcon,
  BoxIcon,
  CalendarClockIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";

const ITEMS_PER_PAGE = 50;

function truncate(str, len = 40) {
  if (!str) return "";
  return str.length > len ? str.substring(0, len) + "..." : str;
}

function CustomerRow({ index, c, loadingId, onMarkDone, onUpdateNote, salesAgents = [] }) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(c.note || "");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isOverdue = c.followupStatus === "overdue";
  const isDueToday = c.followupStatus === "due-today";
  const isDone = c.followupStatus === "done";

  const handleSaveNote = async (val = noteValue) => {
    setIsSavingNote(true);
    try {
      const finalNote = val === "CLEAR_NOTE" ? "" : val;
      await onUpdateNote(c.customerId, finalNote);
      setNoteValue(finalNote);
      setIsEditingNote(false);
    } catch (err) {
      alert("Failed to update note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCancelNote = () => {
    setNoteValue(c.note || "");
    setIsEditingNote(false);
  };

  let bgClass = "hover:bg-accent/40 transition-all duration-300";
  if (isOverdue)
    bgClass = "bg-red-500/5 hover:bg-red-500/10 transition-all duration-300";
  if (isDueToday)
    bgClass =
      "bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-300";
  if (isDone)
    bgClass =
      "opacity-50 grayscale-[0.5] hover:opacity-80 transition-all duration-300";

  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—";

  return (
    <tr className={`${bgClass} border-b border-border/40 group`}>
      <td className="px-6 py-4 text-xs font-mono text-muted-foreground w-12">
        {index + 1}
      </td>

      {/* Name */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {name[0]}
          </div>
          <div className="flex flex-col min-w-0">
            {c.adminUrl ? (
              <a
                href={c.adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold hover:text-primary hover:underline transition-colors truncate flex items-center gap-1"
              >
                {name}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <span className="text-sm font-semibold truncate">{name}</span>
            )}
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
      <td className="px-6 py-4 max-w-[240px]">
        {isEditingNote ? (
          <div className="flex items-center gap-2">
            <select
              value={noteValue}
              onChange={(e) => handleSaveNote(e.target.value)}
              className="h-8 text-[11px] rounded-lg w-full bg-background border border-input px-2 focus:ring-1 focus:ring-primary outline-none"
              disabled={isSavingNote}
              autoFocus
            >
              <option value="">— Select Agent —</option>
              {salesAgents.map((agent) => (
                <option key={agent._id} value={agent.name}>
                  {agent.name}
                </option>
              ))}
              {noteValue && !salesAgents.find(a => a.name === noteValue) && (
                <option value={noteValue}>{noteValue} (Inactive)</option>
              )}
              <option value="CLEAR_NOTE" className="text-destructive font-bold">Clear Note</option>
            </select>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
              onClick={handleCancelNote}
              disabled={isSavingNote}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="group/note flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {c.note ? (
                <span className="text-sm font-semibold text-foreground truncate block bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                  {c.note}
                </span>
              ) : (
                <span className="text-muted-foreground opacity-30 text-xs italic">Not Assigned</span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover/note:opacity-100 transition-opacity hover:bg-accent rounded-lg"
              onClick={() => setIsEditingNote(true)}
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        )}
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
            {c.lastOrder?.processedAt
              ? new Date(c.lastOrder.processedAt).toLocaleDateString("en-GB")
              : "—"}
          </div>
        </div>
      </td>

      {/* Items */}
      <td className="px-6 py-4 max-w-[180px]">
        {c.lastOrder?.items?.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={(props) => (
                <span {...props} className="text-xs font-medium text-muted-foreground bg-accent/50 px-2.5 py-1 rounded-full border border-border/30 cursor-help truncate block">
                  {c.lastOrder.items.length} item                  {c.lastOrder.items.length > 1 ? "s" : ""}:{" "}
                  {truncate(
                    c.lastOrder.items.map((i) => i.title).join(", "),
                    20,
                  )}
                </span>
              )} />
              <TooltipContent className="max-w-xs p-4 rounded-3xl border-border/50 shadow-2xl">
                <div className="space-y-3">
                  <p className="font-bold text-xs uppercase tracking-widest opacity-60">
                    Order Contents
                  </p>
                  <ul className="space-y-2">
                    {c.lastOrder.items.map((i, idx) => (
                      <li
                        key={idx}
                        className="text-sm flex justify-between gap-4 border-b border-border/30 pb-1.5 last:border-0 last:pb-0"
                      >
                        <span className="font-medium">
                          {i.title}{" "}
                          {i.variantTitle && i.variantTitle !== "Default Title"
                            ? `(${i.variantTitle})`
                            : ""}
                        </span>
                        <span className="text-primary font-bold">
                          x{i.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground opacity-30">—</span>
        )}
      </td>

      {/* Order Tracking */}
      <td className="px-6 py-4 whitespace-nowrap">
        <OrderTrackingBadge 
          trackingNumbers={c.lastOrder?.trackingNumbers} 
          orderName={c.lastOrder?.name} 
          trackingCompany={c.lastOrder?.trackingCompany}
        />
      </td>

      {/* Amount */}
      <td className="px-6 py-4">
        <span className="text-sm font-bold tabular-nums">
          {c.lastOrder
            ? `Rs. ${Number(c.lastOrder.amount).toLocaleString()}`
            : "—"}
        </span>
      </td>

      {/* Follow-up */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          {c.followupDate ? (
            <>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                  isOverdue
                    ? "bg-red-500 text-white border-red-500/20"
                    : isDueToday
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      : isDone
                        ? "bg-muted text-muted-foreground border-border"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                }`}
              >
                <CalendarClockIcon className="w-3 h-3" />
                {c.followupDate}
              </div>
              <FollowupBadge status={c.followupStatus} />
            </>
          ) : (
            <span className="text-muted-foreground opacity-30">—</span>
          )}
        </div>
      </td>

      {/* Action */}
      <td className="px-6 py-4 text-right">
        <Button
          size="sm"
          variant={isDone ? "outline" : "default"}
          className={`rounded-xl h-9 px-4 text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 ${
            isDone
              ? "border-border/50 hover:bg-accent"
              : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
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

export function CustomerTable({ customers, onNoteUpdated }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [salesAgents, setSalesAgents] = useState([]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch("/api/users/sales-agents");
        const data = await res.json();
        if (data.success) {
          setSalesAgents(data.agents);
        }
      } catch (err) {
        console.error("Failed to fetch sales agents:", err);
      }
    }
    fetchAgents();
  }, []);

  const totalPages = Math.max(1, Math.ceil(customers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCustomers = customers.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
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

  const handleUpdateNote = async (customerId, note) => {
    try {
      // 1. Update UI Instantly (Optimistic Update)
      if (onNoteUpdated) onNoteUpdated(customerId, note);

      const res = await fetch(`/api/customers/${customerId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      
    } catch (e) {
      console.error(e);
      alert("Failed to sync note with Shopify. Please retry.");
      throw e;
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
        <Button
          variant="outline"
          className="rounded-xl mt-2"
          onClick={() => router.push(window.location.pathname)}
        >
          Clear all filters
        </Button>
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
              <th className="px-6 py-4 text-left font-bold">
                Customer Profile
              </th>
              <th className="px-6 py-4 text-left font-bold">Contact</th>
              <th className="px-6 py-4 text-left font-bold">Notes</th>
              <th className="px-6 py-4 text-left font-bold">
                Latest Transaction
              </th>
              <th className="px-6 py-4 text-left font-bold">Order Contents</th>
              <th className="px-6 py-4 text-center font-bold">Order Tracking</th>
              <th className="px-6 py-4 text-left font-bold">Revenue</th>
              <th className="px-6 py-4 text-left font-bold">
                Follow-up Schedule
              </th>
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
                onUpdateNote={handleUpdateNote}
                salesAgents={salesAgents}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 gap-4 bg-accent/10">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Displaying{" "}
            <span className="text-foreground">
              {(safePage - 1) * ITEMS_PER_PAGE + 1}
            </span>
            –
            <span className="text-foreground">
              {Math.min(safePage * ITEMS_PER_PAGE, customers.length)}
            </span>{" "}
            of <span className="text-foreground">{customers.length}</span>{" "}
            entries
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
