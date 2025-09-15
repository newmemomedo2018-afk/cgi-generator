import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, X } from "lucide-react";

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}

interface ProcessingStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export default function ProgressModal({ isOpen, onClose, projectId }: ProgressModalProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "enhance", title: "تحسين الوصف", status: "pending" },
    { id: "image", title: "إنتاج الصورة", status: "pending" },
    { id: "video_prompt", title: "تحسين برومبت الفيديو", status: "pending" },
    { id: "video", title: "إنتاج الفيديو", status: "pending" },
  ]);
  
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    // Simulate progress updates
    const interval = setInterval(() => {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps];
        
        // Update current step
        if (currentStep < newSteps.length) {
          if (newSteps[currentStep].status === "pending") {
            newSteps[currentStep].status = "processing";
          } else if (newSteps[currentStep].status === "processing") {
            newSteps[currentStep].status = "completed";
            setCurrentStep(prev => prev + 1);
          }
        }
        
        return newSteps;
      });

      // Update overall progress
      setOverallProgress(prev => {
        const newProgress = Math.min(prev + 10, 100);
        if (newProgress >= 100) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
        return newProgress;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, currentStep, onClose]);

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case "completed":
        return <Check className="h-4 w-4 text-white" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-white animate-spin" />;
      case "failed":
        return <X className="h-4 w-4 text-white" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{steps.indexOf(step) + 1}</span>;
    }
  };

  const getStepStatus = (step: ProcessingStep) => {
    switch (step.status) {
      case "completed":
        return "مكتمل";
      case "processing":
        return "قيد التنفيذ";
      case "failed":
        return "فشل";
      default:
        return "في الانتظار";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md" data-testid="progress-modal">
        <DialogHeader className="text-center">
          <div className="text-4xl mb-4">🎬</div>
          <DialogTitle className="text-2xl">جاري إنتاج CGI</DialogTitle>
          <p className="text-muted-foreground">يرجى الانتظار، هذا قد يستغرق بضع دقائق</p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="space-y-4 my-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ml-3 ${
                    step.status === "completed" ? "bg-primary" : 
                    step.status === "processing" ? "bg-primary" : 
                    step.status === "failed" ? "bg-destructive" : "bg-muted"
                  }`}
                >
                  {getStepIcon(step)}
                </div>
                <span className="font-medium">{step.title}</span>
              </div>
              <span 
                className="text-sm text-muted-foreground"
                data-testid={`step-status-${step.id}`}
              >
                {getStepStatus(step)}
              </span>
            </div>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>التقدم الإجمالي</span>
            <span data-testid="overall-progress">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Cancel Button */}
        <Button 
          onClick={onClose}
          variant="outline"
          className="w-full glass-card hover:bg-white/20 text-white border-white/20"
          data-testid="cancel-button"
        >
          {overallProgress >= 100 ? "إغلاق" : "إلغاء العملية"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
