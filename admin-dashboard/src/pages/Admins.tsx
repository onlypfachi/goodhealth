import { useState, useEffect } from "react";
import { ShieldCheck, Plus, Search, Filter, Eye, X, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

const Admins = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [newAdmin, setNewAdmin] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    role: "admin"
  });

  useEffect(() => {
    fetchAdmins();
    // Refresh every 10 seconds
    const interval = setInterval(fetchAdmins, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAdmins();
  }, [searchQuery, admins, statusFilter]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/admins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setAdmins(data.data);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const filterAdmins = () => {
    let filtered = admins;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => {
        const isOnline = a.last_login && new Date(a.last_login) > new Date(Date.now() - 5 * 60 * 1000);
        if (statusFilter === "active") return isOnline && a.is_active;
        if (statusFilter === "inactive") return !isOnline || !a.is_active;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(admin =>
        admin.full_name?.toLowerCase().includes(query) ||
        admin.staff_id?.toLowerCase().includes(query) ||
        admin.email?.toLowerCase().includes(query) ||
        admin.role?.toLowerCase().includes(query)
      );
    }

    setFilteredAdmins(filtered);
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.fullName || !newAdmin.email || !newAdmin.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (newAdmin.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAdmin)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Admin Account Created",
          description: `Staff ID: ${data.data.staffId} - Login credentials sent to email`,
        });
        setNewAdmin({ fullName: "", email: "", password: "", phone: "", role: "admin" });
        setIsCreateDialogOpen(false);
        fetchAdmins();
      } else {
        toast({
          title: "Creation Failed",
          description: data.message || "Failed to create admin account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Could not connect to server",
        variant: "destructive",
      });
    }
  };

  const handleViewProfile = async (admin: any) => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/admins/${admin.user_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedAdmin(data.data);
        setIsViewDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin details",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (admin: any) => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/admins/${admin.user_id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Status Updated",
          description: data.message,
        });
        fetchAdmins();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAdmin = async (admin: any) => {
    if (!confirm(`Are you sure you want to permanently delete ${admin.full_name}'s account? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/admins/${admin.user_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Account Deleted",
          description: data.message,
        });
        fetchAdmins();
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message || "Failed to delete admin account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete admin account",
        variant: "destructive",
      });
    }
  };

  const getAdminStatus = (admin: any) => {
    if (!admin.is_active) {
      return { label: "Disabled", variant: "destructive" as const };
    }
    // Check is_online flag from database
    if (admin.is_online === 1) {
      return { label: "Online", variant: "default" as const };
    }
    return { label: "Offline", variant: "secondary" as const };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "superadmin") return "bg-primary";
    if (role === "admin") return "bg-accent-teal";
    return "bg-muted";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Admin Management
          </h1>
          <p className="text-muted-foreground">Manage administrator accounts and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary-hover">
              <Plus className="w-4 h-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-background max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Admin Account</DialogTitle>
              <DialogDescription>
                Add a new administrator to the system. Employee ID will be auto-generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Administrator"
                  value={newAdmin.fullName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (Login Username) *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@goodhealth.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password (Login Password) *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number (Zimbabwean Format)</Label>
                <Input
                  id="phone"
                  placeholder="+263712345678"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Format: +263XXXXXXXXX</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newAdmin.role} onValueChange={(value) => setNewAdmin({ ...newAdmin, role: value })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <strong>Note:</strong> Employee ID will be auto-generated (e.g., EMP0001).
                  The admin can use their email and password to login to the admin dashboard.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} className="bg-primary hover:bg-primary-hover">
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, staff ID, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Administrators ({filteredAdmins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAdmins.map((admin) => {
              const status = getAdminStatus(admin);
              return (
                <div
                  key={admin.user_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/50 transition-smooth"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="w-12 h-12 bg-primary">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(admin.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{admin.full_name}</h4>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground">{admin.email}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">ID: {admin.staff_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <Badge className={getRoleBadgeColor(admin.role)}>
                        {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {admin.last_login
                          ? `Active ${new Date(admin.last_login).toLocaleDateString()}`
                          : 'Never logged in'}
                      </p>
                    </div>

                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProfile(admin)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant={admin.is_active ? "ghost" : "default"}
                        size="sm"
                        className={admin.is_active ? "text-destructive hover:text-destructive" : ""}
                        onClick={() => handleToggleStatus(admin)}
                      >
                        {admin.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeAdmin(admin)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Admin Profile Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Admin Profile</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Staff ID</Label>
                    <p className="font-medium">{selectedAdmin.admin.staff_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{selectedAdmin.admin.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedAdmin.admin.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedAdmin.admin.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <Badge className={getRoleBadgeColor(selectedAdmin.admin.role)}>
                      {selectedAdmin.admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant={selectedAdmin.admin.is_active ? "default" : "destructive"}>
                      {selectedAdmin.admin.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created By</Label>
                    <p className="font-medium">{selectedAdmin.admin.created_by_name || 'System'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Created At</Label>
                    <p className="font-medium">
                      {new Date(selectedAdmin.admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Recent Activity</h3>
                {selectedAdmin.auditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedAdmin.auditLogs.slice(0, 10).map((log: any) => (
                      <div key={log.log_id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.description}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/10">
              <h4 className="font-semibold text-primary mb-2">Super Admin</h4>
              <p className="text-sm text-muted-foreground">Full system access, can manage all users, settings, and create other admins</p>
            </div>
            <div className="p-4 rounded-lg bg-accent-teal/10">
              <h4 className="font-semibold text-accent-teal mb-2">Admin</h4>
              <p className="text-sm text-muted-foreground">Can manage patients, doctors, appointments, and view dashboard analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admins;
