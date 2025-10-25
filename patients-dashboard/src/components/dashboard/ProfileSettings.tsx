import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { User, Moon, Sun, LogOut, Camera, Trash2, Edit, Lock, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PatientProfile {
  userId: number;
  email: string;
  fullName: string;
  patientId: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  gender: string;
}

const ProfileSettings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Patient profile data
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  // Contact details
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Change password
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/patient/profile');
      if (response.success) {
        const profileData = response.data;
        setProfile(profileData);
        setPhone(profileData.phone || '');
        setEmail(profileData.email || '');
        setTempPhone(profileData.phone || '');
        setTempEmail(profileData.email || '');
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle("dark", newMode);
    toast.success(`${newMode ? "Dark" : "Light"} mode enabled`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        toast.success("Profile picture updated");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      toast.success("Logged out successfully");
      window.location.href = '/';
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Prompt for password confirmation
      const password = prompt("Please enter your password to confirm account deletion:");
      if (!password) {
        toast.error("Password is required to delete account");
        return;
      }

      const response = await api.delete(`/patient/account?password=${encodeURIComponent(password)}&confirmDeletion=true`);

      if (response.success) {
        toast.success("Account deleted successfully");
        // Force logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to home page
        window.location.href = '/';
      } else {
        toast.error(response.message || "Failed to delete account");
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleSaveContact = async () => {
    try {
      // Update phone if changed
      if (tempPhone !== phone) {
        const phoneResponse = await api.post('/patient/update-phone', {
          phoneNumber: tempPhone
        });
        if (phoneResponse.data.success) {
          setPhone(phoneResponse.data.phoneNumber);
          toast.success("Phone number updated successfully");
        }
      }

      // Update email if changed (requires password)
      if (tempEmail !== email) {
        if (!emailPassword) {
          toast.error("Password required to change email");
          return;
        }
        const emailResponse = await api.post('/patient/change-email', {
          newEmail: tempEmail,
          password: emailPassword
        });
        if (emailResponse.data.success) {
          setEmail(emailResponse.data.newEmail);
          toast.success("Email updated successfully. Use this email to login next time.");
          setEmailPassword("");
        }
      }

      setIsEditingContact(false);
      fetchProfile(); // Refresh profile data
    } catch (error: any) {
      console.error('Failed to update contact:', error);
      toast.error(error.response?.data?.message || 'Failed to update contact details');
    }
  };

  const handleCancelContactEdit = () => {
    setTempPhone(phone);
    setTempEmail(email);
    setEmailPassword("");
    setIsEditingContact(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      const response = await api.post('/patient/change-password', {
        currentPassword,
        newPassword
      });
      if (response.data.success) {
        toast.success("Password changed successfully");
        setIsChangingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-primary">Profile</CardTitle>
        <CardDescription>Manage your account preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-foreground text-2xl">
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 text-foreground" />
            </Button>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Patient ID</Label>
            <p className="text-lg font-semibold">
              {isLoading ? "Loading..." : profile?.patientId || "N/A"}
            </p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Name</Label>
            <p className="text-lg font-semibold">
              {isLoading ? "Loading..." : profile?.fullName || "N/A"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Contact Details Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Contact Details</h3>
            <Dialog open={isEditingContact} onOpenChange={setIsEditingContact}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Contact Details</DialogTitle>
                  <DialogDescription>
                    Update your phone number and email address
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="inline mr-2 h-4 w-4" />
                      Phone Number (Zimbabwean format)
                    </Label>
                    <Input
                      id="phone"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      placeholder="+263771234567 or 0771234567"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: +263771234567 or 0771234567
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline mr-2 h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll use this email to login
                    </p>
                  </div>
                  {tempEmail !== email && (
                    <div className="space-y-2">
                      <Label htmlFor="email-password">
                        <Lock className="inline mr-2 h-4 w-4" />
                        Password (required to change email)
                      </Label>
                      <Input
                        id="email-password"
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Enter your current password"
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancelContactEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveContact}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Phone</Label>
            <p className="text-lg font-semibold">{phone}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-lg font-semibold">{email}</p>
          </div>
        </div>

        <Separator />

        {/* Change Password Section */}
        <div className="space-y-4">
          <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new one
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleChangePassword}>
                  Change Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="h-5 w-5 text-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-foreground" />
              )}
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle dark mode theme
                </p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </>
  );
};

export default ProfileSettings;

