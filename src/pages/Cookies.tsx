import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

interface CookiesProps {
    embedded?: boolean;
}

export default function Cookies({ embedded = false }: CookiesProps) {
    const { language } = useLanguage();

    const content = {
        ru: {
            title: "Политика использования файлов cookie",
            lastModified: "Последнее обновление: 27 февраля 2026",
            sections: [
                {
                    title: "1. Что такое файлы cookie?",
                    content: "Файлы cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве, когда вы посещаете веб-сайт. Они широко используются для обеспечения работы сайтов или повышения их эффективности, а также для предоставления отчетной информации."
                },
                {
                    title: "2. Как мы используем файлы cookie?",
                    content: `Мы используем файлы cookie для нескольких целей:
• Технические: необходимые для авторизации и работы ваших настроек.
• Аналитические: чтобы понимать, как вы используете наше приложение и улучшать его.
• Аналитические: для улучшения нашего сервиса.`
                },
                {
                    title: "3. Сторонние файлы cookie",
                    content: "Мы используем услуги сторонних компаний, таких как Vercel Analytics. Эти компании могут устанавливать свои файлы cookie для сбора информации о ваших посещениях сайта с целью улучшения сервиса."
                },
                {
                    title: "4. Управление файлами cookie",
                    content: "Вы можете управлять файлами cookie или отключать их в настройках вашего браузера. Однако это может повлиять на функциональность нашего сервиса. Вы также можете управлять вашими предпочтениями через настройки Google, если доступны на нашем сайте."
                }
            ]
        },
        es: {
            title: "Política de Cookies",
            lastModified: "Última actualización: 27 de febrero de 2026",
            sections: [
                {
                    title: "1. ¿Qué son las cookies?",
                    content: "Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Se utilizan ampliamente para que los sitios funcionen o funcionen de manera más eficiente, así como para proporcionar información de informes."
                },
                {
                    title: "2. ¿Cómo utilizamos las cookies?",
                    content: `Utilizamos cookies para varios propósitos:
• Técnicas: necesarias para la autenticación y el funcionamiento de sus ajustes.
• Analíticas: para entender cómo utiliza nuestra aplicación y mejorarla.
• Analíticas: para mejorar nuestro servicio.`
                },
                {
                    title: "3. Cookies de terceros",
                    content: "Utilizamos servicios de terceros como Vercel Analytics. Estos terceros pueden colocar cookies en su navegador para recopilar información sobre sus visitas con el fin de mejorar el servicio."
                },
                {
                    title: "4. Gestión de cookies",
                    content: "Puede gestionar o desactivar las cookies en la configuración de su navegador. Sin embargo, esto puede afectar a la funcionalidad de nuestro servicio. También puede gestionar sus preferencias a través de los ajustes de Google si están disponibles en nuestro sitio."
                }
            ]
        },
        en: {
            title: "Cookie Policy",
            lastModified: "Last updated: February 27, 2026",
            sections: [
                {
                    title: "1. What are cookies?",
                    content: "Cookies are small text files that are stored on your device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide reporting information."
                },
                {
                    title: "2. How do we use cookies?",
                    content: `We use cookies for several purposes:
• Technical: necessary for authentication and handling your settings.
• Analytics: to understand how you use our application and improve it.
• Advertising (Google AdSense): to show personalized ads based on your interests.`
                },
                {
                    title: "3. Third-party cookies",
                    content: "We use third-party services such as Google AdSense and Vercel Analytics. These parties may place cookies on your browser to collect information about your visits to this and other sites in order to provide advertisements about goods and services of interest to you."
                },
                {
                    title: "4. Managing cookies",
                    content: "You can manage or disable cookies in your browser settings. However, this may affect the functionality of our service. You can also manage your preferences through Google settings if available on our site."
                }
            ]
        }
    };

    const currentContent = content[language as keyof typeof content] || content.en;

    const contentJsx = (
        <div className={embedded ? "p-6" : "container mx-auto px-4 py-8 max-w-4xl"}>
            {!embedded && (
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {currentContent.title}
                </h1>
            )}
            {!embedded && (
                <p className="text-sm text-muted-foreground mb-8">
                    {currentContent.lastModified}
                </p>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                {currentContent.sections.map((section, index) => (
                    <div key={index} className="space-y-4">
                        <h2 className={embedded ? "text-xl font-semibold" : "text-2xl font-semibold"}>{section.title}</h2>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                            {section.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );

    if (embedded) {
        return contentJsx;
    }

    return (
        <Layout>
            {contentJsx}
        </Layout>
    );
}
