import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar, Stethoscope, Loader2, CalendarDays, Clock } from "lucide-react";
import { toast } from "sonner";
import DepartmentSelector from "./DepartmentSelector";
import SymptomsForm from "./SymptomsForm";
import DoctorDropdown from "./DoctorDropdown";

interface BookingFormProps {
  onSubmit: (bookingData: {
    department: string;
    reason: string;
    appointment_date: string;
    doctor_id?: string;
  }) => void;
}

const FORM_STORAGE_KEY = "bookingFormData"; // 🔑 localStorage key

const BookingForm = ({ onSubmit }: BookingFormProps) => {
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [appointment_date, setAppointmentDate] = useState("");
  const [doctor_id, setDoctorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    department?: string;
    reason?: string;
    appointment_date?: string;
  }>({});

  // 🔄 Load saved form data when component mounts
  useEffect(() => {
    const savedData = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setDepartment(parsed.department || "");
        setReason(parsed.reason || "");
        setAppointmentDate(parsed.appointment_date || "");
        setDoctorId(parsed.doctor_id || "");
      } catch (err) {
        console.error("Failed to parse saved form data:", err);
      }
    }
  }, []);

  // 💾 Auto-save form changes
  useEffect(() => {
    const data = { department, reason, appointment_date, doctor_id };
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data));
  }, [department, reason, appointment_date, doctor_id]);

  // Helper functions
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!department.trim()) newErrors.department = "Please select a department";
    if (!reason.trim()) newErrors.reason = "Please describe your symptoms";
    else if (reason.trim().length < 10)
      newErrors.reason = "Please provide more details (at least 10 characters)";
    if (!appointment_date) newErrors.appointment_date = "Please select an appointment date";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalAppointmentDate = appointment_date;

      // Adjust weekends automatically
      if (isWeekend(appointment_date)) {
        const date = new Date(appointment_date);
        date.setDate(date.getDate() + (date.getDay() === 6 ? 2 : 1));
        finalAppointmentDate = date.toISOString().split("T")[0];
        toast.info(
          `Weekend booking adjusted! Your appointment has been moved to Monday, ${new Date(finalAppointmentDate).toLocaleDateString()}`,
          { duration: 5000 }
        );
      }

      await onSubmit({
        department,
        reason,
        appointment_date: finalAppointmentDate,
        doctor_id: doctor_id || undefined,
      });

      toast.success(`Appointment scheduled for ${new Date(finalAppointmentDate).toLocaleDateString()}!`);
      
      // ✅ Clear storage & reset form after successful submission
      localStorage.removeItem(FORM_STORAGE_KEY);
      setDepartment("");
      setReason("");
      setAppointmentDate("");
      setDoctorId("");
      setErrors({});
    } catch (error) {
      toast.error("Failed to submit appointment. Please try again.");
      console.error("Booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Book an Appointment</CardTitle>
        </div>
        <CardDescription>
          Our AI system will automatically assign you to the best available doctor
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DepartmentSelector
            value={department}
            onChange={(value) => {
              setDepartment(value);
              setDoctorId("");
              setErrors({ ...errors, department: undefined });
            }}
            error={errors.department}
          />

          <div className="space-y-2">
            <Label htmlFor="appointmentDate" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Appointment Date * <span className="text-xs text-muted-foreground">(Weekdays only)</span>
            </Label>
            <input
              id="appointmentDate"
              type="date"
              value={appointment_date}
              min={getTomorrowDate()}
              onChange={(e) => {
                const selectedDate = e.target.value;
                setAppointmentDate(selectedDate);
                if (isWeekend(selectedDate)) {
                  toast.warning("Weekend appointments will be moved to Monday.", { duration: 4000 });
                }
                setErrors({ ...errors, appointment_date: undefined });
              }}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.appointment_date && (
              <p className="text-sm text-destructive">{errors.appointment_date}</p>
            )}
            <p className="text-xs text-muted-foreground">
              📅 Appointments available Monday–Friday, 8:00 AM – 4:00 PM
            </p>
          </div>

          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Automatic Time Assignment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your appointment time will be automatically assigned based on the queue.
                </p>
              </div>
            </div>
          </div>

          {department && (
            <div className="space-y-2">
              <DoctorDropdown
                departmentId={department}
                value={doctor_id}
                onChange={setDoctorId}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for automatic assignment to the least busy doctor.
              </p>
            </div>
          )}

          <SymptomsForm
            value={reason}
            onChange={(value) => {
              setReason(value);
              setErrors({ ...errors, reason: undefined });
            }}
            error={errors.reason}
          />

          <Button
            type="submit"
            className="w-full gradient-primary border-0"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Stethoscope className="mr-2 h-4 w-4" />
                Book Appointment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </>
  );
};

export default BookingForm;
