import { AuthModalNew } from "@/components/AuthModalNew";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext"; // Используем контекст, который будет доступен внутри AppProviders
import { PageLoader } from "@/components/PageLoader";

export default function Login() {
    const navigate = useNavigate();
    const { user, isLoading } = useUserContext();

    // Если пользователь уже авторизован — редирект на дашборд
    useEffect(() => {
        if (!isLoading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isLoading, navigate]);

    if (isLoading) {
        return <PageLoader />;
    }

    return (
        <div translate="no">
            <AuthModalNew
                open={true}
                onClose={() => {
                    // Если пользователь закрывает модалку (нажимает крестик или фон),
                    // возвращаем его на главную
                    navigate('/');
                }}
                variant="page"
            />
        </div>
    );
}
