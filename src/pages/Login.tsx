import { AuthModalNew } from "@/components/AuthModalNew";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useUserContext } from "@/contexts/UserContext";
import { PageLoader } from "@/components/PageLoader";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLoading } = useUserContext();

    const redirectTo = searchParams.get('redirect') || '/dashboard';

    // Если пользователь уже авторизован — редирект на целевую страницу
    useEffect(() => {
        if (!isLoading && user) {
            navigate(redirectTo, { replace: true });
        }
    }, [user, isLoading, navigate, redirectTo]);

    if (isLoading) {
        return <PageLoader />;
    }

    return (
        <div translate="no">
            <AuthModalNew
                open={true}
                onClose={() => navigate('/')}
                variant="page"
            />
        </div>
    );
}
