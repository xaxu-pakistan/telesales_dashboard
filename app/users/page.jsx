"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Shield, UserPlus, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();
      setUsers(json.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || "Failed to create user");
      }
      
      setUsers([json.user, ...users]);
      setIsCreating(false);
      setFormData({ name: "", email: "", password: "", role: "member" });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage platform access, roles, and permissions.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="rounded-xl shadow-md">
          {isCreating ? "Cancel" : <><UserPlus className="w-4 h-4 mr-2" /> Add User</>}
        </Button>
      </div>

      {isCreating && (
        <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold mb-4">Create New Account</h3>
          
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email Address</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Secure password"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">System Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="super admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="sales agent">Sales Agent</option>
                <option value="member">Member</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            
            {formError && (
              <div className="col-span-1 md:col-span-2 text-destructive text-sm flex items-center gap-1 mt-2">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}
            
            <div className="col-span-1 md:col-span-2 mt-2">
              <Button type="submit" disabled={formLoading} className="w-40 rounded-xl">
                {formLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Create Account"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-destructive/10 text-destructive rounded-2xl">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-accent/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wide">Name</th>
                  <th className="px-6 py-4 font-medium tracking-wide">Email</th>
                  <th className="px-6 py-4 font-medium tracking-wide">Role</th>
                  <th className="px-6 py-4 font-medium tracking-wide">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wide">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize
                        ${user.role === 'super admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : ''}
                        ${user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : ''}
                        ${user.role === 'sales agent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ''}
                        ${['member', 'employee'].includes(user.role) ? 'bg-secondary text-secondary-foreground border border-border/50' : ''}
                      `}>
                        {user.role === 'super admin' && <Shield className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-2 text-emerald-500 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-muted-foreground text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
