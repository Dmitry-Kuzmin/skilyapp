import { useState, useEffect, useRef } from "react";
import { Resize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ImageResizeComponentProps {
  src: string;
  width?: number;
  height?: number;
  onResize?: (width: number | null, height: number | null) => void;
  onDelete?: () => void;
  className?: string;
}

export const ImageResizeComponent = ({
  src,
  width,
  height,
  onResize,
  onDelete,
  className,
}: ImageResizeComponentProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tempWidth, setTempWidth] = useState<string>(width?.toString() || "");
  const [tempHeight, setTempHeight] = useState<string>(height?.toString() || "");
  const [isResizing, setIsResizing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setTempWidth(width?.toString() || "");
    setTempHeight(height?.toString() || "");
  }, [width, height]);

  const handleApplyResize = () => {
    const newWidth = tempWidth ? parseInt(tempWidth) : null;
    const newHeight = tempHeight ? parseInt(tempHeight) : null;
    
    if (onResize) {
      onResize(newWidth, newHeight);
    }
    setIsResizing(false);
  };

  const handleReset = () => {
    if (imgRef.current) {
      setTempWidth("");
      setTempHeight("");
      onResize?.(null, null);
    }
    setIsResizing(false);
  };

  return (
    <div
      className={cn("relative inline-block group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        style={{
          width: width ? `${width}px` : "auto",
          height: height ? `${height}px` : "auto",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
        className="rounded-lg shadow-md"
      />
      
      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Popover open={isResizing} onOpenChange={setIsResizing}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm border border-border shadow-sm"
              >
                <Resize className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="width" className="text-xs">Ширина (px)</Label>
                  <Input
                    id="width"
                    type="number"
                    value={tempWidth}
                    onChange={(e) => setTempWidth(e.target.value)}
                    placeholder="Авто"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Высота (px)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={tempHeight}
                    onChange={(e) => setTempHeight(e.target.value)}
                    placeholder="Авто"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleApplyResize}
                    className="flex-1"
                  >
                    Применить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Сброс
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 w-8 p-0 bg-background/90 backdrop-blur-sm border border-border shadow-sm"
              onClick={onDelete}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

