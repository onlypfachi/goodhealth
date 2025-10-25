import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import DoctorHeader from "@/components/DoctorHeader";
import DoctorQueue from "@/components/DoctorQueue";
import ConsultationPanel from "@/components/ConsultationPanel";
import ScheduleList from "@/components/ScheduleList";
import QuickActions from "@/components/QuickActions";
import DoctorProfile from "@/components/DoctorProfile";

// Mock socket for demo
const mockSocket = {
  on: (event: string, callback: Function) => {
    console.log(`Socket listening to: ${event}`);
  },
  emit: (event: string, data: any) => {
    console.log(`Socket emit: ${event}`, data);
  }
};

export interface Patient {
  id: string;
  name: string;
  hospitalId: string;
  symptoms: string;
  queueNumber: number;
  appointmentTime: string;
  notifyAtPosition?: number;
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'no_show' | 'skipped';
  phone?: string;
  email?: string;
  medicalHistory?: string;
  appointmentId?: string;
  patientUserId?: number;
}

const mockPatients: Patient[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    hospitalId: "HC-2024-001",
    symptoms: "Persistent cough and mild fever for 3 days. No difficulty breathing.",
    queueNumber: 1,
    appointmentTime: "09:30 AM",
    notifyAtPosition: 3,
    status: 'waiting',
    phone: "+1 234-567-8901",
    medicalHistory: "Type 2 Diabetes, Hypertension"
  },
  {
    id: "2",
    name: "Michael Chen",
    hospitalId: "HC-2024-002",
    symptoms: "Severe headache and dizziness. Started yesterday evening.",
    queueNumber: 2,
    appointmentTime: "10:00 AM",
    status: 'waiting',
    phone: "+1 234-567-8902",
    medicalHistory: "Migraine history"
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    hospitalId: "HC-2024-003",
    symptoms: "Lower back pain after lifting heavy objects. Limited mobility.",
    queueNumber: 3,
    appointmentTime: "10:30 AM",
    notifyAtPosition: 2,
    status: 'waiting',
    phone: "+1 234-567-8903"
  },
  {
    id: "4",
    name: "David Park",
    hospitalId: "HC-2024-004",
    symptoms: "Allergic reaction - skin rash and itching. No breathing issues.",
    queueNumber: 4,
    appointmentTime: "11:00 AM",
    status: 'waiting',
    phone: "+1 234-567-8904",
    medicalHistory: "Known allergies: Penicillin"
  },
  {
    id: "5",
    name: "Lisa Thompson",
    hospitalId: "HC-2024-005",
    symptoms: "Follow-up consultation for diabetes management. Blood sugar monitoring.",
    queueNumber: 5,
    appointmentTime: "11:30 AM",
    notifyAtPosition: 4,
    status: 'waiting',
    phone: "+1 234-567-8905",
    medicalHistory: "Type 1 Diabetes, regular insulin therapy"
  },
  {
    id: "6",
    name: "James Wilson",
    hospitalId: "HC-2024-006",
    symptoms: "Chest discomfort and shortness of breath during exercise.",
    queueNumber: 6,
    appointmentTime: "12:00 PM",
    status: 'waiting',
    phone: "+1 234-567-8906",
    medicalHistory: "Family history of heart disease"
  }
];

