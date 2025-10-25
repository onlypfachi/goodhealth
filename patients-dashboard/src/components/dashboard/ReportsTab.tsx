import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, X, FileX } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MedicalReport {
  id: number;
  title: string;
  content: string;
  doctor: string;
  date: string;
  type: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

const ReportsTab = () => {
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reports/patient');
      if (response.success) {
        setReports(response.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load medical reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (reportId: number) => {
    setSelectedReport(reportId);
  };

  const handleDownload = (report: MedicalReport) => {
    // Create a downloadable text file with the report content
    const blob = new Blob([formatReportContent(report)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.title.replace(/\s+/g, '_')}_${report.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded: ${report.title}`);
  };

  const formatReportContent = (report: MedicalReport): string => {
    return `
MEDICAL REPORT
==============

Title: ${report.title}
Doctor: ${report.doctor}
Date: ${new Date(report.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
Type: ${report.type}
${report.appointmentDate ? `Appointment Date: ${report.appointmentDate}` : ''}
${report.appointmentTime ? `Appointment Time: ${report.appointmentTime}` : ''}

REPORT CONTENT:
---------------
${report.content}

---
Generated from Good Health Hospital Management System
    `.trim();
  };

  const closeViewer = () => {
    setSelectedReport(null);
  };

  const currentReport = reports.find(r => r.id === selectedReport);

  return (
    <>
      <div className="space-y-4">
        <Card className="shadow-card bg-card p-6">
          <h2 className="text-2xl font-bold text-primary mb-2">Medical Reports</h2>
          <p className="text-muted-foreground">Access and download your medical reports</p>
        </Card>

        {isLoading ? (
          <Card className="shadow-card bg-card p-8">
            <div className="text-center text-muted-foreground">Loading reports...</div>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="shadow-card bg-card p-8">
            <div className="text-center">
              <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">No Medical Reports</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your consultation reports will appear here after your doctor appointments
              </p>
            </div>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="shadow-card bg-card hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {report.doctor} • {new Date(report.date).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-medium">
                    {report.type}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleView(report.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Report
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gradient-primary border-0"
                    onClick={() => handleDownload(report)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={selectedReport !== null} onOpenChange={(open) => !open && closeViewer()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{currentReport?.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeViewer}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-6">
            {currentReport && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Doctor</p>
                    <p className="font-medium">{currentReport.doctor}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(currentReport.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{currentReport.type}</p>
                  </div>
                </div>

                {currentReport.appointmentDate && (
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Appointment Date</p>
                      <p className="font-medium">{currentReport.appointmentDate}</p>
                    </div>
                    {currentReport.appointmentTime && (
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Appointment Time</p>
                        <p className="font-medium">{currentReport.appointmentTime}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <h3 className="text-lg font-semibold mb-2">Report Content</h3>
                  <div className="whitespace-pre-wrap bg-card p-4 rounded-lg border">
                    {currentReport.content}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button onClick={() => handleDownload(currentReport)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReportsTab;
