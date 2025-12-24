import { lazy, Suspense } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { FileText, Shield, CreditCard, RefreshCw, ChevronLeft } from "lucide-react";

// Lazy load heavy legal documents
const Terms = lazy(() => import("./Terms"));
const Privacy = lazy(() => import("./Privacy"));
const SubscriptionTerms = lazy(() => import("./SubscriptionTerms"));
const RefundPolicy = lazy(() => import("./RefundPolicy"));

export type LegalTab = "terms" | "privacy" | "subscription" | "refund";

const tabConfig: { id: LegalTab; icon: typeof FileText; labelKey: string }[] = [
    { id: "terms", icon: FileText, labelKey: "legal.tabs.terms" },
    { id: "privacy", icon: Shield, labelKey: "legal.tabs.privacy" },
    { id: "subscription", icon: CreditCard, labelKey: "legal.tabs.subscription" },
    { id: "refund", icon: RefreshCw, labelKey: "legal.tabs.refund" },
];

// Loading skeleton for lazy-loaded documents
function DocumentSkeleton() {
    return (
        <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-muted rounded-lg w-1/3" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/5" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
        </div>
    );
}

// Redirect component for /legal → /legal/terms
export function LegalRedirect() {
    return <Navigate to="/legal/terms" replace />;
}

export default function Legal() {
    const { t } = useLanguage();
    const { tab } = useParams<{ tab: string }>();
    const navigate = useNavigate();

    // Validate tab from URL, fallback to terms
    const activeTab: LegalTab = tabConfig.some(t => t.id === tab)
        ? (tab as LegalTab)
        : "terms";

    // If invalid tab, redirect to terms
    if (!tabConfig.some(t => t.id === tab)) {
        return <Navigate to="/legal/terms" replace />;
    }

    // Navigate to new tab (changes URL, supports browser back)
    const handleTabChange = (newTab: LegalTab) => {
        navigate(`/legal/${newTab}`);
    };

    const tabLabels: Record<LegalTab, string> = {
        terms: t("legal.tabs.terms"),
        privacy: t("legal.tabs.privacy"),
        subscription: t("legal.tabs.subscription"),
        refund: t("legal.tabs.refund"),
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-3 mb-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-full hover:bg-muted transition-colors"
                                aria-label={t("common.back")}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                    {t("legal.title")}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {t("legal.subtitle")}
                                </p>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                            {tabConfig.map(({ id, icon: Icon }) => {
                                const isActive = activeTab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => handleTabChange(id)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{tabLabels[id]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 py-6">
                    <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden">
                        {/* Active Tab Indicator */}
                        <div className="px-6 py-4 border-b border-border/30 bg-muted/30">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const config = tabConfig.find(t => t.id === activeTab);
                                    const Icon = config?.icon || FileText;
                                    return (
                                        <>
                                            <Icon className="w-5 h-5 text-primary" />
                                            <span className="font-semibold">{tabLabels[activeTab]}</span>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Document Content - Rendered inline without Layout wrapper */}
                        <div className="legal-content">
                            <Suspense fallback={<DocumentSkeleton />}>
                                {activeTab === "terms" && <Terms embedded />}
                                {activeTab === "privacy" && <Privacy embedded />}
                                {activeTab === "subscription" && <SubscriptionTerms embedded />}
                                {activeTab === "refund" && <RefundPolicy embedded />}
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
