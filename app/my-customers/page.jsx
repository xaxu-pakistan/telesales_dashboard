"use client";

import { useEffect, useState, Suspense } from "react";
import { CustomerTable } from "@/components/CustomerTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Users, AlertCircle, Clock, CalendarCheck, ShieldCheck } from "lucide-react";

function StatCard({ title, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-card border border-border/50 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function MyCustomersContent() {
  const [data, setData] = useState({ customers: [], total: 0 });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyCustomers = async () => {
      try {
        // 1. Get current user profile
        const userRes = await fetch("/api/users/me");
        const userData = await userRes.json();
        
        if (!userData.success) {
          throw new Error("Could not identify user");
        }
        
        setUser(userData.user);

        // RBAC: Only sales agent should see this
        if (userData.user.role !== "sales agent") {
          setData({ customers: [], total: 0 });
          return;
        }

        // 2. Fetch customers assigned to this user
        // We use the agent name to filter the 'note' field
        const customerRes = await fetch(`/api/customers?agent=${encodeURIComponent(userData.user.name)}`);
        const customerData = await customerRes.json();
        
        setData(customerData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCustomers();
  }, []);

  const handleUpdateNoteLocal = (customerId, note) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => 
        (c.customerId === customerId || c.id === customerId) ? { ...c, note } : c
      )
    }));
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-8">
        <header className="mb-10 space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-xl" />
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-8 rounded-3xl flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  const overdueCount = data.customers.filter(c => c.followupStatus === "overdue").length;
  const dueTodayCount = data.customers.filter(c => c.followupStatus === "due-today").length;
  const upcomingCount = data.customers.filter(c => c.followupStatus === "upcoming").length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">My Assigned Customers</h1>
        </div>
        <p className="text-muted-foreground font-medium text-sm">
          Currently managing <span className="text-foreground font-bold">{data.customers.length}</span> prospects assigned to <span className="text-primary font-bold">{user?.name}</span>
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="My Portfolio" 
          value={data.customers.length} 
          icon={Users} 
          colorClass="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          title="Overdue" 
          value={overdueCount} 
          icon={AlertCircle} 
          colorClass="bg-red-500/10 text-red-500"
        />
        <StatCard 
          title="Due Today" 
          value={dueTodayCount} 
          icon={Clock} 
          colorClass="bg-amber-500/10 text-amber-500"
        />
        <StatCard 
          title="Upcoming" 
          value={upcomingCount} 
          icon={CalendarCheck} 
          colorClass="bg-emerald-500/10 text-emerald-500"
        />
      </div>

      <div className="bg-card border border-border/40 rounded-3xl shadow-xl overflow-hidden mb-12">
        <CustomerTable 
          customers={data.customers} 
          onNoteUpdated={handleUpdateNoteLocal}
        />
      </div>
    </div>
  );
}

export default function MyCustomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <MyCustomersContent />
    </Suspense>
  );
}
