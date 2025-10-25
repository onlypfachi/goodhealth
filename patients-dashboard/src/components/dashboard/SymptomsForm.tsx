import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

interface SymptomsFormProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const SymptomsForm = ({ value, onChange, error }: SymptomsFormProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="symptoms" className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Symptoms & Illness Description
      </Label>
      <Textarea
        id="symptoms"
        placeholder="Example: I have been experiencing chest pain and shortness of breath for the past 3 days. The pain is sharp and occurs mainly during physical activity..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[120px] resize-none ${error ? "border-destructive" : ""}`}
      />
      <p className="text-sm text-muted-foreground">
        Be as detailed as possible to help us assign the right specialist
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default SymptomsForm;
