import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, User, Building2, Calendar, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Booking } from "@/pages/Dashboard";

interface QueueStatusProps {
  booking: Booking;
  onReschedule?: () => void;
}

const QueueStatus = ({ booking, onReschedule }: QueueStatusProps) => {
  const { toast } = useToast();
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleReschedule = async () => {
    setIsRescheduling(true);

    try {
      // Get token and appointment ID from storage
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!userStr) {
        toast({
          title: "Error",
          description: "Please log in again",
          variant: "destructive"
        });
        setIsRescheduling(false);
        return;
      }

      const user = JSON.parse(userStr);
      const appointmentId = booking.id;

      if (!appointmentId) {
        toast({
          title: "Error",
          description: "Appointment ID not found",
          variant: "destructive"
        });
        setIsRescheduling(false);
        return;
      }

      console.log('🔄 Rescheduling appointment...', { appointmentId });

      const response = await fetch('http://127.0.0.1:8000/api/appointments/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: appointmentId
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✅ Appointment Rescheduled!",
          description: `Your appointment has been moved to ${data.data.formattedDate} at ${data.data.newTime}. You are now Queue #${data.data.newQueueNumber}.`,
          duration: 6000
        });

        // Reload the page to show updated appointment
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Reschedule Failed",
          description: data.message || "Unable to reschedule appointment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-primary">Queue Status</CardTitle>
        <CardDescription>Your current appointment details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center p-8 rounded-lg bg-primary/5 border border-primary/10">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Queue Number</p>
            <p className="text-5xl font-bold text-primary">
              #{booking.queue_number.toString().padStart(2, "0")}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Doctor</span>
            </div>
            <span className="font-semibold text-sm">{booking.doctor}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Department</span>
            </div>
            <span className="font-semibold text-sm">{booking.department}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Date</span>
            </div>
            <span className="font-semibold text-sm">{new Date(booking.appointment_date).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Time</span>
            </div>
            <span className="font-semibold text-sm">{booking.appointment_time}</span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <Badge className="w-full justify-center py-2 bg-success text-success-foreground">Active Booking</Badge>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleReschedule}
            disabled={isRescheduling}
          >
            <RefreshCw className={`h-4 w-4 ${isRescheduling ? 'animate-spin' : ''}`} />
            {isRescheduling ? 'Rescheduling...' : 'Reschedule Appointment'}
          </Button>
        </div>
      </CardContent>
    </>
  );
};

export default QueueStatus;
