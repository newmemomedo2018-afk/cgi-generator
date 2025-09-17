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
  acceptedTypes?: 'image' | 'video' | 'both'; // New: define accepted file types
}

export default function UploadZone({
  onFileUpload,
  isUploading,
  previewUrl,
  label,
  sublabel,
  testId,
  resetKey,
  acceptedTypes = 'image'
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
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
      setSelectedFileType(null);
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
    // Validate file type based on acceptedTypes
    const isValidType = (() => {
      switch (acceptedTypes) {
        case 'image':
          return file.type.startsWith('image/');
        case 'video':
          return file.type.startsWith('video/');
        case 'both':
          return file.type.startsWith('image/') || file.type.startsWith('video/');
        default:
          return file.type.startsWith('image/');
      }
    })();

    if (!isValidType) {
      return;
    }

    // Validate file size (50MB limit for videos, 10MB for images)
    const sizeLimit = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > sizeLimit) {
      return;
    }

    // Create local preview
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
    }
    const newPreview = URL.createObjectURL(file);
    setLocalPreview(newPreview);
    setSelectedFileType(file.type);

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
              {/* Dynamic preview based on file type */}
              {selectedFileType?.startsWith('video/') ? (
                <video 
                  src={localPreview} 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  data-testid={`${testId}-video-preview`}
                  controls
                  muted
                />
              ) : (
                <img 
                  src={localPreview} 
                  alt="معاينة الصورة" 
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  data-testid={`${testId}-preview`}
                />
              )}
              <p className="text-sm text-muted-foreground">انقر لتغيير {acceptedTypes === 'video' ? 'الفيديو' : acceptedTypes === 'both' ? 'الملف' : 'الصورة'}</p>
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
        accept={
          acceptedTypes === 'image' ? 'image/*' :
          acceptedTypes === 'video' ? 'video/*' :
          acceptedTypes === 'both' ? 'image/*,video/*' :
          'image/*'
        }
        onChange={handleFileChange}
        className="hidden"
        data-testid={`${testId}-input`}
      />
    </div>
  );
}
