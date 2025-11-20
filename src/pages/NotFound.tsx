import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900"
      style={{ 
        paddingTop: 'calc(var(--sat) + var(--tg-content-safe-area-inset-top, 0px))' 
      }}
    >
      <div className="text-center space-y-4">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Страница не найдена</p>
        <Button onClick={() => navigate("/dashboard")} variant="default">
          Вернуться на главную
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
