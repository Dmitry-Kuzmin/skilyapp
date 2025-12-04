import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserContext } from "@/contexts/UserContext";
import { LandingLogo } from "@/components/landing/LandingLogo";
import {
  User,
  Mail,
  Link as LinkIcon,
  Users,
  FileText,
  Gift,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Crown,
  TrendingUp,
  Sparkles,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthModalNew as AuthModal } from "@/components/AuthModalNew";

export default function Partners() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isAuthenticated, supabaseUser, profileId } = useUserContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isAlreadyPartner, setIsAlreadyPartner] = useState(false);
  const [existingPartner, setExistingPartner] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    channel_name: "",
    channel_url: "",
    subscribers_count: "",
    telegram: "",
    instagram: "",
    youtube: "",
    description: "",
    partner_type: "barter" as "barter" | "revenue_share",
  });

  const content = {
    ru: {
      title: "Партнёрская программа",
      subtitle: "Присоединяйся к нам и зарабатывай вместе",
      intro: `SkilyApp предлагает партнёрскую программу для образовательных платформ, блогеров и инфлюенсеров, которые хотят помочь своим аудиториям подготовиться к экзамену DGT.`,
      sections: [
        {
          title: "Кто может стать партнёром",
          content: `Мы приглашаем к сотрудничеству:
- Образовательные платформы и школы вождения
- Блогеров и инфлюенсеров в сфере образования и автотематики
- YouTube-каналы и Telegram-каналы с аудиторией, интересующейся DGT
- Сообщества и форумы для водителей`,
        },
        {
          title: "Преимущества партнёрства",
          content: `Наши партнёры получают:
- Бесплатные ключи Premium Forever для разыгрышей (бартер)
- Комиссию с каждой подписки (revenue share)
- Эксклюзивные промокоды для вашей аудитории
- Приоритетную поддержку
- Маркетинговые материалы и баннеры
- Статистику по привлечённым пользователям`,
        },
        {
          title: "Типы партнёрства",
          content: `Мы предлагаем два типа партнёрства:

**Бартер (для микро-блогеров)**
- Бесплатные ключи Premium Forever для разыгрышей
- Идеально для каналов с 1-5к подписчиков
- Повышает активность вашей аудитории

**Revenue Share (для крупных партнёров)**
- Комиссия с каждой покупки Premium
- Прозрачная система выплат
- Минимальный порог: 50€`,
        },
        {
          title: "Условия сотрудничества",
          content: `Партнёрская программа работает на основе:
- Прозрачной системы комиссий
- Ежемесячных выплат (для revenue share)
- Отслеживания конверсий в реальном времени
- Быстрого рассмотрения заявок (3-5 рабочих дней)`,
        },
      ],
      form: {
        title: "Стать партнером",
        subtitle: "Заполните форму, и мы свяжемся с вами для одобрения заявки",
        personalInfo: "Личная информация",
        channelInfo: "Информация о канале/блоге",
        socialLinks: "Социальные сети",
        partnerType: "Тип партнерства",
        description: "О вашем канале/блоге",
        name: "Ваше имя",
        email: "Email",
        channelName: "Название канала/блога",
        channelUrl: "Ссылка на канал",
        subscribers: "Количество подписчиков",
        telegram: "Telegram",
        instagram: "Instagram",
        youtube: "YouTube",
        barter: "Бартер (бесплатные ключи для разыгрышей)",
        revenueShare: "Revenue Share (для будущего)",
        barterDesc: "При одобрении заявки вы получите бесплатные ключи Premium Forever для разыгрышей среди подписчиков.",
        submit: "Отправить заявку",
        submitting: "Отправка...",
        needAuth: "Для регистрации необходимо войти в аккаунт",
        login: "Войти",
        loadingProfile: "Загрузка данных профиля...",
        alreadyPartner: "Вы уже зарегистрированы как партнер",
        redirecting: "Перенаправление в панель партнера...",
        autoFilled: "Данные автоматически заполнены из вашего профиля",
      },
      success: {
        title: "Заявка отправлена!",
        description: "Мы рассмотрим вашу заявку и свяжемся с вами в ближайшее время.",
      },
    },
    es: {
      title: "Programa de afiliados",
      subtitle: "Únete a nosotros y gana juntos",
      intro: `SkilyApp ofrece un programa de afiliados para plataformas educativas, blogueros e influencers que quieren ayudar a sus audiencias a prepararse para el examen DGT.`,
      sections: [
        {
          title: "Quién puede ser afiliado",
          content: `Invitamos a colaborar a:
- Plataformas educativas y autoescuelas
- Blogueros e influencers en educación y temática automovilística
- Canales de YouTube y Telegram con audiencia interesada en DGT
- Comunidades y foros para conductores`,
        },
        {
          title: "Ventajas del programa",
          content: `Nuestros afiliados reciben:
- Claves Premium Forever gratuitas para sorteos (trueque)
- Comisión por cada suscripción (revenue share)
- Códigos promocionales exclusivos para su audiencia
- Soporte prioritario
- Materiales de marketing y banners
- Estadísticas de usuarios atraídos`,
        },
        {
          title: "Tipos de afiliación",
          content: `Ofrecemos dos tipos de afiliación:

**Trueque (para micro-blogueros)**
- Claves Premium Forever gratuitas para sorteos
- Ideal para canales con 1-5k suscriptores
- Aumenta la actividad de su audiencia

**Revenue Share (para afiliados grandes)**
- Comisión por cada compra Premium
- Sistema transparente de pagos
- Umbral mínimo: 50€`,
        },
        {
          title: "Condiciones de colaboración",
          content: `El programa de afiliados funciona con:
- Sistema transparente de comisiones
- Pagos mensuales (para revenue share)
- Seguimiento de conversiones en tiempo real
- Revisión rápida de solicitudes (3-5 días hábiles)`,
        },
      ],
      form: {
        title: "Convertirse en afiliado",
        subtitle: "Complete el formulario y nos pondremos en contacto para aprobar su solicitud",
        personalInfo: "Información personal",
        channelInfo: "Información del canal/blog",
        socialLinks: "Redes sociales",
        partnerType: "Tipo de afiliación",
        description: "Sobre su canal/blog",
        name: "Su nombre",
        email: "Email",
        channelName: "Nombre del canal/blog",
        channelUrl: "Enlace del canal",
        subscribers: "Número de suscriptores",
        telegram: "Telegram",
        instagram: "Instagram",
        youtube: "YouTube",
        barter: "Trueque (claves gratuitas para sorteos)",
        revenueShare: "Revenue Share (para el futuro)",
        barterDesc: "Al aprobar su solicitud, recibirá claves Premium Forever gratuitas para sorteos entre sus suscriptores.",
        submit: "Enviar solicitud",
        submitting: "Enviando...",
        needAuth: "Necesita iniciar sesión para registrarse",
        login: "Iniciar sesión",
        loadingProfile: "Cargando datos del perfil...",
        alreadyPartner: "Ya está registrado como afiliado",
        redirecting: "Redirigiendo al panel de afiliado...",
        autoFilled: "Datos llenados automáticamente desde su perfil",
      },
      success: {
        title: "¡Solicitud enviada!",
        description: "Revisaremos su solicitud y nos pondremos en contacto con usted pronto.",
      },
    },
    en: {
      title: "Affiliate Program",
      subtitle: "Join us and earn together",
      intro: `SkilyApp offers an affiliate program for educational platforms, bloggers, and influencers who want to help their audiences learn road safety through interactive gamified learning.`,
      sections: [
        {
          title: "Who can become an affiliate",
          content: `We invite to collaborate:
- Educational platforms and driving schools
- Bloggers and influencers in education and automotive topics
- YouTube channels and Telegram channels with audiences interested in DGT
- Communities and forums for drivers`,
        },
        {
          title: "Partnership benefits",
          content: `Our affiliates receive:
- Free Premium Forever keys for giveaways (barter)
- Commission on each subscription (revenue share)
- Exclusive promo codes for your audience
- Priority support
- Marketing materials and banners
- Statistics on attracted users`,
        },
        {
          title: "Partnership types",
          content: `We offer two types of partnerships:

**Barter (for micro-bloggers)**
- Free Premium Forever keys for giveaways
- Perfect for channels with 1-5k subscribers
- Increases your audience engagement

**Revenue Share (for large affiliates)**
- Commission on each Premium purchase
- Transparent payment system
- Minimum threshold: €50`,
        },
        {
          title: "Partnership terms",
          content: `The affiliate program works with:
- Transparent commission system
- Monthly payments (for revenue share)
- Real-time conversion tracking
- Fast application review (3-5 business days)`,
        },
      ],
      form: {
        title: "Become an affiliate",
        subtitle: "Fill out the form and we'll contact you to approve your application",
        personalInfo: "Personal information",
        channelInfo: "Channel/blog information",
        socialLinks: "Social networks",
        partnerType: "Partnership type",
        description: "About your channel/blog",
        name: "Your name",
        email: "Email",
        channelName: "Channel/blog name",
        channelUrl: "Channel link",
        subscribers: "Number of subscribers",
        telegram: "Telegram",
        instagram: "Instagram",
        youtube: "YouTube",
        barter: "Barter (free keys for giveaways)",
        revenueShare: "Revenue Share (for future)",
        barterDesc: "Upon approval, you will receive free Premium Forever keys for giveaways among your subscribers.",
        submit: "Submit application",
        submitting: "Submitting...",
        needAuth: "You need to log in to register",
        login: "Log in",
      },
      success: {
        title: "Application sent!",
        description: "We will review your application and contact you soon.",
      },
    },
  };

  const currentContent = content[language] || content.en;

  // Загружаем данные профиля и проверяем, не зарегистрирован ли уже партнер
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isAuthenticated || !supabaseUser) {
        return;
      }

      setLoadingProfile(true);
      try {
        // Загружаем профиль пользователя
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, username, telegram_id, photo_url")
          .eq("user_id", supabaseUser.id)
          .single();

        if (profileError) {
          console.error("[Partners] Error loading profile:", profileError);
          setLoadingProfile(false);
          return;
        }

        // Проверяем, не зарегистрирован ли уже как партнер
        const { data: existingPartner, error: partnerError } = await supabase
          .from("partners")
          .select("*")
          .eq("user_id", supabaseUser.id)
          .maybeSingle();

        if (partnerError) {
          console.error("[Partners] Error checking partner:", partnerError);
        } else if (existingPartner) {
          setIsAlreadyPartner(true);
          setExistingPartner(existingPartner);
          // Если уже партнер, перенаправляем на dashboard
          navigate("/partner/dashboard");
          return;
        }

        // Автоматически заполняем форму данными из профиля
        setFormData((prev) => ({
          ...prev,
          name: profile?.first_name || supabaseUser.user_metadata?.first_name || supabaseUser.email?.split("@")[0] || "",
          email: supabaseUser.email || "",
          telegram: profile?.username ? `@${profile.username}` : "",
        }));
      } catch (error) {
        console.error("[Partners] Error loading user data:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [isAuthenticated, supabaseUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);

    try {
      // Build social links object
      const socialLinks: Record<string, string> = {};
      if (formData.telegram) socialLinks.telegram = formData.telegram;
      if (formData.instagram) socialLinks.instagram = formData.instagram;
      if (formData.youtube) socialLinks.youtube = formData.youtube;

      const { data, error } = await supabase.rpc("register_partner", {
        p_name: formData.name,
        p_email: formData.email,
        p_channel_name: formData.channel_name,
        p_channel_url: formData.channel_url,
        p_subscribers_count: parseInt(formData.subscribers_count) || 0,
        p_social_links: Object.keys(socialLinks).length > 0 ? socialLinks : {},
        p_description: formData.description || null,
        p_partner_type: formData.partner_type,
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        toast.success(currentContent.success.title, {
          description: currentContent.success.description,
          duration: 5000,
        });
        if (isAuthenticated) {
          navigate("/partner/dashboard");
        } else {
          // Reset form
          setFormData({
            name: "",
            email: "",
            channel_name: "",
            channel_url: "",
            subscribers_count: "",
            telegram: "",
            instagram: "",
            youtube: "",
            description: "",
            partner_type: "barter",
          });
        }
      } else {
        throw new Error(data?.[0]?.message || "Registration error");
      }
    } catch (error: any) {
      console.error("[Partners] Error:", error);
      toast.error("Registration error", {
        description: error.message || "Try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-primary/30">
      {/* Background effects */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
      ></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>
      <div className="fixed top-[-20%] left-[20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 md:px-10 py-6 flex items-center justify-between max-w-[1400px] mx-auto gap-4 flex-wrap">
        <LandingLogo theme="dark" className="scale-90 origin-left" />
        <div className="flex items-center gap-3 flex-wrap justify-end ml-auto">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-bold text-slate-300 hover:bg-white hover:text-slate-900 transition-all duration-300 hover:scale-105 relative"
          >
            {language === 'ru' ? 'На главную' : language === 'es' ? 'Inicio' : 'Home'}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative px-6 py-16 md:py-24 max-w-[1400px] mx-auto">
        <div className="text-center space-y-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
                <Crown className="h-4 w-4" />
                <span>{currentContent.title}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {currentContent.title}
              </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              {currentContent.subtitle}
            </p>
          </motion.div>
        </div>

        {/* Info Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
            {currentContent.sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
              >
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  {index === 0 && <Users className="h-6 w-6 text-primary" />}
                  {index === 1 && <TrendingUp className="h-6 w-6 text-primary" />}
                  {index === 2 && <Gift className="h-6 w-6 text-primary" />}
                  {index === 3 && <Sparkles className="h-6 w-6 text-primary" />}
                  {section.title}
                </h2>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </motion.div>
            ))}
        </div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-white">{currentContent.form.title}</CardTitle>
                <CardDescription className="text-slate-300">
                  {currentContent.form.subtitle}
                </CardDescription>
                {loadingProfile && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      {currentContent.form.loadingProfile}
                    </p>
                  </div>
                )}
                {isAlreadyPartner && (
                  <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {currentContent.form.alreadyPartner}
                    </p>
                    <p className="text-xs text-green-400/80 mt-1">
                      {currentContent.form.redirecting}
                    </p>
                  </div>
                )}
                {!isAuthenticated && !loadingProfile && (
                  <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-300">
                      {currentContent.form.needAuth}{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto text-amber-300 hover:text-amber-200"
                        onClick={() => setAuthModalOpen(true)}
                      >
                        {currentContent.form.login}
                      </Button>
                    </p>
                  </div>
                )}
                {isAuthenticated && !loadingProfile && !isAlreadyPartner && (formData.name || formData.email) && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {currentContent.form.autoFilled}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <User className="h-5 w-5 text-primary" />
                      {currentContent.form.personalInfo}
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-slate-200">{currentContent.form.name} *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          disabled={loadingProfile || isAlreadyPartner}
                          placeholder="John Doe"
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-slate-200">{currentContent.form.email} *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          disabled={loadingProfile || isAlreadyPartner}
                          placeholder="email@example.com"
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Channel Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      {currentContent.form.channelInfo}
                    </h3>
                    
                    <div>
                      <Label htmlFor="channel_name" className="text-slate-200">{currentContent.form.channelName} *</Label>
                      <Input
                        id="channel_name"
                        value={formData.channel_name}
                        onChange={(e) => setFormData({ ...formData, channel_name: e.target.value })}
                        required
                        placeholder="My DGT Channel"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="channel_url" className="text-slate-200">{currentContent.form.channelUrl} *</Label>
                      <Input
                        id="channel_url"
                        type="url"
                        value={formData.channel_url}
                        onChange={(e) => setFormData({ ...formData, channel_url: e.target.value })}
                        required
                        placeholder="https://t.me/mychannel"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="subscribers_count" className="text-slate-200">{currentContent.form.subscribers} *</Label>
                      <Input
                        id="subscribers_count"
                        type="number"
                        min="0"
                        value={formData.subscribers_count}
                        onChange={(e) => setFormData({ ...formData, subscribers_count: e.target.value })}
                        required
                        placeholder="1000"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      <Users className="h-5 w-5 text-primary" />
                      {currentContent.form.socialLinks}
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="telegram" className="text-slate-200">{currentContent.form.telegram}</Label>
                        <Input
                          id="telegram"
                          value={formData.telegram}
                          onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                          placeholder="@username"
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="instagram" className="text-slate-200">{currentContent.form.instagram}</Label>
                        <Input
                          id="instagram"
                          value={formData.instagram}
                          onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                          placeholder="@username"
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="youtube" className="text-slate-200">{currentContent.form.youtube}</Label>
                        <Input
                          id="youtube"
                          value={formData.youtube}
                          onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                          placeholder="Channel URL"
                          className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partner Type */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                      {formData.partner_type === "barter" ? (
                        <Gift className="h-5 w-5 text-primary" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-primary" />
                      )}
                      {currentContent.form.partnerType}
                    </h3>
                    
                    <Select
                      value={formData.partner_type}
                      onValueChange={(value: "barter" | "revenue_share") =>
                        setFormData({ ...formData, partner_type: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barter">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-primary" />
                            {currentContent.form.barter}
                          </div>
                        </SelectItem>
                        <SelectItem value="revenue_share">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            {currentContent.form.revenueShare}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {formData.partner_type === "barter" && (
                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm text-slate-300">
                          {currentContent.form.barterDesc}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="text-slate-200">{currentContent.form.description}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tell us about your channel, audience, and how you plan to promote the app..."
                      rows={4}
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !isAuthenticated || loadingProfile || isAlreadyPartner}
                    className="w-full bg-gradient-to-r from-primary via-primary/80 to-primary hover:from-primary/90 hover:via-primary/70 hover:to-primary/90 text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        {currentContent.form.submitting}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {currentContent.form.submit}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-16 md:py-24 border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center mb-12">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2 py-2 transition-opacity hover:opacity-90"
            >
              <LandingLogo theme="dark" className="scale-75" />
            </button>
            <p className="text-sm text-slate-400 max-w-md text-center">
              {language === 'ru' 
                ? 'Мы помогаем русскоязычным ученикам сдать экзамен DGT' 
                : language === 'es' 
                ? 'Ayudamos a estudiantes de habla rusa a aprobar el examen DGT'
                : 'We help Russian-speaking students pass the DGT exam'}
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-4">
                {language === 'ru' ? 'Ресурсы' : language === 'es' ? 'Recursos' : 'Resources'}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/blog")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Блог' : language === 'es' ? 'Blog' : 'Blog'}
                </button>
                <button
                  onClick={() => navigate("/help")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Помощь' : language === 'es' ? 'Ayuda' : 'Help'}
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Цены' : language === 'es' ? 'Precios' : 'Pricing'}
                </button>
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-4">
                {language === 'ru' ? 'Правовая информация' : language === 'es' ? 'Legal' : 'Legal'}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/terms")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Условия' : language === 'es' ? 'Términos' : 'Terms'}
                </button>
                <button
                  onClick={() => navigate("/privacy")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Политика конфиденциальности' : language === 'es' ? 'Privacidad' : 'Privacy'}
                </button>
                <button
                  onClick={() => navigate("/subscription-terms")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Условия подписки' : language === 'es' ? 'Términos de suscripción' : 'Subscription Terms'}
                </button>
                <button
                  onClick={() => navigate("/refund-policy")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Политика возврата' : language === 'es' ? 'Política de reembolso' : 'Refund Policy'}
                </button>
              </div>
            </div>

            {/* Partners */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-4">
                {language === 'ru' ? 'Партнёрам' : language === 'es' ? 'Afiliados' : 'Partners'}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/partners")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Стать партнером' : language === 'es' ? 'Convertirse en afiliado' : 'Become a Partner'}
                </button>
                <button
                  onClick={() => navigate("/partner/dashboard")}
                  className="block text-sm text-slate-400 hover:text-primary transition-colors text-left"
                >
                  {language === 'ru' ? 'Панель партнера' : language === 'es' ? 'Panel de afiliado' : 'Partner Dashboard'}
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white mb-4">
                {language === 'ru' ? 'Поддержка' : language === 'es' ? 'Soporte' : 'Support'}
              </h3>
              <div className="space-y-3">
                <a
                  href="https://t.me/sdadimtutbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Telegram</span>
                </a>
                <a
                  href="mailto:support@skilyapp.com"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
                >
                  <Send className="h-4 w-4" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <a
              href="https://t.me/sdadimtutbot"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-slate-400 hover:text-primary transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
            <a
              href="https://t.me/sdadimtutbot"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support"
              className="text-slate-400 hover:text-primary transition-colors"
            >
              <Send className="h-5 w-5" />
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center pt-8 border-t border-slate-800/50">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Skilyapp. {language === 'ru' ? 'Все права защищены' : language === 'es' ? 'Todos los derechos reservados' : 'All rights reserved'}
            </p>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
