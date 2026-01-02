import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface LegalLinkProps {
    href: string;
    label: string;
    title: string;
}

export function LegalLink({ href, label, title }: LegalLinkProps) {
    const isMobile = useIsMobile();

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
                            В соответствии с требованиями законодательства, здесь должен быть представлен полный текст документа "{title}".
                        </p>
                        <p>
                            Мы серьезно относимся к вашей конфиденциальности и защите данных. Вся информация хранится в зашифрованном виде.
                        </p>
                        <p>
                            Используя сервис, вы соглашаетесь с условиями предоставления услуг и политикой обработки персональных данных.
                        </p>
                        <p>
                            Полный текст доступен на нашем веб-сайте в разделе "Юридическая информация".
                        </p>
                    </div>
                    <DrawerFooter className="border-t border-white/5 pt-4">
                        <DrawerClose asChild>
                            <Button variant="secondary" className="w-full h-12 text-base font-medium">
                                Понятно
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
