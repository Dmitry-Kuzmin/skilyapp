import { Button } from '@/components/ui/button';

interface DuelLoadingViewProps {
    loading: boolean;
    questionsCount?: number;
    message?: string;
    onExit?: () => void;
    isError?: boolean;
}

export function DuelLoadingView({
    loading,
    questionsCount = 0,
    message = 'Загрузка вопросов...',
    onExit,
    isError = false
}: DuelLoadingViewProps) {

    if (isError) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                <div className="text-center space-y-4">
                    <p className="text-lg text-destructive">Ошибка загрузки вопроса</p>
                    {onExit && <Button onClick={onExit}>Выйти</Button>}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
            <div className="text-center space-y-4">
                <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-lg text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground/70">
                    {loading ? 'Загрузка данных...' : 'Ожидание вопросов...'}
                </p>
            </div>
        </div>
    );
}
