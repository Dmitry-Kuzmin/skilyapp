import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "@/components/optimized/Motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  count?: number;
  color?: string;
  bgColor?: string;
  delay?: number;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  count,
  color = "text-primary",
  bgColor = "bg-primary/10",
  delay = 0,
}: QuickActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card
        className={cn(
          "cursor-pointer hover:shadow-xl transition-all duration-300 border-2",
          "hover:scale-[1.02] hover:border-primary/50",
          "group"
        )}
        onClick={onClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <motion.div
              className={cn("p-3 rounded-xl", bgColor)}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Icon className={cn("h-6 w-6", color)} />
            </motion.div>
            {count !== undefined && count > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {count}
              </Badge>
            )}
          </div>
          <CardTitle className="mt-4 group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <CardDescription className="group-hover:text-foreground/80 transition-colors">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

