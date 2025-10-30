import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingForm from "@/components/dashboard/BookingForm";
import QueueStatus from "@/components/dashboard/QueueStatus";
import NotificationPreferences from "@/components/dashboard/NotificationPreferences";
import ReportsTab from "@/components/dashboard/ReportsTab";
import ProfileSettings from "@/components/dashboard/ProfileSettings";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Activity, FileText, Settings, Home } from "lucide-react";
import { toast } from "sonner";

export interface Booking {
  queue_number: number;
  doctor: string;
  department: string;
  appointment_date: string;
  appointment_time: string;
  id?: number;
}

const Dashboard = () => {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoadingAppointment, setIsLoadingAppointment] = useState(true);
  const [notifications, setNotifications] = useState({
    position: 3,
    method: "email" as "email" | "sms" | "both",
    subscribed: false,
  });

  // ✅ Fetch patient's appointments on mount (survives page reload!)
  useEffect(() => {
    const fetchPatientAppointments = async () => {
      try {
        setIsLoadingAppointment(true);
        console.log("🔄 Fetching patient appointments on mount...");

        // Get user info from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.error("❌ No user found in localStorage");
          toast.error("Please log in again");
          setIsLoadingAppointment(false);
          return;
        }

        const user = JSON.parse(userStr);
        console.log("👤 Full user object:", user);

        // Try multiple possible ID fields
        const patientId = user.user_id || user.id || user.userId || user.patientId;

        if (!patientId) {
          console.error("❌ No patient ID found in user object. Available keys:", Object.keys(user));
          toast.error("Unable to load appointments. Please log in again.");
          setIsLoadingAppointment(false);
          return;
        }

        console.log("✅ Patient ID:", patientId);

        // Import and call API
        const { appointments } = await import("@/lib/api");
        const response = await appointments.getPatientAppointments(patientId);

        if (!response.success) {
          console.error("❌ API returned error:", response.message);
          toast.error(response.message || "Failed to load appointments");
          setIsLoadingAppointment(false);
          return;
        }

        if (response.appointments && response.appointments.length > 0) {
          console.log(`📋 Found ${response.appointments.length} total appointments`);

          // Get the most recent upcoming appointment
          const upcomingAppointments = response.appointments.filter((apt: any) =>
            apt.status === 'scheduled' || apt.status === 'pending' || apt.status === 'in-progress'
          );

          console.log(`✅ Found ${upcomingAppointments.length} active appointments`);

          if (upcomingAppointments.length > 0) {
            const latestAppointment = upcomingAppointments[0];
            console.log("✅ Latest active appointment:", latestAppointment);

            // Transform API data to Booking format
            // ✅ FIX: Parse date as UTC to avoid timezone off-by-one errors
            const [year, month, day] = latestAppointment.appointmentDate.split('-').map(Number);
            const appointmentDateObj = new Date(latestAppointment.appointmentDate);

            setBooking({
              queue_number: latestAppointment.queueNumber || 1,
              doctor: latestAppointment.doctor.name || "Doctor",
              department: latestAppointment.doctor.department.name || "Department",
              appointment_date: appointmentDateObj.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC" // ✅ Use UTC to match how the date was stored
              }),
              appointment_time: latestAppointment.appointmentTime || "10:00",
              id: latestAppointment.id, // ✅ Add appointment ID for rescheduling
            });

            toast.success("Appointments loaded successfully!");
          } else {
            console.log("⚠️ No upcoming appointments found (all completed/cancelled)");
            setBooking(null);
          }
        } else {
          console.log("ℹ️ No appointments in database yet");
          setBooking(null);
        }
      } catch (error: any) {
        console.error("❌ Error fetching appointments:", error);
        console.error("Error details:", error.message, error.stack);
        toast.error("Failed to load appointments. Check console for details.");
      } finally {
        setIsLoadingAppointment(false);
      }
    };

    fetchPatientAppointments();
  }, []); // Run once on mount

  const handleBookingSubmit = async (bookingData: {
    department: string;
    reason: string;
    doctor_id?: string;
  }) => {
    console.log("🔄 Submitting booking data:", bookingData);
    try {
      // Call the API to book appointment
      const { appointments } = await import("@/lib/api");
      const response = await appointments.book(bookingData);

      if (response.success && response.data) {
        console.log("📥 Appointment Response Data:", response.data);

        // ✅ USE REAL DATA FROM API (not mock data!)
        const appointmentData = response.data;

        // Get real doctor name from API response
        const doctorName = appointmentData.doctor?.name ||
                          appointmentData.doctor?.name ||
                          appointmentData.doctor.name ||
                          "Doctor";

        // Get real queue number from API
        const queueNumber = appointmentData.queueNumber || appointmentData.queue_number || 1;

        // Get real department name from API
        const departmentName = appointmentData.department.name ||
                              "Department";

        // Parse the appointment date from response
        // ✅ FIX: Parse date as UTC to avoid timezone off-by-one errors
        const dateStr = appointmentData.appointmentDate ||
                       appointmentData.date;
        const [year, month, day] = dateStr.split('-').map(Number);
        const appointmentDate = new Date(Date.UTC(year, month - 1, day));

        // Format time properly
        const appointmentTime = appointmentData.appointmentTime ||
                               appointmentData.time ||
                               "10:00";

        console.log("✅ Setting booking state:", {
          queueNumber,
          doctor: doctorName,
          department: departmentName,
          date: appointmentDate,
          time: appointmentTime
        });

        setBooking({
          queueNumber,
          doctor: doctorName,
          department: departmentName,
          appointmentDate: appointmentDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC" // ✅ Use UTC to match how the date was stored
          }),
          appointmentTime: appointmentTime,
          appointmentId: appointmentData.id, // ✅ FIX: Include appointmentId for reschedule
        });

        // Scroll to queue status
        setTimeout(() => {
          document.getElementById("queue-status")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast.error(response.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Cannot connect to server. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <DashboardHeader booking={booking} />
      
      <main className="max-w-2xl mx-auto">
        <Tabs defaultValue="home" className="w-full">
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <TabsList className="grid w-full grid-cols-4 h-16 bg-transparent rounded-none border-none">
              <TabsTrigger value="home" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-primary">
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-primary">
                <Activity className="h-5 w-5" />
                <span className="text-xs">Queue</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-primary">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex flex-col items-center justify-center gap-1 data-[state=active]:bg-transparent data-[state=active]:text-primary">
                <Settings className="h-5 w-5" />
                <span className="text-xs">Profile</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="home" className="space-y-4 p-4 animate-in">
            <Card className="shadow-card bg-card">
              {!booking && <BookingForm onSubmit={handleBookingSubmit} />}
            </Card>

            {booking && (
              <div id="queue-status">
                <Card className="shadow-card bg-card">
                  <QueueStatus booking={booking} />
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4 p-4 animate-in">
            {isLoadingAppointment ? (
              <Card className="p-8 text-center shadow-card bg-card">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  <p className="text-muted-foreground">Loading your appointments...</p>
                </div>
              </Card>
            ) : booking ? (
              <>
                <Card className="shadow-card bg-card">
                  <QueueStatus booking={booking} />
                </Card>
                <Card className="shadow-card bg-card">
                  <NotificationPreferences
                    notifications={notifications}
                    onUpdate={setNotifications}
                  />
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center shadow-card bg-card">
                <p className="text-muted-foreground">No active booking. Please book an appointment first.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="p-4 animate-in">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="profile" className="p-4 animate-in">
            <Card className="shadow-card bg-card">
              <ProfileSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
