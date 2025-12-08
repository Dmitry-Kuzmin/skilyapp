import * as React from "react"
import { motion, AnimatePresence, MotionConfig } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Custom hook for click outside detection
function useClickAway(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  React.useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      handler(event)
    }

    document.addEventListener("mousedown", listener)
    document.addEventListener("touchstart", listener)

    return () => {
      document.removeEventListener("mousedown", listener)
      document.removeEventListener("touchstart", listener)
    }
  }, [ref, handler])
}

// Button component (adapted for this specific dropdown)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "outline"
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variant === "outline" && "border border-neutral-700 bg-transparent",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

// Types
export interface FluidDropdownOption {
  id: string
  label: string
  value: number | string
  icon?: React.ElementType
  color?: string
}

interface FluidDropdownProps {
  options: FluidDropdownOption[]
  selectedValue: number | string
  onSelect: (value: number | string) => void
  placeholder?: string
  className?: string
  isDark?: boolean
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
}

// Main component
export function FluidDropdown({
  options,
  selectedValue,
  onSelect,
  placeholder = "Select...",
  className,
  isDark = false
}: FluidDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hoveredOption, setHoveredOption] = React.useState<string | null>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === selectedValue) || options[0]

  useClickAway(dropdownRef, () => setIsOpen(false))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleSelect = (value: number | string) => {
    onSelect(value)
    setIsOpen(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn("w-full relative", className)}
        ref={dropdownRef}
      >
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full justify-between transition-all duration-200 ease-in-out h-10",
            isDark
              ? "bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30"
              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:border-gray-300",
            isOpen && (isDark ? "bg-white/20 border-white/30" : "bg-gray-200 border-gray-300")
          )}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="flex items-center font-semibold">
            {selectedOption.label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-5 h-5"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </Button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 1, y: 0, height: 0 }}
              animate={{
                opacity: 1,
                y: 0,
                height: "auto",
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              exit={{
                opacity: 0,
                y: 0,
                height: 0,
                transition: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                },
              }}
              className="absolute left-0 right-0 top-full mt-2 z-50"
              onKeyDown={handleKeyDown}
            >
              <motion.div
                className={cn(
                  "w-full rounded-lg border p-1 shadow-lg",
                  isDark
                    ? "border-white/20 bg-[#1a1a1d]"
                    : "border-gray-200 bg-white"
                )}
                initial={{ borderRadius: 8 }}
                animate={{
                  borderRadius: 12,
                  transition: { duration: 0.2 },
                }}
                style={{ transformOrigin: "top" }}
              >
                <motion.div 
                  className="py-2 relative" 
                  variants={containerVariants} 
                  initial="hidden" 
                  animate="visible"
                >
                  <motion.div
                    layoutId="hover-highlight"
                    className={cn(
                      "absolute inset-x-1 rounded-md",
                      isDark ? "bg-white/10" : "bg-gray-100"
                    )}
                    animate={{
                      y: options.findIndex((opt) => (hoveredOption || selectedOption.id) === opt.id) * 40 +
                        (options.findIndex((opt) => (hoveredOption || selectedOption.id) === opt.id) > 0 ? 8 : 0),
                      height: 40,
                    }}
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.4,
                    }}
                  />
                  {options.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => handleSelect(option.value)}
                      onHoverStart={() => setHoveredOption(option.id)}
                      onHoverEnd={() => setHoveredOption(null)}
                      className={cn(
                        "relative flex w-full items-center justify-center px-4 py-2.5 text-sm rounded-md font-semibold",
                        "transition-colors duration-150",
                        "focus:outline-none",
                        selectedOption.id === option.id || hoveredOption === option.id
                          ? (isDark ? "text-white" : "text-gray-900")
                          : (isDark ? "text-white/60" : "text-gray-600")
                      )}
                      whileTap={{ scale: 0.98 }}
                      variants={itemVariants}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

