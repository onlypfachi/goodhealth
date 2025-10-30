import { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  Calendar,
  Clock,
  AlertCircle,
  Activity,
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [stats, setStats] = useState([
    {
      title: "Total Patients",
      value: "0",
      icon: Users,
      trend: { value: "Loading...", isPositive: true },
      iconColor: "bg-primary",
    },
    {
      title: "Active Doctors",
      value: "0",
      icon: Stethoscope,
      trend: { value: "Loading...", isPositive: true },
      iconColor: "bg-accent-teal",
    },
    {
      title: "Today's Appointments",
      value: "0",
      icon: Calendar,
      trend: { value: "Loading...", isPositive: true },
      iconColor: "bg-accent-green",
    },
    {
      title: "Avg Wait Time",
      value: "0 min",
      icon: Clock,
      trend: { value: "Loading...", isPositive: true },
      iconColor: "bg-primary-light",
    },
  ]);

  const [queueStatus, setQueueStatus] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem("staffToken");
    if (!token) return;

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      // === Fetch Stats ===
      const statsRes = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
        headers,
      });
      const statsData = await statsRes.json();

      if (statsData?.success) {
        const d = statsData;
        setStats([
          {
            title: "Total Patients",
            value: d.totalPatients?.toString() || "0",
            icon: Users,
            trend: { value: "↑ steady", isPositive: true },
            iconColor: "bg-primary",
          },
          {
            title: "Active Doctors",
            value: d.activeDoctors?.toString() || "0",
            icon: Stethoscope,
            trend: { value: "Active staff", isPositive: true },
            iconColor: "bg-accent-teal",
          },
          {
            title: "Today's Appointments",
            value: d.todaysAppointments?.toString() || "0",
            icon: Calendar,
            trend: { value: "Today", isPositive: true },
            iconColor: "bg-accent-green",
          },
          {
            title: "Avg Wait Time",
            value: `${d.avgWaitTime || 0} min`,
            icon: Clock,
            trend: { value: "Average today", isPositive: true },
            iconColor: "bg-primary-light",
          },
        ]);
      }

      // === Fetch Queue Status ===
      const queueRes = await fetch(`${API_BASE_URL}/api/dashboard/queue-status`, {
        headers,
      });
      console.log("Queue Response:", queueRes);
      const queueData = await queueRes.json();
      if (queueData?.success && Array.isArray(queueData.data)) {
        setQueueStatus(queueData.data);
      } else {
        setQueueStatus([]);
      }

      // === Fetch Alerts ===
      const alertsRes = await fetch(`${API_BASE_URL}/api/dashboard/alerts`, {
        headers,
      });
      const alertsData = await alertsRes.json();
      if (alertsData?.success && Array.isArray(alertsData.data)) {
        setAlerts(alertsData.data);
      } else {
        setAlerts([]);
      }

      // === Fetch Recent Activity ===
      const activityRes = await fetch(`${API_BASE_URL}/api/dashboard/recent-activity`, {
        headers,
      });
      const activityData = await activityRes.json();
      if (activityData?.success && Array.isArray(activityData.data)) {
        setRecentActivity(activityData.data);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Monitor your healthcare facility's performance at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Queue + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Queue Status by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueStatus.length > 0 ? (
              <div className="space-y-4">
                {queueStatus.map((dept, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-smooth"
                  >
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {dept.department}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>
                          Waiting:{" "}
                          <span className="font-medium text-foreground">
                            {dept.waiting}
                          </span>
                        </span>
                        <span>
                          In Progress:{" "}
                          <span className="font-medium text-accent-teal">
                            {dept.inProgress}
                          </span>
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        dept.status === "high"
                          ? "destructive"
                          : dept.status === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {dept.status === "high"
                        ? "High Load"
                        : dept.status === "medium"
                        ? "Medium"
                        : "Normal"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No queue data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              System Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border hover:border-primary transition-smooth"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          alert.type === "emergency"
                            ? "bg-destructive"
                            : alert.type === "warning"
                            ? "bg-yellow-500"
                            : "bg-accent-green"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                No system alerts
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity, i) => {
                const isDoctor = activity.action?.includes("Doctor");
                const timeAgo = new Date(activity.timestamp).toLocaleString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-smooth"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isDoctor ? "bg-accent-teal/10" : "bg-primary/10"
                        }`}
                      >
                        {isDoctor ? (
                          <Stethoscope className="w-5 h-5 text-accent-teal" />
                        ) : (
                          <Users className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
