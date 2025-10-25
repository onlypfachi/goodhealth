import { useState } from "react";
import { FileText, Paperclip, Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ReportComposerProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onComplete?: () => void;
}

const ReportComposer = ({ patientId, patientName, appointmentId, onComplete }: ReportComposerProps) => {
  const [title, setTitle] = useState("");
  const [report, setReport] = useState("");
  const [isPatientVisible, setIsPatientVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveDraft = () => {
    setIsSaving(true);
    console.log("Saving draft:", { patientId, title, report });
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Draft saved",
        description: "Report draft saved successfully",
      });
    }, 500);
  };

  const handleSendReport = async () => {
    if (!title.trim() || !report.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both title and report content",
        variant: "destructive"
      });
      return;
    }

    if (!appointmentId) {
      toast({
        title: "Error",
        description: "Appointment ID is missing. Cannot send report.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('staffToken');
      const response = await fetch('http://localhost:5000/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          patientId: patientId,
          title: title,
          content: report,
          isPatientVisible: isPatientVisible,
          reportType: 'consultation'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Report sent",
          description: `Report sent to ${patientName} successfully`,
        });

        // Clear form
        setTitle("");
        setReport("");

        if (onComplete) {
          onComplete();
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send report",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Connection Error",
        description: "Unable to send report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachFile = () => {
    console.log("File attachment clicked");
    toast({
      title: "Feature coming soon",
      description: "File attachment will be available in the next update",
    });
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <h3 className="text-sm md:text-base font-semibold text-foreground">Consultation Report</h3>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="report-title" className="text-xs md:text-sm text-foreground mb-2">
          Report Title
        </Label>
        <input
          id="report-title"
          type="text"
          placeholder="e.g., General Consultation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Report Content */}
      <div>
        <Label htmlFor="report-content" className="text-xs md:text-sm text-foreground mb-2">
          Report Content
        </Label>
        <Textarea
          id="report-content"
          placeholder="Enter consultation notes..."
          value={report}
          onChange={(e) => setReport(e.target.value)}
          className="min-h-[150px] md:min-h-[200px] resize-none text-sm"
        />
        <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
          {report.length} characters
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between py-2 md:py-3 px-3 md:px-4 bg-accent/50 rounded-lg">
        <div>
          <Label htmlFor="patient-visible" className="text-xs md:text-sm font-medium">
            Patient Viewable
          </Label>
          <div className="text-[10px] md:text-xs text-muted-foreground">
            Allow patient to view
          </div>
        </div>
        <Switch
          id="patient-visible"
          checked={isPatientVisible}
          onCheckedChange={setIsPatientVisible}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="flex-1 h-10 md:h-11 text-xs md:text-sm"
        >
          <Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Save Draft</span>
          <span className="sm:hidden">Save</span>
        </Button>
        <Button
          variant="outline"
          onClick={handleAttachFile}
          size="icon"
          className="h-10 w-10 md:h-11 md:w-11 flex-shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleSendReport}
          disabled={isSaving}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-10 md:h-11 text-xs md:text-sm"
        >
          <Send className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
          {isSaving ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
};

export default ReportComposer;
