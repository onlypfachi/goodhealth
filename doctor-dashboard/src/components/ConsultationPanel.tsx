import { X, User, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/pages/DoctorDashboard";
import ReportComposer from "./ReportComposer";
import { useState } from "react";

interface ConsultationPanelProps {
  patient: Patient;
  onComplete: () => void;
  onClose: () => void;
}

const ConsultationPanel = ({ patient, onComplete, onClose }: ConsultationPanelProps) => {
  const [startTime] = useState(new Date());
  const [duration, setDuration] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card rounded-lg md:rounded-xl shadow-card p-3 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-base md:text-xl font-semibold text-foreground">Consultation</h2>
            <Badge className="bg-success text-success-foreground text-xs">
              In Progress
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span>Duration: {formatDuration(duration)}</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
          className="h-8 w-8 md:h-10 md:w-10 -mr-2"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>

      {/* Patient Details */}
      <div className="bg-accent/50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm md:text-base truncate">
              {patient.name}
            </h3>
            <div className="text-xs md:text-sm text-muted-foreground truncate">
              {patient.hospitalId} • {patient.appointmentTime}
            </div>
          </div>
        </div>

        {/* Contact */}
        {patient.phone && (
          <div className="mb-2 md:mb-3">
            <div className="text-xs text-muted-foreground mb-0.5 md:mb-1">Contact</div>
            <div className="text-xs md:text-sm text-foreground">{patient.phone}</div>
          </div>
        )}

        {/* Symptoms */}
        <div className="mb-2 md:mb-3">
          <div className="text-xs text-muted-foreground mb-0.5 md:mb-1">Symptoms</div>
          <div className="text-xs md:text-sm text-foreground">{patient.symptoms}</div>
        </div>

        {/* Medical History */}
        {patient.medicalHistory && (
          <div>
            <div className="text-xs text-muted-foreground mb-0.5 md:mb-1">Medical History</div>
            <div className="text-xs md:text-sm text-foreground">{patient.medicalHistory}</div>
          </div>
        )}
      </div>

      {/* Report Composer */}
      <ReportComposer
        patientId={patient.patientUserId?.toString() || patient.id}
        patientName={patient.name}
        appointmentId={patient.appointmentId}
        onComplete={onComplete}
      />

      {/* Actions */}
      <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
        <Button
          className="flex-1 bg-success text-success-foreground hover:bg-success/90 h-11 md:h-12"
          onClick={onComplete}
        >
          <FileText className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Complete Consultation</span>
          <span className="sm:hidden">Complete</span>
        </Button>
      </div>
    </div>
  );
};

export default ConsultationPanel;
