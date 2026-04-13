"use client";

import { useEffect, useState, Suspense } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  RefreshCcw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function StatCard({ title, value, subValue, icon: Icon, color, trend, trendValue }) {
  return (
    <div className="bg-card border border-border/40 p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 shadow-inner`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-muted-foreground text-sm font-semibold mb-1 uppercase tracking-wider">{title}</h3>
        <div className="flex flex-col">
          <span className="text-3xl font-extrabold tracking-tight">{value}</span>
          {subValue && <span className="text-xs text-muted-foreground mt-1 font-medium">{subValue}</span>}
        </div>
      </div>
    </div>
  );
}

function RecentItem({ item, type }) {
  const isReturn = type === 'return';
  const date = new Date(isReturn ? item.returnCreatedAt : item.cancelledAt);
  const value = isReturn ? item.order?.totalPrice : item.totalPrice;
  const name = isReturn ? item.name : item.name;
  const customer = isReturn ? item.customer?.email : item.customer?.displayName;

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${isReturn ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
          {isReturn ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-bold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{customer} • {date.toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-sm">{formatCurrency(value)}</p>
        <p className="text-[10px] text-muted-foreground uppercase">{isReturn ? item.status : item.cancelReason || 'Cancelled'}</p>
      </div>
    </div>
  );
}

function AnalyticsDashboardContent() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${y}-${m}`, label });
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  const fetchStats = async (monthVal = selectedMonth, yearVal = selectedYear) => {
    setLoading(true);
    try {
      let url = "/api/analytics";
      const params = new URLSearchParams();
      if (monthVal && yearVal) {
        params.append("month", monthVal);
        params.append("year", yearVal);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setSelectedMonth("");
      setSelectedYear("");
      fetchStats("", "");
    } else {
      const [year, month] = val.split("-");
      setSelectedMonth(month);
      setSelectedYear(year);
      fetchStats(month, year);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);


  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] rounded-3xl" />
          <Skeleton className="h-[400px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/50">
            Performance Overview
          </h1>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            Real-time shopified analytics and telesales metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <select 
            onChange={handleMonthChange}
            value={selectedMonth ? `${selectedYear}-${selectedMonth}` : ""}
            className="bg-card border border-border/50 rounded-2xl h-11 px-4 text-sm font-semibold outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer min-w-[200px]"
          >
            <option value="">Last 30 Days (Rolling)</option>
            {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button onClick={() => fetchStats()} variant="outline" className="rounded-2xl h-11 px-6 shadow-sm">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard 
          title={`Returns Loss ${selectedMonth ? "" : "(30d)"}`} 
          value={formatCurrency(stats?.returns?.value)}
          subValue={`${stats?.returns?.count} orders returned`}
          icon={TrendingDown}
          color="bg-amber-500"
          trend="down"
          trendValue="8.4%"
        />
        <StatCard 
          title={`Cancelled Loss ${selectedMonth ? "" : "(30d)"}`} 
          value={formatCurrency(stats?.cancelled?.value)}
          subValue={`${stats?.cancelled?.count} orders cancelled`}
          icon={TrendingUp}
          color="bg-red-500"
          trend="up"
          trendValue="2.1%"
        />
        <StatCard 
          title="Active Prospects" 
          value={stats?.customers?.overdue + stats?.customers?.dueToday + stats?.customers?.upcoming}
          subValue={`${stats?.customers?.overdue} overdue items`}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard 
          title="Conversion" 
          value={stats?.customers?.completed}
          subValue="Followups completed"
          icon={CheckCircle2}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Followup Status Distribution */}
        <div className="lg:col-span-1 bg-card border border-border/40 p-8 rounded-[2.5rem] shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Prospect Funnel
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2 font-bold">
                <span className="text-red-400">Overdue</span>
                <span>{stats?.customers?.overdue}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${(stats?.customers?.overdue / (stats?.customers?.overdue + stats?.customers?.dueToday + stats?.customers?.upcoming || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-bold">
                <span className="text-amber-400">Due Today</span>
                <span>{stats?.customers?.dueToday}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500" 
                  style={{ width: `${(stats?.customers?.dueToday / (stats?.customers?.overdue + stats?.customers?.dueToday + stats?.customers?.upcoming || 1)) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-bold">
                <span className="text-emerald-400">Upcoming</span>
                <span>{stats?.customers?.upcoming}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${(stats?.customers?.upcoming / (stats?.customers?.overdue + stats?.customers?.dueToday + stats?.customers?.upcoming || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/40">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <AlertCircle className="w-5 h-5 text-primary" />
                <p className="text-xs font-medium leading-relaxed">
                  Focus on <span className="text-primary font-bold">{stats?.customers?.overdue}</span> overdue prospects to improve conversion rate.
                </p>
              </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border/40 p-8 rounded-[2.5rem] shadow-sm overflow-hidden">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Recent Volatility
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded">Latest Returns</h4>
              <div className="space-y-3">
                {stats?.recent?.returns?.map(item => <RecentItem key={item._id} item={item} type="return" />)}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded">Latest Cancellations</h4>
              <div className="space-y-3">
                {stats?.recent?.cancelled?.map(item => <RecentItem key={item._id} item={item} type="cancelled" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <AnalyticsDashboardContent />
    </Suspense>
  );
}
