"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FilterX, Search } from "lucide-react";
import { format, parse, isValid } from "date-fns";

export function Filters({ uniqueTags = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  // Stable debounce refs
  const searchTimerRef = useRef(null);

  // Build query string always from *current* URL (not from searchParams object)
  const buildQuery = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== '' && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    return params.toString();
  }, [searchParams]);

  const pushDebounced = (timerRef, key, value, delay = 500) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const qs = buildQuery(key, value);
      router.push(pathname + (qs ? '?' + qs : ''));
    }, delay);
  };

  const handleSearchChange = (v) => {
    setSearch(v);
    pushDebounced(searchTimerRef, 'search', v);
  };

  const updateFilter = useCallback((key, value) => {
    const qs = buildQuery(key, value);
    router.push(pathname + (qs ? '?' + qs : ''));
  }, [buildQuery, pathname, router]);

  const resetFilters = () => {
    setSearch("");
    clearTimeout(searchTimerRef.current);
    router.push(pathname);
  };

  const status = searchParams.get("status") || "all";
  const dateFromStr = searchParams.get("dateFrom");
  const dateToStr = searchParams.get("dateTo");

  const dateFrom = dateFromStr ? parse(dateFromStr, "yyyy-MM-dd", new Date()) : null;
  const dateTo = dateToStr ? parse(dateToStr, "yyyy-MM-dd", new Date()) : null;

  return (
    <div className="bg-card/50 backdrop-blur-md border border-border/40 p-6 rounded-3xl shadow-sm space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Search Database</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Name, email, phone..." 
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-border/50 rounded-2xl focus-visible:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="min-w-[200px] space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Status Filter</label>
          <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger className="h-11 bg-background/50 border-border/50 rounded-2xl focus:ring-primary/20">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50 shadow-xl overflow-hidden">
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="overdue" className="text-red-500 font-medium focus:text-red-600">Overdue Only</SelectItem>
              <SelectItem value="due-today" className="text-amber-500 font-medium focus:text-amber-600">Due Today</SelectItem>
              <SelectItem value="upcoming" className="text-emerald-500 font-medium focus:text-emerald-600">Upcoming</SelectItem>
              <SelectItem value="done" className="opacity-60">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="space-y-1.5 flex-1 sm:flex-none">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Order From</label>
            <Popover>
              <PopoverTrigger render={(props) => (
                <Button {...props} variant="outline" className={`h-11 min-w-[160px] w-full justify-start text-left font-medium bg-background/50 border-border/50 rounded-2xl hover:bg-accent transition-all ${!dateFromStr && "text-muted-foreground"}`}>
                  <CalendarIcon className="mr-2.5 h-4 w-4 opacity-70" />
                  {dateFrom && isValid(dateFrom) ? format(dateFrom, "MMM d, yyyy") : <span>Pick date</span>}
                </Button>
              )} />
              <PopoverContent className="w-auto p-0 border-border/50 rounded-3xl overflow-hidden shadow-2xl" align="start">
                <Calendar 
                  mode="single" 
                  selected={dateFrom || undefined}
                  onSelect={(d) => updateFilter("dateFrom", d ? format(d, "yyyy-MM-dd") : "")}
                  initialFocus
                  className="bg-card text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-1.5 flex-1 sm:flex-none">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Order To</label>
            <Popover>
              <PopoverTrigger render={(props) => (
                <Button {...props} variant="outline" className={`h-11 min-w-[160px] w-full justify-start text-left font-medium bg-background/50 border-border/50 rounded-2xl hover:bg-accent transition-all ${!dateToStr && "text-muted-foreground"}`}>
                  <CalendarIcon className="mr-2.5 h-4 w-4 opacity-70" />
                  {dateTo && isValid(dateTo) ? format(dateTo, "MMM d, yyyy") : <span>Pick date</span>}
                </Button>
              )} />
              <PopoverContent className="w-auto p-0 border-border/50 rounded-3xl overflow-hidden shadow-2xl" align="start">
                <Calendar 
                  mode="single" 
                  selected={dateTo || undefined}
                  onSelect={(d) => updateFilter("dateTo", d ? format(d, "yyyy-MM-dd") : "")}
                  initialFocus
                  className="bg-card text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="lg:mt-auto">
          <Button 
            variant="ghost" 
            onClick={resetFilters} 
            className="h-11 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-accent px-5 transition-all font-semibold"
          >
            <FilterX className="mr-2 h-4 w-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
