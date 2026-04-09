"use client";

import { useEffect, useState, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCcw,
  Loader2,
  Search,
  XCircle,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount, currency = "PKR") {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function reasonLabel(reason) {
  const map = {
    customer: "Customer Request",
    fraud: "Fraud",
    inventory: "Inventory",
    declined: "Declined",
    other: "Other",
  };
  return map[reason?.toLowerCase?.()] ?? reason ?? "—";
}

function reasonColor(reason) {
  const map = {
    customer: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    fraud: "bg-red-500/10 text-red-400 border-red-500/20",
    inventory: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    declined: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    other: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return map[reason?.toLowerCase?.()] ?? "bg-muted/50 text-muted-foreground border-border";
}

function financialBadgeColor(status) {
  const map = {
    REFUNDED: "bg-green-500/10 text-green-400 border-green-500/20",
    PARTIALLY_REFUNDED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    VOIDED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return map[status] ?? "bg-muted/50 text-muted-foreground border-border";
}

// ─── Row Component ───────────────────────────────────────────────────────────

function OrderRow({ order }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden bg-card hover:shadow-lg transition-all duration-200">
      {/* Main row */}
      <div
        className="flex flex-col md:flex-row md:items-center gap-3 p-5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Order name + cancelled at */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base tracking-tight">{order.name}</span>
            <span className="text-xs text-muted-foreground">
              {order.cancelledAt
                ? new Date(order.cancelledAt).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {order.customer?.displayName || "Guest"} •{" "}
            {order.customer?.email || "—"}
            {order.customer?.phone ? ` • ${order.customer.phone}` : ""}
          </p>
        </div>

        {/* Price */}
        <div className="flex flex-col items-start md:items-end shrink-0">
          <span className="text-lg font-bold text-foreground">
            {formatCurrency(order.totalPrice, order.currencyCode)}
          </span>
          <span className="text-xs text-muted-foreground">
            {order.lineItems?.length ?? 0} item(s)
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {order.cancelReason && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${reasonColor(order.cancelReason)}`}
            >
              {reasonLabel(order.cancelReason)}
            </span>
          )}
          {order.displayFinancialStatus && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${financialBadgeColor(order.displayFinancialStatus)}`}
            >
              {order.displayFinancialStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <div className="text-muted-foreground shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded line items */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/20 px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            Line Items
          </h4>
          {order.lineItems && order.lineItems.length > 0 ? (
            <div className="space-y-2">
              {order.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm bg-background/60 border border-border/30 rounded-xl px-4 py-2.5"
                >
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      × {item.quantity}
                    </span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.unitPrice * item.quantity, order.currencyCode)}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({formatCurrency(item.unitPrice, order.currencyCode)} each)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No line items found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Content ────────────────────────────────────────────────────────────

const CANCEL_REASONS = ["all", "customer", "fraud", "inventory", "declined", "other"];
const FINANCIAL_STATUSES = ["all", "REFUNDED", "PARTIALLY_REFUNDED", "VOIDED", "PAID"];

function CancelledOrdersContent() {
  const [data, setData] = useState({ orders: [], total: 0, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [cancelReason, setCancelReason] = useState("all");
  const [financialStatus, setFinancialStatus] = useState("all");

  const loadOrders = async (isSync = false) => {
    if (!isSync) setLoading(true);
    else setSyncing(true);

    try {
      const params = new URLSearchParams({
        search,
        cancelReason,
        financialStatus,
        sync: isSync ? "true" : "false",
      });
      const res = await fetch(`/api/cancelled-orders?${params}`);
      const json = await res.json();

      if (json.error) {
        console.error("Cancelled Orders API Error:", json.error);
        return;
      }

      if (!isSync) {
        setData({
          orders: json.orders || [],
          total: json.total || 0,
          hasNextPage: json.hasNextPage || false,
        });
      } else {
        setTimeout(() => loadOrders(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadOrders(), 400);
    return () => clearTimeout(timer);
  }, [search, cancelReason, financialStatus]);

  const totalValue = data.orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Cancelled Orders
            </h1>
          </div>
          <p className="text-muted-foreground font-medium text-sm flex items-center gap-2 pl-1 mt-1">
            Showing{" "}
            <span className="text-foreground font-bold">
              {data.total || data.orders.length}
            </span>{" "}
            cancelled orders
            {data.orders.length > 0 && (
              <>
                {" "}·{" "}
                <span className="text-foreground font-bold">
                  {formatCurrency(totalValue, data.orders[0]?.currencyCode)}
                </span>{" "}
                total value
              </>
            )}
            {(loading || syncing) && (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            )}
          </p>
        </div>

        <Button
          onClick={() => loadOrders(true)}
          variant="outline"
          className="rounded-xl"
          disabled={syncing}
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync Orders"}
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by order name, customer name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Cancel reason filter */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Cancel Reason
          </p>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => (
              <Button
                key={r}
                variant={cancelReason === r ? "default" : "outline"}
                onClick={() => setCancelReason(r)}
                className="rounded-xl capitalize text-xs h-9 px-4"
              >
                {r === "all" ? "All Reasons" : reasonLabel(r)}
              </Button>
            ))}
          </div>
        </div>

        {/* Financial status filter */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Financial Status
          </p>
          <div className="flex flex-wrap gap-2">
            {FINANCIAL_STATUSES.map((s) => (
              <Button
                key={s}
                variant={financialStatus === s ? "default" : "outline"}
                onClick={() => setFinancialStatus(s)}
                className="rounded-xl text-xs h-9 px-4"
              >
                {s === "all" ? "All Statuses" : s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders list */}
      <main>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : data.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/30">
              <XCircle className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-base font-medium">No cancelled orders found</p>
            <p className="text-sm opacity-60">
              Try adjusting your filters or sync to load latest data.
            </p>
            <Button
              onClick={() => loadOrders(true)}
              variant="outline"
              className="rounded-xl mt-2"
              disabled={syncing}
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.orders.map((order) => (
              <OrderRow key={order._id || order.shopifyId || order.name} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CancelledOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">
          <Loader2 className="animate-spin mx-auto w-8 h-8" />
        </div>
      }
    >
      <CancelledOrdersContent />
    </Suspense>
  );
}
