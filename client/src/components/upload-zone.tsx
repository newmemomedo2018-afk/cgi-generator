import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload, Image as ImageIcon, Loader2 } from "lucide-react";

interface UploadZoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  previewUrl?: string;
  label: string;
  sublabel: string;
  testId: string;
  resetKey?: string; // Add resetKey prop to force preview reset
}

export default function UploadZone({
  onFileUpload,
  isUploading,
  previewUrl,
  label,
  sublabel,
  testId,
  resetKey
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up blob URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  // Reset local preview when resetKey changes
  useEffect(() => {
    if (resetKey) {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(null);
      // Also clear file input to allow re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [resetKey, localPreview]);

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

    // Create local preview
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    const newPreview = URL.createObjectURL(file);
    setLocalPreview(newPreview);

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
          ) : localPreview ? (
            <>
              <img 
                src={localPreview} 
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
