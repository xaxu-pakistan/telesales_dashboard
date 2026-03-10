"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FilterX, Search } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

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
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  return (
    <div className="flex flex-col gap-4 mb-8 p-5 bg-zinc-900/30 backdrop-blur-xl border border-zinc-800/60 rounded-xl shadow-2xl">
      <div className="flex flex-wrap gap-4 items-end">
        
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Search</label>
          <Input 
            placeholder="Name, email, phone..." 
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-black/50 border-zinc-800 focus-visible:ring-zinc-700"
          />
        </div>

        <div className="min-w-[150px]">
          <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Status</label>
          <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
            <SelectTrigger className="bg-black/50 border-zinc-800">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due-today">Due Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end mt-2">
        <div className="flex gap-3">
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Order From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-[150px] justify-start text-left font-normal bg-black/50 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors ${!dateFrom && "text-zinc-500"}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(new Date(dateFrom), "MMM d, yyyy") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-zinc-800 bg-zinc-900">
                <Calendar 
                  mode="single" 
                  selected={dateFrom ? new Date(dateFrom) : undefined}
                  onSelect={(d) => updateFilter("dateFrom", d ? d.toISOString() : "")}
                  initialFocus
                  className="bg-zinc-900 text-zinc-100 placeholder-zinc-400"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="min-w-[150px]">
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Order To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`w-[150px] justify-start text-left font-normal bg-black/50 border-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors ${!dateTo && "text-zinc-500"}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(new Date(dateTo), "MMM d, yyyy") : <span>Pick date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-zinc-800 bg-zinc-900">
                <Calendar 
                  mode="single" 
                  selected={dateTo ? new Date(dateTo) : undefined}
                  onSelect={(d) => updateFilter("dateTo", d ? d.toISOString() : "")}
                  initialFocus
                  className="bg-zinc-900 text-zinc-100 placeholder-zinc-400"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex-1"></div>

        <Button variant="ghost" onClick={resetFilters} className="text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <FilterX className="mr-2 h-4 w-4" /> Reset Filters
        </Button>
      </div>
    </div>
  );
}