"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle } from "@/components/ui/popover";
import { Loader2, Package, MapPin, Calendar, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

export function OrderTrackingBadge({ trackingNumbers, orderName, trackingCompany }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const companyLower = trackingCompany?.toLowerCase() || "";
  const isPostEx = companyLower.includes("postex") || companyLower.includes("postx");
  const isTrax = companyLower.includes("trax") || companyLower.includes("sonic") || companyLower.includes("trax logistics");
  const isSonic = companyLower.includes("sonic");
  const hasTracking = trackingNumbers?.length > 0;
  
  // Rule 1: If it's fulfilled with another carrier, show that carrier's name
  if (trackingCompany && !isPostEx && !isTrax) {
    return <span className="text-muted-foreground opacity-30 text-xs italic">{trackingCompany}</span>;
  }

  // Rule 2: ONLY show the Track button if it's explicitly a PostEx or Trax order
  // This hides the button for unfulfilled/unbooked orders where trackingCompany is null
  if (!isPostEx && !isTrax) {
    return <span className="text-muted-foreground opacity-30 text-xs">—</span>;
  }

  const carrierName = isPostEx ? "PostEx" : isSonic ? "Sonic" : isTrax ? "Trax" : trackingCompany;

  const trackingNumber = trackingNumbers?.[0] || "null"; 

  // Derived tracking number to display in the UI (from PostX or Trax response if available)
  const distObj = Array.isArray(data?.dist) ? data.dist[0] : data?.dist;
  const realTN = distObj?.trackingNumber || 
                 distObj?.consignmentNumber ||
                 distObj?.tracking_number ||
                 distObj?.barcode ||
                 distObj?.tracking_no ||
                 distObj?.cn ||
                 data?.trackingNumber || 
                 data?.barcode ||
                 data?.details?.tracking_number ||
                 (trackingNumber !== "null" ? trackingNumber : null);

  const displayLabel = realTN ? "Tracking Number" : "Order Reference";
  const displayText = realTN || orderName;

  const handleOpenChange = async (open) => {
    setIsOpen(open);
    if (!open) setShowRaw(false); // Reset debug view on close
    if (open && !data && !loading && !error) {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (orderName) queryParams.append("orderReference", orderName);
        if (isTrax) queryParams.append("carrier", "trax");
        else if (isPostEx) queryParams.append("carrier", "postex");

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const res = await fetch(`/api/tracking/${encodeURIComponent(trackingNumber)}${queryString}`);
        const json = await res.json();
        
        // Save the JSON even if it's an error so we can see debugAttempts
        if (!res.ok) {
          setData(json); // Store for debug view
          throw new Error(json.error || "Failed to fetch tracking");
        }
        
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("delivered")) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (s.includes("transit") || s.includes("shipped") || s.includes("progress") || s.includes("dispatch")) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (s.includes("failed") || s.includes("return") || s.includes("cancel") || s.includes("exception")) return "text-red-500 bg-red-500/10 border-red-500/20";
    return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  };

  return (
    <Popover defaultOpen={false} open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger 
        nativeButton={false}
        render={
          <div className="flex flex-col items-center gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 rounded-full px-4 text-[10px] font-bold shadow-sm border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-600 transition-colors uppercase tracking-tight"
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Track
          </Button>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {carrierName}
          </span>
        </div>
      } />
      
      <PopoverContent className="w-80 p-0 overflow-hidden shadow-2xl border-border/50" align="start">
        <PopoverHeader className="bg-accent/40 p-4 border-b border-border/50">
          <PopoverTitle className="flex justify-between items-center text-sm">
            <span className="font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> {displayLabel}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50">
              {displayText}
            </span>
          </PopoverTitle>
        </PopoverHeader>

        <div className="p-4 max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
              <p className="text-xs text-muted-foreground animate-pulse">Connecting to tracking API...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="flex flex-col items-center text-center py-4 text-destructive space-y-2">
                  <AlertCircle className="w-8 h-8 opacity-80" />
                  <p className="text-sm font-medium">{error}</p>
                  <Button variant="ghost" size="sm" onClick={() => { setError(null); handleOpenChange(true); }} className="mt-2 text-xs">
                    Retry
                  </Button>
                </div>
              ) : data ? (
                <>
                  {/* Latest Status Header */}
                  {(() => {
                    const distObj = Array.isArray(data?.dist) ? data.dist[0] : data?.dist;
                    const history = distObj?.transactionStatusHistory || 
                                   distObj?.transactionHistory ||
                                   distObj?.trackingHistory || 
                                   data?.transactionStatusHistory || 
                                   data?.transactionHistory ||
                                   data?.trackingHistory || 
                                   data?.details?.tracking_history ||
                                   data?.data?.history || 
                                   data?.history || 
                                   (Array.isArray(data) ? data : []);
                    
                    // Prioritize descriptive status strings over numeric status codes
                    const currentStatus = distObj?.transactionStatus ||
                                         data?.current_status ||
                                         data?.transactionStatus ||
                                         distObj?.orderStatus || 
                                         data?.orderStatus || 
                                         data?.data?.orderStatus ||
                                         data?.data?.status ||
                                         (history && history.length > 0 ? (history[0].transactionStatus || history[0].status || history[0].statusReason || history[0].status_description) : null) ||
                                         distObj?.status || 
                                         data?.status || 
                                         "Unknown";
                    
                    const statusStr = String(currentStatus);

                    return (
                      <div className={`p-3 rounded-xl border flex items-center gap-3 ${getStatusColor(currentStatus)}`}>
                        {statusStr.toLowerCase().includes("delivered") ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Package className="w-5 h-5" />
                        )}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-80">Current Status</p>
                          <p className="text-sm font-semibold">{statusStr}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* History Timeline */}
                  {(() => {
                    const distObj = Array.isArray(data?.dist) ? data.dist[0] : data?.dist;
                    let history = distObj?.transactionStatusHistory || 
                                 distObj?.transactionHistory ||
                                 distObj?.trackingHistory || 
                                 data?.transactionStatusHistory || 
                                 data?.transactionHistory ||
                                 data?.trackingHistory || 
                                 data?.details?.tracking_history ||
                                 data?.data?.history || 
                                 data?.history || 
                                 (Array.isArray(data) ? data : []);
                    
                    if (history && Array.isArray(history) && history.length > 0) {
                      let sortedHistory = [...history];
                      
                      // For general safety, just reverse it if it looks like the first item is older than the last.
                      if (sortedHistory.length > 1) {
                         const getTs = (h) => {
                            const d = h.updatedAt || h.transactionDate || h.transaction_date || h.date || h.created_at || h.transactionStatusDate || h.dateTime || h.date_time || (h.timestamp ? h.timestamp * 1000 : null);
                            return d ? new Date(d).getTime() : 0;
                         };
                         if (getTs(sortedHistory[0]) < getTs(sortedHistory[sortedHistory.length - 1])) {
                             sortedHistory.reverse();
                         }
                      } else {
                         sortedHistory = [...history].reverse(); // default previous behavior
                      }

                      return (
                        <div className="relative pl-4 space-y-4 before:absolute before:inset-y-2 before:left-[7px] before:w-[2px] before:bg-border/60">
                          {sortedHistory.map((h, idx) => (
                            <div key={idx} className="relative z-10 flex gap-3 pb-1">
                              <div className="w-4 h-4 rounded-full bg-background border-2 border-primary mt-0.5 shrink-0 shadow-sm" />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-tight">{h.transactionStatus || h.status || h.statusReason || h.status_description || h.status_name}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> 
                                    {(() => {
                                      const dateVal = h.updatedAt || h.transactionDate || h.transaction_date || h.date || h.created_at || h.transactionStatusDate || h.dateTime || h.date_time || (h.timestamp ? h.timestamp * 1000 : null);
                                      return dateVal ? new Date(dateVal).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "N/A";
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <p className="text-xs text-muted-foreground text-center py-4">Detailed history not available.</p>;
                  })()}

                  {(data?.dist?.trackingUrl || data?.trackingUrl || data?.url || data?.data?.trackingUrl || (data?.tracked_carrier === "trax" && data?.details?.tracking_number && `https://sonic.pk/tracking?tracking_number=${data.details.tracking_number}`)) && (
                    <a 
                      href={data?.dist?.trackingUrl || data?.trackingUrl || data?.url || data?.data?.trackingUrl || (data?.tracked_carrier === "trax" ? `https://sonic.pk/tracking?tracking_number=${data?.details?.tracking_number}` : "#")} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline py-2 bg-blue-500/5 rounded-lg transition-colors border border-blue-500/10"
                    >
                      View on Courier Website <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Tracking information not found.</p>
              )}

              {/* Debug Toggle (Always available) */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowRaw(!showRaw)} 
                  className="w-full text-[10px] text-muted-foreground hover:text-foreground opacity-50"
                >
                  {showRaw ? "Hide Debug Info" : "Show Debug Info"}
                </Button>
                {showRaw && (
                  <div className="mt-2 p-2 bg-slate-900 rounded text-[9px] text-slate-300 font-mono overflow-x-auto max-h-[150px]">
                    <pre>{JSON.stringify(data || { status: "No data", error }, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
