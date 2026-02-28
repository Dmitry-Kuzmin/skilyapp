import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { CrossroadsGame } from "@/components/games/crossroads";

const IntersectionGame = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="min-h-screen bg-transparent pb-24">
                {/* Header */}
                <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
                    <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/games')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <h1 className="font-bold text-lg">Перекрёстки</h1>

                        <div className="w-10" /> {/* Spacer */}
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center">
                    <CrossroadsGame />
                </div>
            </div>
        </Layout>
    );
};

export default IntersectionGame;