const DoctorDashboard = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showConsultation, setShowConsultation] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [shiftTimeLeft, setShiftTimeLeft] = useState(4 * 60 * 60); // 4 hours in seconds
  const [nextPatientTime, setNextPatientTime] = useState(15 * 60); // 15 minutes in seconds
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [doctor, setDoctor] = useState({
    name: "Loading...",
    id: "",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
    specialization: ""
  });
  const [emergencyPatient, setEmergencyPatient] = useState({
    patientId: "",
    name: "",
    symptoms: "",
    phone: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);

  const handleAvatarUpdate = (newAvatar: string) => {
    setDoctor(prev => ({ ...prev, avatar: newAvatar }));
  };

  // Load doctor info from localStorage on mount
  useEffect(() => {
    const staffUser = localStorage.getItem('staffUser');
    if (staffUser) {
      try {
        const userData = JSON.parse(staffUser);
        setDoctor({
          name: userData.full_name || userData.name || "Doctor",
          id: userData.staff_id || userData.staffId || "",
          avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.full_name || 'doctor'}`,
          specialization: userData.specialization || userData.department || "General Medicine"
        });
      } catch (e) {
        console.error("Error parsing staff user data:", e);
      }
    }
  }, []);

  // Fetch today's schedule from API
  useEffect(() => {
    const fetchTodaySchedule = async () => {
      setIsLoadingSchedule(true);
      try {
        const token = localStorage.getItem('staffToken');
        if (!token) {
          console.error('No staff token found');
          toast({
            title: "Authentication Error",
            description: "Please log in again",
            variant: "destructive"
          });
          return;
        }

        const response = await fetch('http://localhost:5000/api/queue-mgmt/doctor/today-schedule', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.appointments) {
          // Transform API data to match Patient interface
          const transformedPatients: Patient[] = data.data.appointments.map((apt: any) => ({
            id: apt.appointment_id.toString(),
            name: apt.patient_name || "Unknown",
            hospitalId: apt.patient_id || "",
            symptoms: apt.symptoms || apt.reason || "No symptoms listed",
            queueNumber: apt.queue_number || 0,
            appointmentTime: apt.appointment_time || "",
            status: apt.status || 'waiting',
            phone: apt.phone || "",
            email: apt.email || "",
            medicalHistory: apt.medical_history || "",
            appointmentId: apt.appointment_id.toString(),
            patientUserId: apt.patient_user_id
          }));

          setPatients(transformedPatients);

          // Only show toast on first load (not on auto-refresh)
          // console.log(`Loaded ${transformedPatients.length} appointment(s) for today`);
        } else {
          // No appointments for today
          setPatients([]);
        }
      } catch (error) {
        console.error('Error fetching today\'s schedule:', error);
        toast({
          title: "Error Loading Schedule",
          description: "Could not load today's appointments. Using demo data.",
          variant: "destructive"
        });
        // Fallback to empty array instead of mock data
        setPatients([]);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    fetchTodaySchedule();

    // Refresh schedule every 30 seconds
    const interval = setInterval(fetchTodaySchedule, 30000);
    return () => clearInterval(interval);
  }, []);

  // Shift countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setShiftTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Next patient timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNextPatientTime(prev => {
        if (prev <= 1) {
          // Play sound when timer hits 0
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
          }
          toast({
            title: "Next Patient",
            description: "Time to see the next patient!",
          });
          return 15 * 60; // Reset to 15 minutes
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Socket event listeners
    mockSocket.on('queue:update', (data: any) => {
      console.log('Queue update received:', data);
      // Update patients list
    });

    mockSocket.on('queue:called', (data: any) => {
      console.log('Patient called:', data);
    });

    return () => {
      console.log('Cleanup socket listeners');
    };
  }, []);

  const handleCallPatient = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // Update patient status locally
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, status: 'called' } : p
    ));

    // Call patient via backend API
    try {
      const token = localStorage.getItem('staffToken');
      const response = await fetch('http://localhost:5000/api/queue/call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId: patient.appointmentId || patient.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Email Sent",
          description: `Consultation email sent to ${patient.name}`,
        });
      } else {
        // Email failed but don't revert status - just notify
        toast({
          title: "Call Initiated",
          description: "Patient called (email notification unavailable)",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending consultation email:', error);
      // Don't revert status - the call still happened
      toast({
        title: "Call Initiated",
        description: "Patient called (connect backend for email notifications)",
      });
    }

    mockSocket.emit('doctor:callNext', { doctorId: doctor.id, patientId });
    console.log(`Called patient: ${patientId}`);
  };

  const handleStartConsultation = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setShowConsultation(true);
      setPatients(prev => prev.map(p => 
        p.id === patientId ? { ...p, status: 'in_consultation' } : p
      ));
      mockSocket.emit('doctor:startConsultation', { 
        doctorId: doctor.id, 
        patientId,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleCompleteConsultation = async () => {
    if (selectedPatient) {
      try {
        const token = localStorage.getItem('staffToken');
        const response = await fetch(`http://localhost:5000/api/appointments/${selectedPatient.appointmentId}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'completed'
          })
        });

        const data = await response.json();

        if (data.success) {
          // Update local state
          setPatients(prev => prev.map(p =>
            p.id === selectedPatient.id ? { ...p, status: 'completed' } : p
          ));

          toast({
            title: "Consultation Completed",
            description: `${selectedPatient.name}'s consultation has been marked as complete`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to mark consultation as complete",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error completing consultation:', error);
        toast({
          title: "Connection Error",
          description: "Unable to update appointment status",
          variant: "destructive"
        });
      }

      mockSocket.emit('doctor:completeConsultation', {
        doctorId: doctor.id,
        patientId: selectedPatient.id
      });
      setShowConsultation(false);
      setSelectedPatient(null);
    }
  };

  const handleSkipPatient = (patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'skipped' } : p
    ));
    console.log(`Skipped patient: ${patientId}`);
  };

  const handleNoShow = (patientId: string) => {
    setPatients(prev => prev.map(p => 
      p.id === patientId ? { ...p, status: 'no_show' } : p
    ));
    console.log(`Marked no-show: ${patientId}`);
  };

  const handleCallNext = async () => {
    const nextPatient = patients.find(p => p.status === 'waiting');
    if (nextPatient) {
      handleCallPatient(nextPatient.id);
      
      // Send notification to patient (email/SMS)
      try {
        // Mock notification - in production, this would call an edge function
        console.log('Sending notification to patient:', nextPatient.name);
        toast({
          title: "Patient Notified",
          description: `${nextPatient.name} has been notified via email/SMS`,
        });
        
        // Reset next patient timer
        setNextPatientTime(15 * 60);
      } catch (error) {
        console.error('Failed to notify patient:', error);
        toast({
          title: "Notification Failed",
          description: "Could not send notification to patient",
          variant: "destructive",
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleInsertEmergency = () => {
    setShowEmergencyDialog(true);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Search for patients in database
  const handlePatientSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('staffToken');
      const response = await fetch(`http://localhost:5000/api/search/patients?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a patient from search results
  const handleSelectPatient = (patient: any) => {
    setEmergencyPatient({
      patientId: patient.user_id.toString(),
      name: patient.full_name,
      phone: patient.phone || patient.email || "",
      symptoms: ""
    });
    setSearchQuery(patient.full_name);
    setSearchResults([]);
  };

  const handleEmergencySubmit = async () => {
    if (!emergencyPatient.patientId || !emergencyPatient.symptoms) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and describe the emergency condition",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('staffToken');
      const staffUser = JSON.parse(localStorage.getItem('staffUser') || '{}');

      // Try multiple fields to get doctor ID
      const doctorId = staffUser.user_id || staffUser.userId || staffUser.id;

      console.log('Emergency submission data:', {
        patientId: emergencyPatient.patientId,
        patientName: emergencyPatient.name,
        doctorId: doctorId,
        symptoms: emergencyPatient.symptoms,
        staffUser: staffUser
      });

      if (!doctorId) {
        toast({
          title: "Error",
          description: "Could not identify doctor. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      // Create emergency appointment in database
      const response = await fetch('http://localhost:5000/api/appointments/emergency', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: emergencyPatient.patientId,
          doctorId: doctorId,
          symptoms: emergencyPatient.symptoms,
          appointmentDate: new Date().toISOString().split('T')[0]
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Emergency Patient Added",
          description: `${emergencyPatient.name} has been added to the front of the queue`,
        });

        // Reset form and close dialog
        setEmergencyPatient({ patientId: "", name: "", symptoms: "", phone: "" });
        setSearchQuery("");
        setShowEmergencyDialog(false);

        // Refresh the schedule to show new emergency patient
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add emergency patient",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding emergency patient:', error);
      toast({
        title: "Connection Error",
        description: "Unable to add emergency patient. Please try again.",
        variant: "destructive"
      });
    }
  };

  const waitingCount = patients.filter(p => p.status === 'waiting').length;
  const completedToday = patients.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background image with overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-overlay-dark backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <DoctorHeader 
          doctor={doctor}
          queueCount={waitingCount}
          onProfileClick={() => setShowProfile(true)}
        />

        <main className="px-3 md:px-6 py-4 md:py-6 pb-20 md:pb-6 max-w-7xl mx-auto">
          {/* Welcome Message */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-3xl font-bold text-white">
              Welcome Doctor {doctor.name.replace('Dr. ', '')}
            </h1>
          </div>


          {/* Mobile Call Next Button - Fixed at bottom */}
          <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 shadow-lg"
              onClick={handleCallNext}
              disabled={waitingCount === 0}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-semibold">Call Next Patient</span>
                {waitingCount > 0 && (
                  <span className="bg-primary-foreground text-primary text-sm font-bold px-2 py-0.5 rounded-full">
                    {waitingCount}
                  </span>
                )}
              </div>
            </Button>
          </div>

          {/* Desktop Quick Actions */}
          <div className="hidden md:block mb-6">
            <QuickActions
              onCallNext={handleCallNext}
              waitingCount={waitingCount}
              onInsertEmergency={handleInsertEmergency}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-3 md:gap-6">
            {/* Queue Section */}
            <div className="space-y-3 md:space-y-4">
              <DoctorQueue 
                patients={patients}
                onCall={handleCallPatient}
                onStart={handleStartConsultation}
                onSkip={handleSkipPatient}
                onNoShow={handleNoShow}
              />
            </div>

            {/* Right Panel */}
            <div className="space-y-3 md:space-y-4">
              {showConsultation && selectedPatient ? (
                <ConsultationPanel 
                  patient={selectedPatient}
                  onComplete={handleCompleteConsultation}
                  onClose={() => {
                    setShowConsultation(false);
                    setSelectedPatient(null);
                  }}
                />
              ) : (
                <ScheduleList doctorId={doctor.id} />
              )}
          </div>
        </div>
      </main>

      {/* Hidden audio element for notification sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE"
        preload="auto"
      />

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="sm:max-w-md">
          <DoctorProfile
            doctor={doctor}
            onAvatarUpdate={handleAvatarUpdate}
          />
        </DialogContent>
      </Dialog>

      {/* Emergency Patient Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Emergency Patient</DialogTitle>
            <DialogDescription>
              Add an urgent patient to the front of the queue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emergency-search">Search Patient *</Label>
              <div className="relative">
                <Input
                  id="emergency-search"
                  placeholder="Type patient name to search..."
                  value={searchQuery}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((patient) => (
                      <div
                        key={patient.user_id}
                        className="px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="font-medium text-sm">{patient.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {patient.patient_id} • {patient.phone || patient.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {emergencyPatient.patientId && (
                <div className="mt-2 p-3 bg-green-500/20 rounded-md border border-green-500/50">
                  <div className="text-xs text-muted-foreground mb-1">Selected Patient:</div>
                  <div className="text-sm font-medium text-foreground">{emergencyPatient.name}</div>
                  <div className="text-xs text-muted-foreground">{emergencyPatient.phone}</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency-symptoms">Emergency Symptoms/Condition *</Label>
              <Textarea
                id="emergency-symptoms"
                placeholder="Describe the emergency condition requiring immediate attention"
                value={emergencyPatient.symptoms}
                onChange={(e) => setEmergencyPatient(prev => ({ ...prev, symptoms: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEmergencyDialog(false);
                  setEmergencyPatient({ patientId: "", name: "", symptoms: "", phone: "" });
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleEmergencySubmit}
                disabled={!emergencyPatient.patientId || !emergencyPatient.symptoms}
              >
                Insert Emergency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default DoctorDashboard;
