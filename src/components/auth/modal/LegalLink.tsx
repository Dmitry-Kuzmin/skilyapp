import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from '@/contexts/LanguageContext';

interface LegalLinkProps {
    href: string;
    label: string;
    title: string;
}

export function LegalLink({ href, label, title }: LegalLinkProps) {
    const isMobile = useIsMobile();
    const { t } = useLanguage();

    if (isMobile) {
        return (
            <Drawer>
                <DrawerTrigger asChild>
                    <button className="text-zinc-600 hover:text-zinc-400 border-b border-transparent hover:border-zinc-400/50 transition-all pb-px font-medium outline-none">
                        {label}
                    </button>
                </DrawerTrigger>
                <DrawerContent className="h-[85vh] bg-zinc-950/95 backdrop-blur-xl border-t border-white/10">
                    <DrawerHeader className="border-b border-white/5 pb-4">
                        <DrawerTitle className="text-white text-center">{title}</DrawerTitle>
                        <div className="flex justify-center mt-2">
                            <div className="w-12 h-1 bg-white/10 rounded-full" />
                        </div>
                    </DrawerHeader>
                    <div className="flex-1 overflow-y-auto p-6 text-zinc-400 text-sm leading-relaxed space-y-4">
                        <p>
                            {t('auth.legalModal.docText1', { title })}
                        </p>
                        <p>
                            {t('auth.legalModal.docText2')}
                        </p>
                        <p>
                            {t('auth.legalModal.docText3')}
                        </p>
                        <p>
                            {t('auth.legalModal.docText4')}
                        </p>
                    </div>
                    <DrawerFooter className="border-t border-white/5 pt-4">
                        <DrawerClose asChild>
                            <Button variant="secondary" className="w-full h-12 text-base font-medium">
                                {t('auth.legalModal.understood')}
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-400 border-b border-transparent hover:border-zinc-400/50 transition-all pb-px font-medium"
            onClick={(e) => e.stopPropagation()}
        >
            {label}
        </a>
    );
}
