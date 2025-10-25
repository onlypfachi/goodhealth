import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-overlay-dark backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <div className="bg-card/95 backdrop-blur-md rounded-2xl shadow-card-hover p-8 md:p-12 max-w-md">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-brand-green">Good</span>
              <span className="text-foreground">Health queue</span>
            </h1>
            <p className="text-muted-foreground">
              Medical Queue Management System
            </p>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate("/doctor-dashboard")}
            >
              Doctor Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
