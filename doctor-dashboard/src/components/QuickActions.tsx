import { PhoneCall, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsProps {
  onCallNext: () => void;
  waitingCount: number;
  onInsertEmergency: () => void;
}

const QuickActions = ({ onCallNext, waitingCount, onInsertEmergency }: QuickActionsProps) => {
  const { toast } = useToast();

  const handleMarkAllSeen = () => {
    console.log("Marking all patients as seen");
    toast({
      title: "Shift Complete",
      description: "All patients marked as seen",
    });
  };

  const handleInsertUrgent = () => {
    onInsertEmergency();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
      <Button
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 md:h-16"
        onClick={onCallNext}
        disabled={waitingCount === 0}
      >
        <PhoneCall className="h-4 w-4 md:h-5 md:w-5 mr-2" />
        <div className="text-left">
          <div className="text-sm md:text-base font-semibold">Call Next Patient</div>
          <div className="text-xs opacity-90">
            {waitingCount > 0 ? `${waitingCount} waiting` : 'No patients waiting'}
          </div>
        </div>
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="h-14 md:h-16"
        onClick={handleInsertUrgent}
      >
        <AlertCircle className="h-4 w-4 md:h-5 md:w-5 mr-2 text-destructive" />
        <div className="text-left">
          <div className="text-sm md:text-base font-semibold">Insert Urgent</div>
          <div className="text-xs text-muted-foreground">Emergency patient</div>
        </div>
      </Button>

      <Button
        size="lg"
        variant="outline"
        className="h-14 md:h-16"
        onClick={handleMarkAllSeen}
      >
        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 mr-2 text-success" />
        <div className="text-left">
          <div className="text-sm md:text-base font-semibold">Mark All Seen</div>
          <div className="text-xs text-muted-foreground">Close shift</div>
        </div>
      </Button>
    </div>
  );
};

export default QuickActions;
