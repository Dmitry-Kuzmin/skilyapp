import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoostButtonProps {
  type: 'fifty_fifty' | 'time_extend' | 'hint' | 'skip';
  icon: string;
  name: string;
  available: number;
  onUse: (type: string) => void;
  disabled?: boolean;
}

export function BoostButton({ type, icon, name, available, onUse, disabled }: BoostButtonProps) {
  const handleClick = () => {
    if (!disabled && available > 0) {
      onUse(type);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            disabled={disabled || available === 0}
            variant="outline"
            size="lg"
            className="relative h-16 w-16 p-0"
          >
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl">{icon}</span>
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {available}
              </span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
