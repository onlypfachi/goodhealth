import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/api";
import { Users, Search, Filter, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Patients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPatients();
    // Refresh every 10 seconds
    const interval = setInterval(fetchPatients, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchQuery, patients, statusFilter]);

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/patients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPatients(data.data);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const filterPatients = () => {
    let filtered = patients;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(p => {
        const isOnline = p.last_login && new Date(p.last_login) > new Date(Date.now() - 5 * 60 * 1000);
        if (statusFilter === "active") return isOnline;
        if (statusFilter === "inactive") return !isOnline;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient =>
        patient.full_name?.toLowerCase().includes(query) ||
        patient.patient_id?.toLowerCase().includes(query) ||
        patient.email?.toLowerCase().includes(query) ||
        patient.phone?.includes(query) ||
        patient.department?.toLowerCase().includes(query) ||
        patient.last_department?.toLowerCase().includes(query)
      );
    }

    setFilteredPatients(filtered);
  };

  const handleViewPatient = async (patient: any) => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/patients/${patient.user_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setSelectedPatient(data.data);
        setIsViewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      toast({
        title: "Error",
        description: "Failed to load patient details",
        variant: "destructive",
      });
    }
  };

  const getPatientStatus = (patient: any) => {
    // Check is_online flag from database
    if (patient.is_online === 1) {
      return { label: "Online", variant: "default" as const };
    }
    return { label: "Offline", variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Patient Management
          </h1>
          <p className="text-muted-foreground">View and manage all registered patients</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, email, phone, or department..."
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
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="active">Online</SelectItem>
                <SelectItem value="inactive">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Patients ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Patient ID</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Age</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Department</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Last Visit</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => {
                  const status = getPatientStatus(patient);
                  return (
                    <tr key={patient.user_id} className="border-b border-border hover:bg-secondary/50 transition-smooth">
                      <td className="p-4 text-sm font-medium text-primary">{patient.patient_id}</td>
                      <td className="p-4 text-sm font-medium text-foreground">{patient.full_name}</td>
                      <td className="p-4 text-sm text-muted-foreground">{patient.age || 'N/A'}</td>
                      <td className="p-4 text-sm text-muted-foreground">{patient.email}</td>
                      <td className="p-4 text-sm text-muted-foreground">{patient.phone || 'N/A'}</td>
                      <td className="p-4 text-sm text-muted-foreground">{patient.department || 'N/A'}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="p-4">
                        <Badge variant={status.variant}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPatient(patient)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Patient Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Patient Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Patient ID</Label>
                    <p className="font-medium">{selectedPatient.patient.patient_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{selectedPatient.patient.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedPatient.patient.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedPatient.patient.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">
                      {selectedPatient.patient.date_of_birth
                        ? new Date(selectedPatient.patient.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gender</Label>
                    <p className="font-medium capitalize">{selectedPatient.patient.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{selectedPatient.patient.department || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedPatient.patient.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Appointment History */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Appointment History</h3>
                {selectedPatient.appointments.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedPatient.appointments.map((apt: any) => (
                      <div key={apt.appointment_id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{apt.department_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Dr. {apt.doctor_name || 'Not assigned'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                            <Badge variant="secondary">{apt.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No appointment history</p>
                )}
              </div>

              {/* Medical Records */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Medical Records</h3>
                {selectedPatient.medicalRecords.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedPatient.medicalRecords.map((record: any) => (
                      <div key={record.record_id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium">{new Date(record.record_date).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">By {record.recorded_by_name}</p>
                        </div>
                        {record.diagnosis && (
                          <div className="mb-2">
                            <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                            <p className="text-sm">{record.diagnosis}</p>
                          </div>
                        )}
                        {record.prescription && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Prescription</Label>
                            <p className="text-sm">{record.prescription}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No medical records</p>
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
    </div>
  );
};

export default Patients;
