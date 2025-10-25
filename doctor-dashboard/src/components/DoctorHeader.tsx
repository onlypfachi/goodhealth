import { Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

interface DoctorHeaderProps {
  doctor: {
    name: string;
    id: string;
    avatar: string;
  };
  queueCount: number;
  onProfileClick: () => void;
}

const DoctorHeader = ({ doctor, queueCount, onProfileClick }: DoctorHeaderProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-header-blur backdrop-blur-md">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <div className="text-base md:text-xl font-semibold">
            <span className="text-primary">Good</span>
            <span className="text-foreground">Health</span>
          </div>
        </div>

        {/* Right: Queue Badge + Doctor Info + Logout */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Queue Badge - Desktop */}
          <Badge 
            variant="default" 
            className="bg-primary text-primary-foreground px-2 md:px-3 py-1 hidden sm:flex items-center gap-1.5"
          >
            <Bell className="h-3 w-3" />
            <span className="text-xs md:text-sm font-medium">{queueCount} waiting</span>
          </Badge>

          {/* Mobile Queue Count */}
          <button className="sm:hidden relative p-2 hover:bg-accent rounded-lg transition-colors">
            <Bell className="h-5 w-5 text-primary" />
            {queueCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-medium">
                {queueCount}
              </span>
            )}
          </button>

          {/* Doctor Info - Desktop - Clickable */}
          <button onClick={onProfileClick} className="hidden lg:flex items-center gap-3 hover:bg-accent/50 rounded-lg px-3 py-2 transition-colors">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">{doctor.name}</div>
              <div className="text-xs text-muted-foreground">{doctor.id}</div>
            </div>
            <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={doctor.avatar} alt={doctor.name} />
              <AvatarFallback>{doctor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
          </button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Mobile Avatar - Clickable */}
          <button onClick={onProfileClick} className="lg:hidden">
            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={doctor.avatar} alt={doctor.name} />
              <AvatarFallback className="text-xs">{doctor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DoctorHeader;
