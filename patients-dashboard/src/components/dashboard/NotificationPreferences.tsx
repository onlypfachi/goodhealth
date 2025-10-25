import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferencesProps {
  notifications: {
    position: number;
    method: "email" | "sms" | "both";
    subscribed: boolean;
  };
  onUpdate: (notifications: {
    position: number;
    method: "email" | "sms" | "both";
    subscribed: boolean;
  }) => void;
}

const NotificationPreferences = ({ notifications, onUpdate }: NotificationPreferencesProps) => {
  const handleSubscribe = () => {
    onUpdate({ ...notifications, subscribed: true });
    toast.success(`Notifications enabled via ${notifications.method}`);
  };

  const handleUnsubscribe = () => {
    onUpdate({ ...notifications, subscribed: false });
    toast.info("Notifications disabled");
  };

  return (
    <>
      <CardHeader>
        <CardTitle className="text-primary">Notification Preferences</CardTitle>
        <CardDescription>
          Get notified when your queue position is approaching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Notify me when I'm at position</Label>
          <Select
            value={notifications.position.toString()}
            onValueChange={(value) =>
              onUpdate({ ...notifications, position: parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st in queue</SelectItem>
              <SelectItem value="2">2nd in queue</SelectItem>
              <SelectItem value="3">3rd in queue</SelectItem>
              <SelectItem value="5">5th in queue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notification Method</Label>
          <Select
            value={notifications.method}
            onValueChange={(value: "email" | "sms" | "both") =>
              onUpdate({ ...notifications, method: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="both">Both Email & SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {notifications.subscribed ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleUnsubscribe}
          >
            <BellOff className="mr-2 h-4 w-4" />
            Unsubscribe from Notifications
          </Button>
        ) : (
          <Button
            className="w-full gradient-secondary border-0"
            onClick={handleSubscribe}
          >
            <Bell className="mr-2 h-4 w-4" />
            Subscribe to Notifications
          </Button>
        )}
      </CardContent>
    </>
  );
};

export default NotificationPreferences;
