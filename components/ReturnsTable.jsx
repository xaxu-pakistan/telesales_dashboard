"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  BoxIcon,
  UserIcon,
  CalendarIcon,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

function ReturnRow({ index, r }) {
  const statusColor = {
    OPEN: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    CLOSED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  }[r.status] || "bg-muted text-muted-foreground";

  const customerName = `${r.customer?.firstName || ""} ${r.customer?.lastName || ""}`.trim() || "—";
  const storeName = process.env.NEXT_PUBLIC_SHOPIFY_STORE?.replace(".myshopify.com", "") || "xaxu-pakistan";
  const returnUrl = `https://admin.shopify.com/store/${storeName}/returns/${r.shopifyId}`;

  return (
    <tr className="hover:bg-accent/40 transition-all duration-300 border-b border-border/40 group">
      <td className="px-6 py-4 text-xs font-mono text-muted-foreground w-12">
        {index + 1}
      </td>

      {/* Return Profile */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1">
          <a
            href={returnUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold hover:text-primary hover:underline transition-colors flex items-center gap-1"
          >
            {r.name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
             <CalendarIcon className="w-3 h-3" />
             {r.returnCreatedAt ? format(new Date(r.returnCreatedAt), "dd MMM yyyy") : "—"}
          </div>
        </div>
      </td>

      {/* Customer */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 uppercase">
             {customerName[0]}
           </div>
           <div className="flex flex-col">
              <span className="text-sm font-semibold">{customerName}</span>
              <span className="text-xs text-muted-foreground">{r.customer?.email}</span>
           </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <Badge variant="outline" className={`${statusColor} rounded-full text-[10px] font-bold uppercase tracking-wider`}>
          {r.status}
        </Badge>
      </td>

      {/* Associated Order */}
      <td className="px-6 py-4">
         <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <BoxIcon className="w-3 h-3" />
            {r.order?.name || "—"}
         </div>
      </td>

      {/* Items */}
      <td className="px-6 py-4 max-w-[200px]">
        {r.returnLineItems?.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-medium text-muted-foreground bg-accent/50 px-2.5 py-1 rounded-full border border-border/30 cursor-help truncate block">
                  {r.totalQuantity} items: {r.returnLineItems[0].title}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-4 rounded-3xl border-border/50 shadow-2xl">
                 <div className="space-y-2">
                    {r.returnLineItems.map((item, idx) => (
                      <div key={idx} className="text-sm flex flex-col border-b border-border/30 pb-2 last:border-0 last:pb-0">
                         <span className="font-bold">{item.title} x {item.quantity}</span>
                         {item.returnReason && <span className="text-xs text-muted-foreground italic">Reason: {item.returnReason}</span>}
                         {item.returnReasonNote && <span className="text-xs opacity-70 italic">{item.returnReasonNote}</span>}
                      </div>
                    ))}
                 </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : "—"}
      </td>
    </tr>
  );
}

export function ReturnsTable({ returns }) {
  if (returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
        <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-2">
          <BoxIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">No returns found</h3>
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
              <th className="px-6 py-4 text-left font-bold">Return ID</th>
              <th className="px-6 py-4 text-left font-bold">Customer</th>
              <th className="px-6 py-4 text-left font-bold">Status</th>
              <th className="px-6 py-4 text-left font-bold">Order</th>
              <th className="px-6 py-4 text-left font-bold">Items Returned</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r, i) => (
              <ReturnRow key={r.shopifyId || i} index={i} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
