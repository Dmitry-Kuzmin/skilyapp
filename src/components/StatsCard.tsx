import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  className?: string;
}

const StatsCard = ({ icon, label, value, trend, className }: StatsCardProps) => {
  return (
    <Card className={cn("p-4 gradient-card border-border/50", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary shadow-glow">
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="text-xs text-success mt-1">{trend}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
