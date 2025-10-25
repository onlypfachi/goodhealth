import { Phone, Clock, Bell, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Patient } from "@/pages/DoctorDashboard";
import { cn } from "@/lib/utils";

interface PatientCardProps {
  patient: Patient;
  onCall: (patientId: string) => void;
  onStart: (patientId: string) => void;
  onSkip: (patientId: string) => void;
  onNoShow: (patientId: string) => void;
}

const PatientCard = ({ patient, onCall, onStart, onSkip, onNoShow }: PatientCardProps) => {
  const isWaiting = patient.status === 'waiting';
  const isCalled = patient.status === 'called';
  const isInConsultation = patient.status === 'in_consultation';

  return (
    <div 
      className={cn(
        "bg-background border rounded-lg p-3 md:p-4 transition-all duration-200 touch-manipulation",
        "active:scale-[0.98]",
        isCalled && "border-primary bg-accent/50",
        isInConsultation && "border-success bg-success/5"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 md:mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-sm md:text-base truncate">
              {patient.name}
            </h3>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              #{patient.queueNumber}
            </Badge>
          </div>
          <div className="text-xs md:text-sm text-muted-foreground truncate">
            {patient.hospitalId}
          </div>
        </div>

        {patient.notifyAtPosition && (
          <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Bell className="h-3 w-3" />
            <span className="text-xs hidden sm:inline">Notify@{patient.notifyAtPosition}</span>
            <span className="text-xs sm:hidden">@{patient.notifyAtPosition}</span>
          </Badge>
        )}
      </div>

      {/* Symptoms */}
      <div className="mb-2 md:mb-3">
        <div className="flex items-start gap-2 text-xs md:text-sm">
          <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground line-clamp-2">{patient.symptoms}</p>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-3 mb-3 text-xs md:text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span>{patient.appointmentTime}</span>
        </div>
        {patient.phone && (
          <div className="flex items-center gap-1 hidden md:flex">
            <Phone className="h-4 w-4" />
            <span>{patient.phone}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {patient.status !== 'waiting' && (
        <div className="mb-3">
          <Badge 
            variant={
              isInConsultation ? "default" : 
              isCalled ? "secondary" : 
              "outline"
            }
            className={cn(
              "text-xs",
              isInConsultation && "bg-success text-success-foreground",
              isCalled && "bg-primary text-primary-foreground"
            )}
          >
            {isInConsultation ? "In Consultation" : isCalled ? "Called" : patient.status}
          </Badge>
        </div>
      )}

      {/* Action Buttons - Mobile optimized */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-2">
        <Button
          size="sm"
          variant="default"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 md:h-10 text-xs md:text-sm px-2"
          onClick={() => onCall(patient.id)}
          disabled={!isWaiting}
        >
          Call
        </Button>
        <Button
          size="sm"
          variant="default"
          className="bg-success text-success-foreground hover:bg-success/90 h-9 md:h-10 text-xs md:text-sm px-2"
          onClick={() => onStart(patient.id)}
          disabled={isInConsultation}
        >
          Start
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 md:h-10 text-xs md:text-sm px-2"
          onClick={() => onSkip(patient.id)}
          disabled={isInConsultation}
        >
          Skip
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive h-9 md:h-10 text-xs md:text-sm px-2"
          onClick={() => onNoShow(patient.id)}
          disabled={isInConsultation}
        >
          No
        </Button>
      </div>
    </div>
  );
};

export default PatientCard;
