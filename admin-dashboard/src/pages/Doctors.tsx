import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Save,
  Trash2,
  Eye,
  X,
  Building2,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const Doctors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctorDetails, setDoctorDetails] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [newDoctor, setNewDoctor] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    departmentIds: [] as number[],
  });

  const [editingShift, setEditingShift] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
  });

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
    // Refresh every 10 seconds
    const interval = setInterval(fetchDoctors, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [searchQuery, doctors, statusFilter]);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(`${API_BASE_URL}/api/users/doctors`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        setDoctors(data.data);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(`${API_BASE_URL}/api/departments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        }
      });

      const data = await response.json();
      console.log("Departments fetched:", data);

      if (data.success && data.departments) {
        setDepartments(data.departments);
        console.log("Departments set:", data.departments.length);
      } else {
        console.error("Failed to fetch departments:", data);
        toast({
          title: "Error",
          description: "Failed to load departments. Please refresh the page.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast({
        title: "Error",
        description:
          "Could not connect to server. Please ensure the backend is running.",
        variant: "destructive",
      });
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;
    console.log("Filtering doctors:", filtered.length, filtered);
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => {
        const isOnline =
          d.lastLoginAt &&
          new Date(d.lastLoginAt) > new Date(Date.now() - 5 * 60 * 1000);
        if (statusFilter === "active") return isOnline;
        if (statusFilter === "inactive") return !isOnline;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doctor) =>
          doctor.ame?.toLowerCase().includes(query) ||
          doctor.staffId?.toLowerCase().includes(query) ||
          doctor.email?.toLowerCase().includes(query) ||
          doctor.departments?.toLowerCase().includes(query)
      );
    }

    setFilteredDoctors(filtered);
  };

  const handleCreateDoctor = async () => {
    if (!newDoctor.fullName || !newDoctor.email || !newDoctor.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (newDoctor.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (newDoctor.departmentIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one department",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(`${API_BASE_URL}/api/doctors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newDoctor),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Doctor Account Created",
          description: `Staff ID: ${data.data.staffId} - Login credentials sent to email`,
        });
        setNewDoctor({
          fullName: "",
          email: "",
          password: "",
          phone: "",
          departmentIds: [],
        });
        setIsCreateDialogOpen(false);
        fetchDoctors();
      } else {
        toast({
          title: "Creation Failed",
          description: data.message || "Failed to create doctor account",
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

  const handleViewProfile = async (doctor: any) => {
    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(`${API_BASE_URL}/api/users/${doctor.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const data = await response.json();
      console.log("Doctor details fetched:", data);
      if (data.success) {
        setDoctorDetails(data.user);
        setIsViewDialogOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load doctor details",
        variant: "destructive",
      });
    }
  };

  const handleAddShift = async () => {
    if (
      !selectedDoctor ||
      !editingShift.dayOfWeek ||
      !editingShift.startTime ||
      !editingShift.endTime
    ) {
      toast({
        title: "Error",
        description: "Please fill in all shift details",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(
        `${API_BASE_URL}/api/doctors/${selectedDoctor.user_id}/schedules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editingShift),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Shift Added",
          description: "Doctor shift has been updated successfully",
        });
        setEditingShift({ dayOfWeek: "", startTime: "", endTime: "" });
        // Refresh doctor details
        handleViewProfile(selectedDoctor);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add shift",
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

  const handleRemoveShift = async (scheduleId: number) => {
    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(
        `${API_BASE_URL}/api/doctors/${selectedDoctor.user_id}/schedules/${scheduleId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Shift Removed",
          description: "Shift has been removed from the schedule",
        });
        // Refresh doctor details
        handleViewProfile(selectedDoctor);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove shift",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;

    try {
      const token = localStorage.getItem("staffToken");
      const response = await fetch(
        `${API_BASE_URL}/api/users/${doctorToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Doctor Deleted",
          description: data.message,
        });
        setIsDeleteDialogOpen(false);
        setDoctorToDelete(null);
        fetchDoctors();
      } else {
        toast({
          title: "Deletion Failed",
          description: data.message || "Failed to delete doctor",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete doctor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDoctorStatus = (doctor: any) => {
    // Check is_online flag from database
    if (doctor.iOnline === 1) {
      return {
        label: "Online",
        variant: "default" as const,
        color: "bg-accent-green",
      };
    }
    return { label: "Offline", variant: "secondary" as const, color: "" };
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const toggleDepartment = (deptId: number) => {
    setNewDoctor((prev) => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter((id) => id !== deptId)
        : [...prev.departmentIds, deptId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-accent-teal" />
            Doctor Management
          </h1>
          <p className="text-muted-foreground">
            Manage doctor profiles and availability
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent-teal hover:bg-accent-teal/90">
              <Plus className="w-4 h-4" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-background max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Doctor Account</DialogTitle>
              <DialogDescription>
                Add a new doctor to the system. Employee ID will be
                auto-generated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Dr. John Smith"
                  value={newDoctor.fullName}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, fullName: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (Login Username) *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@goodhealth.com"
                  value={newDoctor.email}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password (Login Password) *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newDoctor.password}
                    onChange={(e) =>
                      setNewDoctor({ ...newDoctor, password: e.target.value })
                    }
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
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number (Zimbabwean Format)</Label>
                <Input
                  id="phone"
                  placeholder="+263712345678"
                  value={newDoctor.phone}
                  onChange={(e) =>
                    setNewDoctor({ ...newDoctor, phone: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Format: +263XXXXXXXXX
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Departments * (Select at least one)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto bg-background">
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <div
                        key={dept.department_id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`dept-${dept.department_id}`}
                          checked={newDoctor.departmentIds.includes(
                            dept.department_id
                          )}
                          onCheckedChange={() =>
                            toggleDepartment(dept.department_id)
                          }
                        />
                        <label
                          htmlFor={`dept-${dept.department_id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {dept.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading departments... If this persists, please ensure
                      departments are configured in the database.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Departments available: {departments.length}
                </p>
              </div>
              <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-lg p-3">
                <p className="text-sm text-foreground">
                  <strong>Note:</strong> Employee ID will be auto-generated
                  (e.g., EMP0001). The doctor can use their email and password
                  to login to the doctor dashboard.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDoctor}
                className="bg-accent-teal hover:bg-accent-teal/90"
              >
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
                placeholder="Search by name, staff ID, email, or department..."
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
                <SelectItem value="all">All Doctors</SelectItem>
                <SelectItem value="active">Online</SelectItem>
                <SelectItem value="inactive">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Doctors List */}
      <div className="space-y-4">
        {filteredDoctors.map((doctor) => {
          const status = getDoctorStatus(doctor);
          return (
            <Card
              key={doctor.id}
              className="transition-smooth hover:card-shadow-hover"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left: Avatar and Basic Info */}
                  <div className="flex items-center gap-4 min-w-[280px]">
                    <Avatar className="w-16 h-16 bg-primary shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                        {getInitials(doctor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {doctor.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {doctor.department.name || "No department"}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Stats */}
                  <div className="flex gap-6 flex-1">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Staff ID
                      </p>
                      <p className="text-sm font-medium text-primary">
                        {doctor.empId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Today's Patients
                      </p>
                      <p className="text-sm font-medium">
                        {doctor.today_patients || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Shifts
                      </p>
                      <p className="text-sm font-medium">
                        {doctor.total_shifts || 0}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Badge */}
                  <div className="flex items-center gap-3">
                    <Badge variant={status.variant} className={status.color}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Far Right: Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleViewProfile(doctor)}
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        handleViewProfile(doctor);
                        setIsShiftDialogOpen(true);
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                      Shifts
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setDoctorToDelete(doctor);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Doctor Profile Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Doctor Profile</span>
            </DialogTitle>
          </DialogHeader>
          {doctorDetails && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Staff ID</Label>
                    <p className="font-medium">{doctorDetails.empId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{doctorDetails.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{doctorDetails.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">
                      {doctorDetails.phoneNumber || "N/A"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Departments</Label>
                    <p className="font-medium">
                      {doctorDetails?.department?.name ??
                        "No department assigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Shift Schedule</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsShiftDialogOpen(true)}
                  >
                    Manage Shifts
                  </Button>
                </div>
                {Array.isArray(doctorDetails.schedules) &&
                doctorDetails.schedules.length > 0 ? (
                  <div className="space-y-2">
                    {doctorDetails.schedules.map((schedule: any) => (
                      <div
                        key={schedule.schedule_id}
                        className="p-3 border rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium text-sm">
                              {schedule.day_of_week}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {schedule.start_time.substring(0, 5)} -{" "}
                              {schedule.end_time.substring(0, 5)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            schedule.is_available ? "default" : "secondary"
                          }
                        >
                          {schedule.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No shifts scheduled
                  </p>
                )}
              </div>

              {/* Recent Appointments */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Appointments</h3>
                {Array.isArray(doctorDetails.doctorAppointments) &&
                doctorDetails.doctorAppointments.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {doctorDetails.doctorAppointments
                      .slice(0, 10)
                      .map((apt: any) => (
                        <div key={apt.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {apt.patient.name} ({apt.patient.patientId})
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {doctorDetails.department.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">
                                {new Date(
                                  apt.appointmentDate
                                ).toLocaleDateString()}
                              </p>
                              <Badge variant="secondary">{apt.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No appointments yet
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shift Management Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Manage Doctor Shifts
            </DialogTitle>
            <DialogDescription>
              {selectedDoctor && `Managing shifts for ${selectedDoctor.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Shifts */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-foreground">
                Current Shifts
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {doctorDetails &&
                Array.isArray(doctorDetails.schedules) &&
                doctorDetails.schedules.length > 0 ? (
                  doctorDetails.schedules.map((shift: any) => (
                    <div
                      key={shift.schedule_id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {shift.day_of_week}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {shift.start_time.substring(0, 5)} -{" "}
                            {shift.end_time.substring(0, 5)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShift(shift.schedule_id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No shifts scheduled
                  </p>
                )}
              </div>
            </div>

            {/* Add New Shift */}
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold mb-3 text-foreground">
                Add New Shift
              </h4>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={editingShift.dayOfWeek}
                    onValueChange={(value) =>
                      setEditingShift({ ...editingShift, dayOfWeek: value })
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem value="Monday">Monday</SelectItem>
                      <SelectItem value="Tuesday">Tuesday</SelectItem>
                      <SelectItem value="Wednesday">Wednesday</SelectItem>
                      <SelectItem value="Thursday">Thursday</SelectItem>
                      <SelectItem value="Friday">Friday</SelectItem>
                      <SelectItem value="Saturday">Saturday</SelectItem>
                      <SelectItem value="Sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={editingShift.startTime}
                      onChange={(e) =>
                        setEditingShift({
                          ...editingShift,
                          startTime: e.target.value,
                        })
                      }
                      className="bg-background"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={editingShift.endTime}
                      onChange={(e) =>
                        setEditingShift({
                          ...editingShift,
                          endTime: e.target.value,
                        })
                      }
                      className="bg-background"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddShift}
                  className="gap-2 bg-primary hover:bg-primary-hover w-full"
                >
                  <Save className="w-4 h-4" />
                  Add Shift
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsShiftDialogOpen(false);
                setEditingShift({ dayOfWeek: "", startTime: "", endTime: "" });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Doctor Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this doctor account?
            </DialogDescription>
          </DialogHeader>
          {doctorToDelete && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-destructive/20 text-destructive">
                    {doctorToDelete.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{doctorToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {doctorToDelete.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Staff ID: {doctorToDelete.empId || "N/A"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-destructive">
                  ⚠️ Warning: This action cannot be undone!
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    The doctor will be permanently removed from the database
                  </li>
                  <li>They will no longer be able to access the system</li>
                  <li>
                    All their schedules and department assignments will be
                    deleted
                  </li>
                  <li>Appointment history will be preserved but unlinked</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDoctorToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDoctor}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Doctors;
