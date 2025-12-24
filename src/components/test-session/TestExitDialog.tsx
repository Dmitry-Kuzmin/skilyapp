import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TestExitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    language: "ru" | "es" | "en";
}

export const TestExitDialog = ({ open, onOpenChange, language }: TestExitDialogProps) => {
    const navigate = useNavigate();

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-3xl border-2 border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl max-w-[400px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black text-foreground">
                        {language === "es" ? "¿Abandonar el test?" : "Выйти из теста?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground font-medium pt-2">
                        {language === "es"
                            ? "Tu progreso se perderá y el examen se cancelará definitivamente."
                            : "Прогресс не будет сохранен, а тест будет прерван. Вы уверены?"}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-3 pt-4">
                    <AlertDialogCancel className="h-12 rounded-2xl border-2 border-border font-bold hover:bg-muted transition-all sm:mt-0">
                        {language === "es" ? "Continuar test" : "Остаться"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => navigate("/tests")}
                        className="h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold shadow-lg shadow-destructive/20 transition-all font-inter"
                    >
                        {language === "es" ? "Salir del test" : "Выйти"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
