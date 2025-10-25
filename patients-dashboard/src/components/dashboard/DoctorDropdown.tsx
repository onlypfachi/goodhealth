import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  availability: string;
  departmentId: string;
}

// Fetch doctors from API
const fetchDoctorsByDepartment = async (departmentId: string): Promise<Doctor[]> => {
  const response = await fetch(`${API_BASE_URL}/api/departments/${departmentId}/doctors`);

  if (!response.ok) {
    throw new Error('Failed to fetch doctors');
  }

  const data = await response.json();

  if (data.success && data.data) {
    // Transform API data to match component format
    return data.data.map((doctor: any) => ({
      id: doctor.user_id.toString(),
      name: doctor.full_name,
      specialty: doctor.department_name || "General Practice",
      availability: "Available for booking",
      departmentId: departmentId
    }));
  }

  return [];
};

interface DoctorDropdownProps {
  departmentId: string;
  value: string;
  onChange: (value: string) => void;
}

const DoctorDropdown = ({ departmentId, value, onChange }: DoctorDropdownProps) => {
  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors", departmentId],
    queryFn: () => fetchDoctorsByDepartment(departmentId),
    enabled: !!departmentId,
  });

  if (!departmentId) {
    return null;
  }

  return (
    <div className="space-y-2 animate-in">
      <Label htmlFor="doctor" className="flex items-center gap-2">
        <UserCog className="h-4 w-4 text-primary" />
        Select Doctor (Optional)
      </Label>
      {isLoading ? (
        <div className="flex items-center gap-2 p-3 border border-input rounded-md bg-muted/30">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading available doctors...</span>
        </div>
      ) : (
        <>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id="doctor">
              <SelectValue placeholder="Let the system auto-assign or choose a doctor" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {doctors?.map((doctor) => (
                <SelectItem key={doctor.id} value={doctor.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{doctor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {doctor.specialty} • {doctor.availability}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {doctors && doctors.length > 0 
              ? `${doctors.length} doctor${doctors.length > 1 ? "s" : ""} available in this department`
              : "No doctors available in this department"}
          </p>
        </>
      )}
    </div>
  );
};

export default DoctorDropdown;
