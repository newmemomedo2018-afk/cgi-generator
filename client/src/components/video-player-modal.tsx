import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Download, X, Loader2, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export default function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title
}: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setIsMuted(false);
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen]);

  // Update time progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleLoadedData = () => {
      setIsLoading(false);
      setHasError(false);
    };
    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      console.error("Video failed to load:", videoUrl);
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };
    const handleEnded = () => setIsPlaying(false);
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isOpen]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const downloadVideo = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-full p-0 glass-card border-border overflow-hidden"
        data-testid="video-player-modal"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {title}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              data-testid="close-video-modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative">
          {/* Video Player */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video bg-black"
            preload="metadata"
            data-testid="video-player"
            onClick={togglePlay}
            crossOrigin="anonymous"
          />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>جاري تحميل الفيديو...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center text-white text-center p-4">
                <AlertCircle className="h-8 w-8 mb-2 text-red-400" />
                <p className="mb-2">عذراً، حدث خطأ في تحميل الفيديو</p>
                <p className="text-sm text-gray-300">يرجى المحاولة مرة أخرى لاحقاً</p>
              </div>
            </div>
          )}

          {/* Video Controls Overlay */}
          {!isLoading && !hasError && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                data-testid="video-progress"
              />
              <div className="flex justify-between text-xs text-white mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                  data-testid="play-pause-button"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost" 
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                  data-testid="mute-button"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </div>

              <Button
                variant="outline" 
                size="sm"
                onClick={downloadVideo}
                className="text-white border-white/20 hover:bg-white/20"
                data-testid="download-video-button"
              >
                <Download className="h-4 w-4 ml-2" />
                تحميل
              </Button>
            </div>
          </div>
          )}
        </div>

        <div className="p-6 pt-4">
          <p className="text-sm text-muted-foreground">
            الفيديو جاهز للتحميل أو المشاركة. يمكنك النقر على زر التشغيل لمعاينة النتيجة.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}