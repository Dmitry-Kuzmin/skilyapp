import { useState } from "react";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { PRICING_PLANS, COIN_PACKS, DUEL_PASS_PRICE } from "@/lib/pricing-config";
import { CheckCircle2, Crown, Trophy, Coins, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaywallModal } from "@/components/monetization/PaywallModal";

export default function Pricing() {
  const { language } = useLanguage();
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <Layout>
      <div className="relative min-h-screen bg-[#0A0D14] text-white selection:bg-indigo-500/30 overflow-hidden">
        {/* Abstract Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] pointer-events-none" />

        <div className="container relative z-10 mx-auto px-6 py-16 max-w-7xl">
          {/* Hero Header */}
          <div className="text-center mb-16 space-y-6 animate-fade-in">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">
                Premium Доступ
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              <span className="block text-white">Инвестируй</span>
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                в свои права
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Сдай теорию DGT с первого раза благодаря AI-технологиям и геймификации.
              Выбери план, который подходит твоему темпу.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-5 mb-24 items-stretch pt-12">
            {PRICING_PLANS.map((plan, index) => {
              const Icon = plan.icon;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "group relative flex flex-col rounded-[2.5rem] p-8 transition-all duration-500 hover:scale-[1.02] h-full",
                    isPopular
                      ? "bg-[#161B2E]/80 border-2 border-indigo-500/50 shadow-[0_0_60px_-15px_rgba(99,102,241,0.3)] z-20"
                      : "bg-[#11141D] border border-white/5 hover:border-white/10 z-10"
                  )}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Highlight for Popular Plan */}
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center px-4">
                      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-2 rounded-full shadow-lg shadow-indigo-500/40">
                        🔥 Самый популярный
                      </div>
                    </div>
                  )}

                  {/* Savings Badge */}
                  {plan.savings && (
                    <div className="absolute top-6 right-6">
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black">
                        -{plan.savings}
                      </div>
                    </div>
                  )}

                  {/* Plan Icon & Title */}
                  <div className="mb-8">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-transform group-hover:scale-110 duration-500",
                      `bg-gradient-to-br ${plan.gradient || 'from-indigo-500 to-purple-500'}`
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">{plan.title}</h3>
                    <p className="text-slate-400 text-sm font-medium">{plan.subtitle}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white">{plan.price}</span>
                    </div>
                    {plan.pricePerMonth && (
                      <div className="mt-2 text-indigo-300/80 text-xs font-bold uppercase tracking-wider">
                        {plan.pricePerMonth} / месяц
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <span className="text-sm text-slate-300 leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className={cn(
                      "w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group/btn",
                      isPopular
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 hover:shadow-indigo-500/40"
                        : "bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:shadow-blue-500/40"
                    )}
                  >
                    <span className="relative z-10">Выбрать план</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Secondary Offers (Duel Pass & Coins) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Duel Pass Card */}
            <div className="group relative overflow-hidden rounded-[2.5rem] bg-[#11141D] border border-white/5 p-10 flex flex-col sm:flex-row items-center gap-10 hover:border-amber-500/30 transition-all duration-500">
              <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-amber-500/10 blur-[80px] pointer-events-none group-hover:bg-amber-500/20 transition-colors" />

              <div className="flex-1 text-center sm:text-left relative z-10">
                <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Duel Pass</span>
                </div>
                <div className="flex items-baseline justify-center sm:justify-start gap-1 mb-4">
                  <span className="text-4xl font-black text-white">{DUEL_PASS_PRICE.price}</span>
                  <span className="text-slate-500 text-lg font-bold">/ сезон</span>
                </div>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Разблокируй Premium-трек наград, эксклюзивные скины и получай больше опыта в Дуэлях.
                </p>
                <button className="flex items-center gap-2 text-amber-400 font-bold hover:text-amber-300 transition-colors group/link">
                  <span>Подробнее о сезонах</span>
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="shrink-0 relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                  <Crown className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -inset-4 bg-amber-500/20 blur-2xl rounded-full -z-10 animate-pulse" />
              </div>
            </div>

            {/* Coin Packages Card */}
            <div className="rounded-[2.5rem] bg-[#11141D] border border-white/5 p-10">
              <div className="text-center sm:text-left mb-8">
                <h3 className="text-2xl font-black text-white mb-2">Пакеты монет</h3>
                <p className="text-slate-400 text-sm">Для бустов и визуальных улучшений</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {COIN_PACKS.map((pack) => (
                  <div
                    key={pack.id}
                    className={cn(
                      "p-6 rounded-3xl border transition-all duration-300 relative group cursor-pointer",
                      pack.bestValue
                        ? "bg-indigo-500/5 border-indigo-500/30 hover:border-indigo-500"
                        : "bg-white/[0.02] border-white/5 hover:border-white/20"
                    )}
                  >
                    {pack.bestValue && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[8px] font-black tracking-widest uppercase">
                        Хит продаж
                      </div>
                    )}
                    <p className="text-2xl font-black text-white mb-1 group-hover:text-indigo-300 transition-colors">
                      {pack.price}
                    </p>
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-slate-500 uppercase">{pack.totalCoins} монет</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </Layout>
  );
}
