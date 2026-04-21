"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Shield, UserPlus, Loader2, AlertCircle, Trash2, Edit2, Key, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create Form state
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "member",
  });
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Edit Form state
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "", // Optional for password change
    isActive: true,
  });
  const [editFormError, setEditFormError] = useState(null);
  const [editFormLoading, setEditFormLoading] = useState(false);

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

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData({ 
      ...editFormData, 
      [name]: type === 'checkbox' ? checked : value 
    });
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

  const handleEditUser = (user) => {
    setEditingUser(user._id);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "",
    });
    setEditFormError(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditFormLoading(true);
    setEditFormError(null);
    try {
      const body = { 
        id: editingUser, 
        ...editFormData 
      };
      // Only include password if it's not empty
      if (!body.password) delete body.password;

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || "Failed to update user");
      }
      
      setUsers(users.map(u => u._id === editingUser ? { ...u, ...json.user } : u));
      setEditingUser(null);
    } catch (err) {
      setEditFormError(err.message);
    } finally {
      setEditFormLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.message || "Failed to delete user");
      }
      
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage platform access, roles, and permissions.</p>
        </div>
        <Button 
          onClick={() => {
            setIsCreating(!isCreating);
            setEditingUser(null);
          }} 
          className="rounded-xl shadow-md"
        >
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
                <option value="admin">Admin</option>
                <option value="sales agent">Sales Agent</option>
                <option value="finance">Finance</option>
                <option value="member">Member</option>
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
                  <th className="px-6 py-4 font-medium tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-accent/30 transition-colors">
                    {editingUser === user._id ? (
                      <td colSpan="6" className="p-6 bg-accent/10">
                        <form onSubmit={handleUpdateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Name</label>
                            <input
                              name="name"
                              value={editFormData.name}
                              onChange={handleEditChange}
                              className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Email</label>
                            <input
                              name="email"
                              value={editFormData.email}
                              onChange={handleEditChange}
                              className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Role</label>
                            <select
                              name="role"
                              value={editFormData.role}
                              onChange={handleEditChange}
                              disabled={user.role === 'super admin'}
                              className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                              {user.role === 'super admin' && <option value="super admin">Super Admin</option>}
                              <option value="admin">Admin</option>
                              <option value="sales agent">Sales Agent</option>
                              <option value="finance">Finance</option>
                              <option value="member">Member</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">New Password (optional)</label>
                            <input
                              name="password"
                              type="password"
                              value={editFormData.password}
                              onChange={handleEditChange}
                              placeholder="Leave blank to keep current"
                              className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            />
                          </div>
                          <div className="flex items-end space-x-2">
                            <label className="flex items-center space-x-2 h-9">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={editFormData.isActive}
                                onChange={handleEditChange}
                                disabled={user.role === 'super admin'}
                                className="rounded border-input"
                              />
                              <span className="text-sm">Active</span>
                            </label>
                          </div>
                          <div className="flex items-end justify-end space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingUser(null)}
                            >
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              size="sm" 
                              disabled={editFormLoading}
                            >
                              {editFormLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Update</>}
                            </Button>
                          </div>
                          {editFormError && (
                            <div className="col-span-full text-destructive text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {editFormError}
                            </div>
                          )}
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize
                            ${user.role === 'super admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : ''}
                            ${user.role === 'admin' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : ''}
                            ${user.role === 'sales agent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : ''}
                            ${user.role === 'finance' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : ''}
                            ${user.role === 'member' ? 'bg-secondary text-secondary-foreground border border-border/50' : ''}
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
                        <td className="px-6 py-4 space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {user.role !== 'super admin' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-muted-foreground">
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
