import { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, FileText, Timer, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface ScheduleItem {
  id: string;
  time: string;
  patientName: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  type: string;
  consultationDetails?: {
    duration: string;
    diagnosis: string;
    prescription: string;
    reportSent: boolean;
    notes: string;
    reportContent?: {
      title: string;
      content: string;
      timestamp: string;
      patientVisible: boolean;
    };
  };
}

interface ScheduleListProps {
  doctorId: string;
  schedule?: ScheduleItem[]; // Accept schedule as prop
}

const ScheduleList = ({ doctorId, schedule: propSchedule = [] }: ScheduleListProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleItem[]>(propSchedule);
  const [selectedConsultation, setSelectedConsultation] = useState<ScheduleItem | null>(null);
  const [viewingReport, setViewingReport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch schedule for a specific date
  const fetchScheduleForDate = async (date: Date) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('staffToken');
      if (!token) {
        console.error('No staff token found');
        return;
      }

      const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const response = await fetch(`http://localhost:5000/api/queue-mgmt/doctor/schedule?date=${dateStr}`, {
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
        // Transform API data to match ScheduleItem interface
        const transformedSchedule: ScheduleItem[] = data.data.appointments.map((apt: any) => ({
          id: apt.appointment_id.toString(),
          time: apt.appointment_time || "N/A",
          patientName: apt.patient_name || "Unknown",
          status: apt.status || 'scheduled',
          type: apt.reason || "Consultation"
        }));

        setSchedule(transformedSchedule);
      } else {
        // No appointments for this date
        setSchedule([]);
      }
    } catch (error) {
      console.error('Error fetching schedule for date:', error);
      toast({
        title: "Error Loading Schedule",
        description: `Could not load appointments for ${formatDate(date)}`,
        variant: "destructive"
      });
      setSchedule([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch schedule when date changes
  useEffect(() => {
    fetchScheduleForDate(currentDate);
  }, [currentDate]);

  // Navigate to previous day
  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  // Navigate to next day
  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleConsultationClick = (item: ScheduleItem) => {
    if (item.status === 'completed' && item.consultationDetails) {
      setSelectedConsultation(item);
      setViewingReport(false);
    }
  };

  const handleViewReport = () => {
    setViewingReport(true);
  };

  const handleBackToSummary = () => {
    setViewingReport(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'cancelled':
      case 'no_show':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: "outline",
      completed: "default",
      cancelled: "destructive",
      no_show: "destructive"
    };

    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="bg-card rounded-lg md:rounded-xl shadow-card p-3 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold text-foreground">
            {isLoading ? "Loading..." : "Schedule"}
          </h3>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            onClick={handlePreviousDay}
            disabled={isLoading}
          >
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8"
            onClick={handleNextDay}
            disabled={isLoading}
          >
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </div>
      </div>

      {/* Date */}
      <div className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
        {formatDate(currentDate)}
      </div>

      {/* Schedule List */}
      <div className="space-y-2 md:space-y-3 max-h-[400px] md:max-h-[600px] overflow-y-auto">
        {schedule.map((item) => (
          <div
            key={item.id}
            onClick={() => handleConsultationClick(item)}
            className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors ${
              item.status === 'completed' ? 'cursor-pointer' : ''
            }`}
          >
            {/* Time */}
            <div className="text-center min-w-[50px] md:min-w-[60px]">
              <div className="text-xs md:text-sm font-semibold text-foreground">{item.time}</div>
              <div className="text-[10px] md:text-xs text-muted-foreground truncate">{item.type}</div>
            </div>

            {/* Status Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(item.status)}
            </div>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs md:text-sm text-foreground truncate">
                {item.patientName}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground">
                {item.status === 'scheduled' ? 'Scheduled' : 'Completed'}
              </div>
            </div>

            {/* Status Badge - Hidden on mobile */}
            <div className="hidden sm:block">
              {getStatusBadge(item.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-border">
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div>
            <div className="text-lg md:text-2xl font-semibold text-foreground">
              {schedule.length}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground">Total</div>
          </div>
          <div>
            <div className="text-lg md:text-2xl font-semibold text-success">
              {schedule.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground">Done</div>
          </div>
          <div>
            <div className="text-lg md:text-2xl font-semibold text-primary">
              {schedule.filter(s => s.status === 'scheduled').length}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      {/* Consultation Details Dialog */}
      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingReport ? 'Full Medical Report' : 'Consultation Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedConsultation?.patientName} - {selectedConsultation?.time}
            </DialogDescription>
          </DialogHeader>
          
          {selectedConsultation?.consultationDetails && !viewingReport && (
            <div className="space-y-4">
              {/* Duration */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <Timer className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Consultation Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedConsultation.consultationDetails.duration}
                  </p>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Diagnosis</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedConsultation.consultationDetails.diagnosis}
                  </p>
                </div>
              </div>

              {/* Prescription */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Prescription</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedConsultation.consultationDetails.prescription}
                  </p>
                </div>
              </div>

              {/* Report Status */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Report Status</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {selectedConsultation.consultationDetails.reportSent ? 'Report Sent' : 'Pending'}
                      </Badge>
                      {selectedConsultation.consultationDetails.reportSent && (
                        <span className="text-xs text-muted-foreground">PDF report sent to patient</span>
                      )}
                    </div>
                    {selectedConsultation.consultationDetails.reportSent && 
                     selectedConsultation.consultationDetails.reportContent && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleViewReport}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Report
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Clinical Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedConsultation.consultationDetails.notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Full Report View */}
          {selectedConsultation?.consultationDetails?.reportContent && viewingReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBackToSummary}
                  className="gap-2"
                >
                  ← Back to Summary
                </Button>
                <Badge variant={selectedConsultation.consultationDetails.reportContent.patientVisible ? "default" : "secondary"}>
                  {selectedConsultation.consultationDetails.reportContent.patientVisible ? "Visible to Patient" : "Internal Only"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {selectedConsultation.consultationDetails.reportContent.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Generated on {new Date(selectedConsultation.consultationDetails.reportContent.timestamp).toLocaleString()}
                  </p>
                </div>

                <Separator />

                <div className="bg-accent/30 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                    {selectedConsultation.consultationDetails.reportContent.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScheduleList;
