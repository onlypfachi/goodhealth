import { useState } from "react";
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
    symptoms: string;
    appointmentDate: string;
    doctorId?: string;
  }) => void;
}

const BookingForm = ({ onSubmit }: BookingFormProps) => {
  const [department, setDepartment] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    department?: string;
    symptoms?: string;
    appointmentDate?: string;
  }>({});

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getNextWeekdayDate = () => {
    let date = new Date();
    date.setDate(date.getDate() + 1); // Start from tomorrow

    // If it's a weekend, move to Monday
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) { // Sunday
      date.setDate(date.getDate() + 1); // Move to Monday
    } else if (dayOfWeek === 6) { // Saturday
      date.setDate(date.getDate() + 2); // Move to Monday
    }

    return date.toISOString().split('T')[0];
  };

  const isWeekend = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!department.trim()) {
      newErrors.department = "Please select a department";
    }

    if (!symptoms.trim()) {
      newErrors.symptoms = "Please describe your symptoms";
    } else if (symptoms.trim().length < 10) {
      newErrors.symptoms = "Please provide more details (at least 10 characters)";
    }

    if (!appointmentDate) {
      newErrors.appointmentDate = "Please select an appointment date";
    }
    // ✅ Removed weekend error - we auto-adjust weekends to Monday instead

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
      // ✅ AUTO-ADJUST WEEKEND TO MONDAY
      let finalAppointmentDate = appointmentDate;

      if (isWeekend(appointmentDate)) {
        const date = new Date(appointmentDate);
        const dayOfWeek = date.getDay();

        // Calculate days to add to get to Monday
        let daysToAdd = 0;
        if (dayOfWeek === 0) { // Sunday
          daysToAdd = 1; // Move to Monday
        } else if (dayOfWeek === 6) { // Saturday
          daysToAdd = 2; // Move to Monday
        }

        date.setDate(date.getDate() + daysToAdd);
        finalAppointmentDate = date.toISOString().split('T')[0];

        toast.info(
          `Weekend booking adjusted! Your appointment has been moved to Monday, ${new Date(finalAppointmentDate).toLocaleDateString()}`,
          { duration: 5000 }
        );
      }

      // Call the parent onSubmit which will handle the API call
      onSubmit({
        department,
        symptoms,
        appointmentDate: finalAppointmentDate, // Use the adjusted date
        doctorId: doctorId || undefined,
      });

      toast.success(
        `Appointment scheduled for ${new Date(finalAppointmentDate).toLocaleDateString()}! ${
          doctorId
            ? "You'll be seen by your selected doctor."
            : "Our system will assign you to the best available doctor."
        }`
      );

      // Reset form
      setDepartment("");
      setSymptoms("");
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
              setDoctorId(""); // Reset doctor selection when department changes
              setErrors({ ...errors, department: undefined });
            }}
            error={errors.department}
          />

          {/* Appointment Date */}
          <div className="space-y-2">
            <Label htmlFor="appointmentDate" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Appointment Date * <span className="text-xs text-muted-foreground">(Weekdays only)</span>
            </Label>
            <input
              id="appointmentDate"
              type="date"
              value={appointmentDate}
              min={getTomorrowDate()}
              onChange={(e) => {
                const selectedDate = e.target.value;
                setAppointmentDate(selectedDate);

                // Show warning if weekend selected
                if (isWeekend(selectedDate)) {
                  toast.warning("Note: Weekend appointments are not available. System will automatically adjust to next weekday.", {
                    duration: 4000
                  });
                }

                setErrors({ ...errors, appointmentDate: undefined });
              }}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.appointmentDate && (
              <p className="text-sm text-destructive">{errors.appointmentDate}</p>
            )}
            <p className="text-xs text-muted-foreground">
              📅 Appointments are available Monday through Friday, 8:00 AM - 4:00 PM
            </p>
          </div>

          {/* Info about automatic time assignment */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Automatic Time Assignment</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your appointment time will be automatically assigned based on the queue. Each patient gets 25 minutes with the doctor starting from 8:00 AM.
                </p>
              </div>
            </div>
          </div>

          {/* Optional: Preferred Doctor */}
          {department && (
            <div className="space-y-2">
              <DoctorDropdown
                departmentId={department}
                value={doctorId}
                onChange={setDoctorId}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for automatic assignment to the doctor with least workload
              </p>
            </div>
          )}

          <SymptomsForm
            value={symptoms}
            onChange={(value) => {
              setSymptoms(value);
              setErrors({ ...errors, symptoms: undefined });
            }}
            error={errors.symptoms}
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
