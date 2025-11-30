import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Partners() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "Партнёрская программа",
      lastModified: "Последнее обновление: 30 января 2025",
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
- Комиссию с каждой подписки, привлечённой по вашей ссылке
- Эксклюзивные промокоды для вашей аудитории
- Приоритетную поддержку
- Маркетинговые материалы и баннеры
- Статистику по привлечённым пользователям`,
        },
        {
          title: "Как стать партнёром",
          content: `Для участия в партнёрской программе:
1. Свяжитесь с нами по email: partners@skilyapp.com
2. Опишите вашу аудиторию и каналы продвижения
3. Мы рассмотрим вашу заявку в течение 3-5 рабочих дней
4. После одобрения вы получите уникальную партнёрскую ссылку и доступ к панели партнёра`,
        },
        {
          title: "Условия сотрудничества",
          content: `Партнёрская программа работает на основе:
- Прозрачной системы комиссий
- Ежемесячных выплат
- Минимального порога для выплаты: 50€
- Отслеживания конверсий в реальном времени`,
        },
        {
          title: "Контакты",
          content: `По всем вопросам о партнёрской программе обращайтесь:

Email: partners@skilyapp.com
Время ответа: в течение 3-5 рабочих дней`,
        }
      ]
    },
    es: {
      title: "Programa de afiliados",
      lastModified: "Última actualización: 30 de enero de 2025",
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
- Comisión por cada suscripción atraída a través de su enlace
- Códigos promocionales exclusivos para su audiencia
- Soporte prioritario
- Materiales de marketing y banners
- Estadísticas de usuarios atraídos`,
        },
        {
          title: "Cómo convertirse en afiliado",
          content: `Para participar en el programa de afiliados:
1. Contáctenos por email: partners@skilyapp.com
2. Describa su audiencia y canales de promoción
3. Revisaremos su solicitud en 3-5 días hábiles
4. Después de la aprobación, recibirá un enlace de afiliado único y acceso al panel de afiliados`,
        },
        {
          title: "Condiciones de colaboración",
          content: `El programa de afiliados funciona con:
- Sistema transparente de comisiones
- Pagos mensuales
- Umbral mínimo para pago: 50€
- Seguimiento de conversiones en tiempo real`,
        },
        {
          title: "Contacto",
          content: `Para cualquier pregunta sobre el programa de afiliados, contáctenos:

Email: partners@skilyapp.com
Tiempo de respuesta: dentro de 3-5 días hábiles`,
        }
      ]
    },
    en: {
      title: "Affiliate Program",
      lastModified: "Last updated: January 30, 2025",
      intro: `SkilyApp offers an affiliate program for educational platforms, bloggers, and influencers who want to help their audiences prepare for the DGT exam.`,
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
- Commission on each subscription attracted through your link
- Exclusive promo codes for your audience
- Priority support
- Marketing materials and banners
- Statistics on attracted users`,
        },
        {
          title: "How to become an affiliate",
          content: `To participate in the affiliate program:
1. Contact us by email: partners@skilyapp.com
2. Describe your audience and promotion channels
3. We will review your application within 3-5 business days
4. After approval, you will receive a unique affiliate link and access to the affiliate panel`,
        },
        {
          title: "Partnership terms",
          content: `The affiliate program works with:
- Transparent commission system
- Monthly payments
- Minimum payout threshold: €50
- Real-time conversion tracking`,
        },
        {
          title: "Contact",
          content: `For any questions about the affiliate program, contact us:

Email: partners@skilyapp.com
Response time: within 3-5 business days`,
        }
      ]
    }
  };

  const currentContent = content[language] || content.en;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {currentContent.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          {currentContent.lastModified}
        </p>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground leading-relaxed">
            {currentContent.intro}
          </p>
          
          {currentContent.sections.map((section, index) => (
            <div key={index} className="space-y-4">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>{language === 'ru' ? 'Контакты:' : language === 'es' ? 'Contacto:' : 'Contact:'}</strong> partners@skilyapp.com
          </p>
        </div>
      </div>
    </Layout>
  );
}

