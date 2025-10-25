import { useState, useEffect } from "react";
import { Bell, User, Moon, Sun, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { API_BASE_URL } from "@/config/api";
import { ScrollArea } from "@/components/ui/scroll-area";

export const TopBar = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserManual, setShowUserManual] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchNotificationCount();
    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setNotificationCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleNotificationClick = async () => {
    // Navigate to messages - they'll be marked as read when the Messages page opens
    navigate('/messages');
    // Reset count immediately for better UX
    setNotificationCount(0);
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffUser');
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-end px-6 sticky top-0 z-40 card-shadow">
      {/* Right: Theme Toggle, Notifications + Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={handleNotificationClick}
          title="View messages and notifications"
        >
          <Bell className="w-5 h-5" />
          {notificationCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs">
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">Admin User</div>
                <div className="text-xs text-muted-foreground">Super Admin</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border-border">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowUserManual(true)} className="gap-2">
              <BookOpen className="w-4 h-4" />
              Help
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* User Manual Dialog */}
      <Dialog open={showUserManual} onOpenChange={setShowUserManual}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <BookOpen className="w-6 h-6 text-primary" />
              Admin Dashboard User Manual
            </DialogTitle>
            <DialogDescription>
              Complete guide to managing the GoodHealth hospital admin dashboard
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              {/* Dashboard Overview */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">📊 Dashboard Overview</h3>
                <p className="text-muted-foreground mb-2">
                  The main dashboard provides real-time statistics and insights into your hospital operations:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Total Patients:</strong> View the current number of registered patients</li>
                  <li><strong>Active Doctors:</strong> Monitor available medical staff</li>
                  <li><strong>Today's Queue:</strong> Track patients waiting for appointments</li>
                  <li><strong>Appointments:</strong> See scheduled consultations for the day</li>
                </ul>
              </section>

              {/* Patient Management */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">👥 Patient Management</h3>
                <p className="text-muted-foreground mb-2">
                  Access the Patients tab to view and manage patient records:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>View Patients:</strong> Browse all registered patients with their details</li>
                  <li><strong>Assign Doctors:</strong> Use the dropdown in the "Assigned Doctor" column to assign or reassign patients to doctors</li>
                  <li><strong>Search:</strong> Find patients by name, ID, or department using the search bar</li>
                  <li><strong>Patient Status:</strong> Monitor active and inactive patient statuses</li>
                  <li><strong>Note:</strong> Patients register themselves through their own dashboard - admins cannot add patients directly</li>
                </ul>
              </section>

              {/* Doctor Management */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">👨‍⚕️ Doctor Management</h3>
                <p className="text-muted-foreground mb-2">
                  The Doctors tab allows you to manage medical staff and their schedules:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Add Doctor:</strong> Click "Add Doctor" to create new doctor accounts with name, email, specialty, and department</li>
                  <li><strong>Manage Shifts:</strong> Click the "Shifts" button to view and modify doctor work schedules</li>
                  <li><strong>Add Shifts:</strong> Select day, start time, and end time to add new shifts for doctors</li>
                  <li><strong>Remove Shifts:</strong> Delete shifts that are no longer needed</li>
                  <li><strong>Delete Doctor:</strong> Use the delete button (trash icon) to remove doctor accounts from the system</li>
                  <li><strong>Monitor Status:</strong> View doctor availability (available, busy, offline)</li>
                  <li><strong>Track Performance:</strong> See patient count and ratings for each doctor</li>
                </ul>
              </section>

              {/* Admin Management */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">🔐 Admin Management</h3>
                <p className="text-muted-foreground mb-2">
                  Control access and permissions for administrative users:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>View Admins:</strong> See all administrative users and their roles</li>
                  <li><strong>Add Admin:</strong> Create new admin accounts with appropriate permissions</li>
                  <li><strong>Manage Roles:</strong> Assign roles like Super Admin, Manager, or Staff</li>
                </ul>
              </section>

              {/* Messages */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">💬 Messages</h3>
                <p className="text-muted-foreground mb-2">
                  Communicate with staff and manage internal communications:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>View Conversations:</strong> Access message threads with doctors and staff</li>
                  <li><strong>Send Messages:</strong> Communicate important updates and instructions</li>
                  <li><strong>Notifications:</strong> Receive alerts for new messages</li>
                </ul>
              </section>

              {/* Search & Filters */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">🔍 Search & Filters</h3>
                <p className="text-muted-foreground mb-2">
                  Efficiently find information across the dashboard:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Global Search:</strong> Use the top bar search to find patients, doctors, or appointments</li>
                  <li><strong>Page Filters:</strong> Apply filters on specific pages to narrow down results</li>
                  <li><strong>Quick Access:</strong> Search supports IDs, names, departments, and specialties</li>
                </ul>
              </section>

              {/* Notifications */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">🔔 Notifications</h3>
                <p className="text-muted-foreground mb-2">
                  Stay informed about important events:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Emergency Alerts:</strong> Receive immediate notifications for urgent situations</li>
                  <li><strong>System Updates:</strong> Get notified about new features or maintenance</li>
                  <li><strong>Staff Changes:</strong> Track when new doctors or admins are added</li>
                  <li><strong>Bell Icon:</strong> Click the bell icon in the top bar to view all notifications</li>
                </ul>
              </section>

              {/* Theme Settings */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">🎨 Theme Settings</h3>
                <p className="text-muted-foreground mb-2">
                  Customize your dashboard appearance:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Dark Mode:</strong> Toggle between light and dark themes using the sun/moon icon</li>
                  <li><strong>Automatic Switching:</strong> Theme preference is saved and applied on your next visit</li>
                </ul>
              </section>

              {/* Best Practices */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">✅ Best Practices</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Regularly update doctor shifts to ensure accurate availability</li>
                  <li>Assign doctors to patients based on department and specialty</li>
                  <li>Monitor the queue daily to optimize patient flow</li>
                  <li>Review notifications frequently to stay updated on critical events</li>
                  <li>Use search and filters to quickly access specific records</li>
                  <li>Keep doctor information current including specialties and contact details</li>
                </ul>
              </section>

              {/* Support */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-3">📞 Support</h3>
                <p className="text-muted-foreground">
                  For technical support or questions about using the admin dashboard, please contact your system administrator or IT department.
                </p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </header>
  );
};
