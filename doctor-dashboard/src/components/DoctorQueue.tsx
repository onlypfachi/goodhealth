import { Patient } from "@/pages/DoctorDashboard";
import PatientCard from "./PatientCard";

interface DoctorQueueProps {
  patients: Patient[];
  onCall: (patientId: string) => void;
  onStart: (patientId: string) => void;
  onSkip: (patientId: string) => void;
  onNoShow: (patientId: string) => void;
}

const DoctorQueue = ({ patients, onCall, onStart, onSkip, onNoShow }: DoctorQueueProps) => {
  // Show all today's scheduled appointments in the queue (including emergency patients)
  // Database only has: 'scheduled', 'completed', 'cancelled', 'no-show'
  const waitingPatients = patients.filter(p =>
    ['waiting', 'called', 'in_consultation', 'scheduled'].includes(p.status)
  );

  return (
    <div className="bg-card rounded-lg md:rounded-xl shadow-card p-3 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-base md:text-xl font-semibold text-foreground">Patient Queue</h2>
        <span className="text-xs md:text-sm text-muted-foreground">
          {waitingPatients.length} patient{waitingPatients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {waitingPatients.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <div className="text-muted-foreground mb-2 text-sm md:text-base">No patients in queue</div>
          <div className="text-xs md:text-sm text-muted-foreground">All caught up! 🎉</div>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {waitingPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onCall={onCall}
              onStart={onStart}
              onSkip={onSkip}
              onNoShow={onNoShow}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorQueue;
