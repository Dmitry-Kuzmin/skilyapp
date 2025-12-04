import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Privacy() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "Политика конфиденциальности",
      lastModified: "Последнее обновление: 4 декабря 2025",
      intro: `Настоящая Политика конфиденциальности применяется к пользователям iOS-приложения, Android-приложения или веб-сайта SkilyApp (совместно именуемые "Сайт") и другим взаимодействиям (например, запросы в службу поддержки клиентов, электронные письма, телефонные звонки).

Цель настоящей Политики конфиденциальности - помочь вам понять, какие персональные данные вы делитесь с нами. Эта политика описывает, что, когда и как мы собираем данные, и как мы используем и делимся вашими персональными данными.

Используя любой из наших сервисов, вы соглашаетесь с настоящей Политикой конфиденциальности.`,
      sections: [
        {
          title: "Сбор и использование информации",
          content: `Мы будем собирать различную информацию для различных целей в зависимости от того, как вы используете Сайт.`
        },
        {
          title: "a. Создание аккаунта",
          content: `Аккаунт требуется для использования Сайта и для предоставления вам услуг Сайта. Он может быть создан на нашем веб-сайте или в наших приложениях.

Когда вы создаете аккаунт, используя свой email, мы сохраняем информацию, которую вы предоставляете. Это включает:
- Ваше имя (используется для отображения вашего имени на Сайте)
- Email адрес - ваш уникальный ID, который мы используем для отслеживания и сохранения вашего прогресса на Сайте

Мы будем хранить ваши данные SkilyApp до тех пор, пока вы не запросите их удаление. Вы можете в любое время запросить удаление вашего аккаунта, и в этом случае мы удалим данные как можно скорее.`
        },
        {
          title: "b. Использование Сайта",
          content: `Мы обрабатываем и контролируем данные о вашем личном использовании Сайта, когда вы просматриваете контент или иным образом взаимодействуете с нашими сервисами.

Следующие цели объясняют, почему мы используем и храним данные об использовании:
- Для обработки ошибок и уведомлений. В случае, если что-то пойдет не так или не будет работать, нам нужно иметь возможность информировать вас об этом и обрабатывать ошибки.
- Для синхронизации между устройствами. Чтобы позволить вам использовать свой аккаунт на более чем одном устройстве с теми же настройками, прогрессом и курсами, мы сохраняем ваши настройки и прогресс, привязанные к вашему аккаунту.
- Для улучшения сервиса. Мы используем общую статистику и закономерности данных, чтобы сделать сервис и наш Сайт лучше.

Пока вы зарегистрированы в наших сервисах, мы будем хранить эти данные.`
        },
        {
          title: "c. Покупка услуги",
          content: `Когда вы покупаете услугу у нас, мы можем обрабатывать любые данные, которые вы предоставляете, включая имя, адрес, предпочтения и платежную информацию ("Данные транзакции"). Данные транзакции будут обрабатываться с целью поставки приобретенного продукта и услуг и ведения надлежащих записей этих транзакций.

Для обработки платежей мы используем сторонние платежные процессоры (Paddle, Stripe, Telegram Stars), которые могут собирать дополнительную информацию в соответствии со своими политиками конфиденциальности. Мы не храним полные данные вашей платежной карты на наших серверах.`
        },
        {
          title: "d. Посещение нашего веб-сайта",
          content: `На нашем веб-сайте мы используем файлы cookie и аналогичные технологии, если ваш браузер поддерживает/принимает их. Эти файлы cookie могут включать внутренне разработанные файлы cookie, а также файлы cookie третьих сторон.

Мы используем файлы cookie для:
- Базовых функций, чтобы позволить вам беспрепятственно перемещаться. Эти файлы cookie используются для обеспечения бесперебойного опыта, например, запоминая вашу аутентификацию.
- Персонализации рекламных кампаний. Эти файлы cookie помогают нам оценить эффективность наших рекламных кампаний.
- Улучшения веб-сайта. Эти файлы cookie позволяют нам улучшить наши сервисы, отслеживая, как они используются.`
        },
        {
          title: "Обмен информацией с третьими сторонами",
          content: `Если не указано иное, мы не раскрываем ваши персональные данные третьим сторонам. Мы работаем с платформами третьих сторон, которые предоставляют нам аналитические и рекламные услуги. Это включает помощь нам в понимании того, как используется наш Сайт, и предоставление рекламы нашим пользователям.`
        },
        {
          title: "Безопасность",
          content: `Онлайн-безопасность важна для нас, поэтому мы создали систему, которая принимает соответствующие меры для обеспечения безопасности и защиты ваших персональных данных.`
        },
        {
          title: "Возраст пользователей",
          content: `Данные не собираются намеренно от детей без согласия родителей или опекунов. Если вам меньше 18 лет, вы должны просмотреть Условия и положения, а также Политику конфиденциальности вместе с вашими родителями или опекунами.`
        },
        {
          title: "Изменения в настоящей политике конфиденциальности",
          content: `Настоящая Политика конфиденциальности может быть изменена время от времени. Вы можете просмотреть самую актуальную версию Политики конфиденциальности в любое время на этой странице.`
        },
        {
          title: "Контролер персональных данных",
          content: `Контролером ваших данных является:

SkilyApp
Испания, Таррагона

Свяжитесь с нами по адресу support@skilyapp.com для любых вопросов или запросов, касающихся ваших персональных данных.`
        }
      ]
    },
    es: {
      title: "Política de privacidad",
      lastModified: "Última actualización: 4 de diciembre de 2025",
      intro: `Esta Política de Privacidad se aplica a los usuarios de la aplicación iOS, aplicación Android o sitio web de SkilyApp (colectivamente el "Sitio") y otras interacciones (por ejemplo, consultas de servicio al cliente, correos electrónicos, llamadas telefónicas).

El propósito de esta Política de Privacidad es ayudarle a comprender qué datos personales comparte con nosotros. Esta política describe qué, cuándo y cómo recopilamos datos, y cómo usamos y compartimos sus datos personales.

Al usar cualquiera de nuestros servicios, acepta esta Política de Privacidad.`,
      sections: [
        {
          title: "Recopilación y uso de información",
          content: `Recopilaremos información diferente para diferentes propósitos dependiendo de cómo use el Sitio.`
        },
        {
          title: "a. Crear una cuenta",
          content: `Se requiere una cuenta para poder usar el Sitio y para que podamos proporcionarle servicios del Sitio. Puede crearse en nuestro sitio web o en nuestras aplicaciones.

Cuando crea una cuenta usando su correo electrónico, almacenamos la información que proporciona. Esto incluye:
- Su nombre (se usa para mostrar su nombre en el Sitio)
- Dirección de correo electrónico: su ID único que usamos para rastrear y guardar su progreso en el Sitio

Mantendremos sus datos de SkilyApp hasta que solicite que se eliminen. Puede solicitar en cualquier momento que se elimine su cuenta, y en ese caso eliminaremos los datos lo antes posible.`
        },
        {
          title: "b. Usar el Sitio",
          content: `Procesamos y controlamos datos sobre su uso personal del Sitio cuando visualiza contenido o interactúa con nuestros servicios.

Los siguientes propósitos explican por qué usamos y almacenamos datos de uso:
- Para el manejo de errores y avisos. En caso de que algo salga mal o no funcione, necesitamos poder informarle al respecto y manejar los errores.
- Para sincronizar entre dispositivos. Para permitirle usar su cuenta en más de un dispositivo con la misma configuración, progreso y cursos, almacenamos su configuración y progreso vinculados a su cuenta.
- Para mejorar el servicio. Usamos estadísticas generales y patrones de datos para mejorar el servicio y nuestro Sitio.

Mientras esté registrado en nuestros servicios, mantendremos estos datos.`
        },
        {
          title: "c. Comprar un servicio",
          content: `Cuando compra un servicio de nosotros, podemos procesar cualquier dato que proporcione, incluido nombre, dirección, preferencias e información de pago ("Datos de transacción"). Los datos de transacción se procesarán con el propósito de suministrar el producto y servicios comprados y mantener registros adecuados de esas transacciones.

Para procesar pagos utilizamos procesadores de pago de terceros (Paddle, Stripe, Telegram Stars), que pueden recopilar información adicional de acuerdo con sus políticas de privacidad. No almacenamos los datos completos de su tarjeta de pago en nuestros servidores.`
        },
        {
          title: "d. Visitar nuestro sitio web",
          content: `En nuestro sitio web, usamos cookies y tecnologías similares si su navegador las admite/acepta. Estas cookies pueden incluir cookies desarrolladas internamente, así como cookies de terceros.

Usamos cookies para:
- Funciones básicas para permitirle navegar sin interrupciones. Estas cookies se usan para proporcionar una experiencia fluida, por ejemplo, recordando su autenticación.
- Personalización de campañas publicitarias. Estas cookies nos ayudan a evaluar la efectividad de nuestras campañas publicitarias.
- Mejora del sitio web. Estas cookies nos permiten mejorar nuestros servicios monitoreando cómo se usan.`
        },
        {
          title: "Compartir información con terceros",
          content: `A menos que se indique lo contrario, no divulgamos sus datos personales a terceros. Trabajamos con plataformas de terceros que nos proporcionan servicios analíticos y publicitarios. Esto incluye ayudarnos a entender cómo se usa nuestro Sitio y proporcionar publicidad a nuestros usuarios.`
        },
        {
          title: "Seguridad",
          content: `La seguridad en línea es importante para nosotros, por eso hemos construido un sistema que toma las medidas apropiadas para asegurar que sus datos personales estén seguros y protegidos.`
        },
        {
          title: "Edad de los usuarios",
          content: `Los datos no se recopilan intencionalmente de niños sin el consentimiento de los padres o tutores. Si tiene menos de 18 años, debe revisar los Términos y Condiciones, así como la Política de Privacidad con sus padres o tutores.`
        },
        {
          title: "Cambios a esta política de privacidad",
          content: `Esta Política de Privacidad puede ser modificada de vez en cuando. Puede revisar la versión más actual de la Política de Privacidad en cualquier momento en esta página.`
        },
        {
          title: "El controlador de datos personales",
          content: `El controlador de sus datos es:

SkilyApp
España, Tarragona

Contáctenos en support@skilyapp.com para cualquier pregunta o solicitud relacionada con sus datos personales.`
        }
      ]
    },
    en: {
      title: "Privacy policy",
      lastModified: "Last Updated: December 4, 2025",
      intro: `This Privacy Policy applies to users of SkilyApp's iOS application, Android application or Website (collectively the Site) and other interactions (e.g. customer service inquiries, emails, phone calls).

The purpose of this Privacy Policy is to help you understand what personal data you share with us. This policy describes what, when and how we collect data, and how we use and share your personal data.

By using any of our services, you agree to this Privacy Policy.`,
      sections: [
        {
          title: "Information Gathering and Usage",
          content: `We will collect different information for different purposes depending on how you use the Site.`
        },
        {
          title: "a. Creating an Account",
          content: `An Account is required to be able to use the Site and for us to provide services of the Site to you. It can be created on our Website or in our Apps.

When you create an Account using your email, we store the information that you provide. This includes:
- Your name (used to display your name within the Site)
- Email address - your unique ID that we use to track and save your progress on the Site

We will keep your SkilyApp data until you request to have it removed. You can at any time request to have your Account deleted, in which case we will delete the data as soon as possible.`
        },
        {
          title: "b. Using the Site",
          content: `We process and control data about your personal use of the Site when you view content or otherwise interact with our services.

The following purposes are why we use and store Usage Data:
- For error handling and notices. In case something goes wrong or does not work we need to be able to inform you about it and to handle the errors.
- To sync across devices. To allow you to use your account on more than one device with the same settings, progress and courses, we store your settings and progress bound to your Account.
- To improve service. We use general statistics and patterns of data to make the service and our Site better.

As long as you are registered to our services we will keep this data.`
        },
        {
          title: "c. Purchasing a service",
          content: `When you buy a service from us, we may process any data that you provide, including name, address, preferences and payment information ("Transaction Data"). The transaction data will be processed for the purpose of supplying the purchased products and services and keeping proper records of those transactions.

To process payments, we use third-party payment processors (Paddle, Stripe, Telegram Stars), which may collect additional information in accordance with their privacy policies. We do not store your full payment card details on our servers.`
        },
        {
          title: "d. Visiting our website",
          content: `On our website, we use cookies and similar technologies if your browser supports/accepts them. These cookies can include internally developed cookies as well as third-party cookies.

We use cookies for:
- Basic functions to let you navigate uninterrupted. These cookies are used to provide a seamless experience by e.g. remembering your authentication.
- Personalization of advertising campaigns. These cookies help us estimate the effectiveness of our advertising campaigns.
- Improvement for the website. These cookies enable us to improve our services by monitoring how they are used.`
        },
        {
          title: "Sharing information with third parties",
          content: `Unless stated below, we do not disclose your personal data to third parties. We work with third-party platforms that provide us with analytics and advertising services. This includes helping us understand how our Site is used and providing advertising to our users.`
        },
        {
          title: "Security",
          content: `Online security is important to us, which is why we have built a system that takes appropriate steps to ensure your personal data is safe and protected.`
        },
        {
          title: "Age of users",
          content: `Data is not knowingly collected on children without the consent of parents or guardians. If below 18, you must review the Terms and Conditions as well as the Privacy policy with your parent(s) or guardian(s).`
        },
        {
          title: "Changes to this privacy policy",
          content: `This Privacy Policy may be modified from time to time. You can review the most current version of the Privacy Policy at any time on this page.`
        },
        {
          title: "The Personal Data controller",
          content: `The controller of your data is:

SkilyApp
Spain, Tarragona

Contact us at support@skilyapp.com for any questions or requests regarding your personal data.`
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
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
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
            <strong>{language === 'ru' ? 'Контакты:' : language === 'es' ? 'Contacto:' : 'Contact:'}</strong> support@skilyapp.com
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>{language === 'ru' ? 'Адрес:' : language === 'es' ? 'Dirección:' : 'Address:'}</strong> Испания, Таррагона
          </p>
        </div>
      </div>
    </Layout>
  );
}



