import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

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

  const isDisabled = disabled || available === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={!isDisabled ? { scale: 1.1 } : {}}
            whileTap={!isDisabled ? { scale: 0.9 } : {}}
          >
            <Button
              onClick={handleClick}
              disabled={isDisabled}
              variant="outline"
              size="lg"
              className={`relative h-20 w-20 p-0 transition-all group ${
                !isDisabled ? 'hover:shadow-lg hover:border-primary' : 'opacity-50'
              }`}
            >
              {/* Glow effect on hover */}
              {!isDisabled && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur-md opacity-0 group-hover:opacity-30 transition-opacity" />
              )}
              
              <div className="relative flex flex-col items-center justify-center">
                <motion.span 
                  className="text-3xl"
                  animate={!isDisabled ? { rotate: [0, -10, 10, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  {icon}
                </motion.span>
                
                <Badge 
                  className={`absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs font-bold ${
                    available > 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-400'
                  }`}
                >
                  {available}
                </Badge>
              </div>
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-card border shadow-lg">
          <div className="text-center space-y-1">
            <p className="font-bold">{name}</p>
            <p className="text-xs text-muted-foreground">
              {available > 0 ? `${available} доступно` : 'Нет в наличии'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
