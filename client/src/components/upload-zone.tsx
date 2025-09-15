import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload, Image as ImageIcon, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  previewUrl?: string;
  label: string;
  sublabel: string;
  testId: string;
}

export default function UploadZone({
  onFileUpload,
  isUploading,
  previewUrl,
  label,
  sublabel,
  testId
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    onFileUpload(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div data-testid={testId}>
      <Card 
        className={`upload-zone cursor-pointer transition-all ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="p-8 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-lg font-medium mb-2">جاري رفع الصورة...</p>
              <p className="text-sm text-muted-foreground">يرجى الانتظار</p>
            </>
          ) : previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="معاينة الصورة" 
                className="w-full h-48 object-cover rounded-lg mb-4"
                data-testid={`${testId}-preview`}
              />
              <p className="text-sm text-muted-foreground">انقر لتغيير الصورة</p>
            </>
          ) : (
            <>
              <CloudUpload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">{label}</p>
              <p className="text-sm text-muted-foreground">{sublabel}</p>
            </>
          )}
        </CardContent>
      </Card>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid={`${testId}-input`}
      />
    </div>
  );
}
