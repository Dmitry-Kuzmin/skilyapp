import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItemProps {
    question: string;
    answer: string;
    icon: any;
    category: string;
}

export const FAQItem = ({ question, answer, icon: Icon, category }: FAQItemProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="group border border-white/5 bg-slate-900/40 backdrop-blur-sm hover:border-blue-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 h-fit">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start justify-between p-5 text-left gap-4"
            >
                <div className="flex gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                        isOpen ? "bg-indigo-500 text-white shadow-indigo-500/20" : "bg-slate-800/50 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800"
                    )}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1 group-hover:text-blue-400/60 transition-colors">
                            {category}
                        </div>
                        <span className={cn(
                            "font-bold text-base transition-colors",
                            isOpen ? "text-white" : "text-slate-200 group-hover:text-white"
                        )}>
                            {question}
                        </span>
                    </div>
                </div>
                <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 mt-2",
                    isOpen ? "bg-white text-indigo-900 border-white rotate-180" : "border-slate-700/50 text-slate-500 group-hover:border-slate-600"
                )}>
                    {isOpen ? <Minus size={12} /> : <Plus size={12} />}
                </div>
            </button>
            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
            >
                <div className="overflow-hidden">
                    <div className="p-5 pt-0 pl-[4.5rem] pr-6 pb-6">
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {answer}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
