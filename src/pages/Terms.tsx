import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Terms() {
  const { t, language } = useLanguage();

  const content = {
    ru: {
      title: "Условия использования",
      lastModified: "Последнее обновление: 14 июля 2023",
      sections: [
        {
          title: "1. Ваше согласие",
          content: `Добро пожаловать в Условия использования Sdadim. Это соглашение ("Соглашение") между Sdadim ("мы", "нас", "наш"), владельцем и оператором платформы Sdadim, включая веб-сайт, мобильные приложения iOS и Android, компоненты и Сервисы Sdadim (определенные ниже) (совместно именуемые "Платформа"), и вами ("вы", "ваш", "Пользователь"), пользователем Платформы.

НАСТОЯЩИМ ВЫ ПОДТВЕРЖДАЕТЕ, ЧТО ВЫ ПРОЧИТАЛИ И ПОНЯЛИ ПОЛОЖЕНИЯ ОБ АРБИТРАЖЕ И КОЛЛЕКТИВНЫХ ИСКАХ, КОТОРЫЕ МОГУТ ПОВЛИЯТЬ НА ВАШИ ПРАВА.

Нажимая "Я согласен", подписываясь на Платформу и получая доступ или используя Платформу, вы соглашаетесь соблюдать настоящее Соглашение и Политику конфиденциальности. Мы можем изменять настоящее Соглашение или Политику конфиденциальности и можем уведомлять вас об этом. Если вы не согласны с настоящим Соглашением или Политикой конфиденциальности, пожалуйста, немедленно прекратите использование нашей Платформы.`
        },
        {
          title: "2. Аккаунты",
          content: `Пользователи могут быть обязаны зарегистрироваться перед использованием или доступом к Платформе. Ваша информация будет собираться и раскрываться в соответствии с нашей Политикой конфиденциальности. Все пользователи обязаны предоставлять правдивую, актуальную и точную информацию при регистрации на нашей Платформе. Мы оставляем за собой право проверять все учетные данные пользователей и отклонять любых пользователей. Вы несете полную ответственность за сохранение конфиденциальности пароля и аккаунта и за любую и всю деятельность, происходящую под вашим аккаунтом.`
        },
        {
          title: "3. Возрастные ограничения",
          content: `Пользователи должны быть не моложе 13 лет для регистрации и использования нашей Платформы. Если вам от 13 до 18 лет, вы должны получить согласие ваших родителей или опекунов для продолжения использования предоставляемых услуг и согласия с настоящим Соглашением от вашего имени.`
        },
        {
          title: "4. Доступ",
          content: `После регистрации и надлежащей оплаты нашей Платформы, где требуется, мы предоставим вам доступ к Платформе в соответствии с настоящим Соглашением. Если вы нарушите настоящее Соглашение, ваш доступ к использованию нашей Платформы может быть прекращен по нашему усмотрению.`
        },
        {
          title: "5. Права собственности на Платформу",
          content: `Вы признаете, что структура, организация и код Платформы, любых размещенных сервисов и всех связанных программных компонентов являются собственностью Sdadim и/или лицензиаров Sdadim, и что Sdadim и/или его лицензиары сохраняют исключительное право собственности на Платформу, любую документацию, информацию и все другие права интеллектуальной собственности, относящиеся к Платформе.`
        },
        {
          title: "6. Платформа и Сервисы",
          content: `Платформа Sdadim может предлагать услуги ("Сервисы Sdadim") пользователям Платформы. Пожалуйста, имейте в виду, что любые Сервисы Sdadim предоставляются "как есть" и "как доступно". Мы оставляем за собой право изменять, модифицировать, обновлять или удалять Платформу или любые Сервисы Sdadim в любое время по нашему усмотрению.`
        },
        {
          title: "7. Конфиденциальность пользователей",
          content: `Мы ценим вашу конфиденциальность и понимаем ваши опасения по поводу конфиденциальности. Наша Политика конфиденциальности включена в настоящее Соглашение и регулирует вашу передачу информации на нашу Платформу.`
        },
        {
          title: "8. Использование Платформы",
          content: `При использовании нашей Платформы вы несете ответственность за свое использование Платформы. Вы соглашаетесь не копировать, распространять, получать доступ или раскрывать любую часть Платформы любым способом, включая без ограничения любое автоматизированное или неавтоматизированное "скрапирование" или несанкционированное использование серверного API.`
        },
        {
          title: "9. Подписки и платежи",
          content: `Некоторые функции Платформы могут требовать оплаты подписки. Вы соглашаетесь оплачивать все сборы, связанные с вашей подпиской. Подписки автоматически продлеваются на периоды той же длины, что и ваша первоначальная подписка, до тех пор, пока мы не получим уведомление об ином.`
        },
        {
          title: "10. Возврат средств",
          content: `Мы хотим, чтобы вы были довольны Сервисами Sdadim; однако возврат средств не будет разрешен после начала вашей платной подписки. Если у вас есть вопросы относительно подписки или наших политик, пожалуйста, свяжитесь с нами.`
        }
      ]
    },
    es: {
      title: "Términos y condiciones",
      lastModified: "Última modificación: 14 de julio de 2023",
      sections: [
        {
          title: "1. Su aceptación",
          content: `Bienvenido a los Términos y Condiciones de Sdadim. Este es un acuerdo ("Acuerdo") entre Sdadim ("nosotros", "nos", "nuestro"), propietario y operador de la Plataforma Sdadim, incluido el sitio web, aplicaciones móviles iOS y Android, componentes y Servicios Sdadim (definidos a continuación) (colectivamente la "Plataforma"), y usted ("usted", "su", "Usuario"), un Usuario de la Plataforma.

AL HACER CLIC EN "ACEPTO", AL SUSCRIBIRSE A LA PLATAFORMA Y AL ACCEDER O USAR LA PLATAFORMA, USTED ACEPTA QUEDAR VINCULADO POR ESTE ACUERDO Y LA POLÍTICA DE PRIVACIDAD. PODEMOS MODIFICAR ESTE ACUERDO O LA POLÍTICA DE PRIVACIDAD Y PODEMOS NOTIFICARLE CUANDO LO HAGAMOS. SI NO ESTÁ DE ACUERDO CON ESTE ACUERDO O LA POLÍTICA DE PRIVACIDAD, DEJE DE USAR NUESTRA PLATAFORMA INMEDIATAMENTE.`
        },
        {
          title: "2. Cuentas",
          content: `Los usuarios pueden estar obligados a registrarse antes de usar o acceder a la Plataforma. Su información será recopilada y divulgada de acuerdo con nuestra Política de Privacidad. Todos los usuarios están obligados a proporcionar información veraz, actualizada y precisa al registrarse en nuestra Plataforma. Nos reservamos el derecho de verificar todas las credenciales de usuario y rechazar cualquier usuario.`
        },
        {
          title: "3. Límites de edad",
          content: `Los usuarios deben tener al menos 13 años de edad para registrarse y usar nuestra Plataforma. Si tiene entre 13 y 18 años, debe tener el consentimiento de sus padres o tutores para continuar usando los servicios proporcionados y aceptar este Acuerdo en su nombre.`
        },
        {
          title: "4. Acceso",
          content: `Después de registrarse y pagar adecuadamente nuestra Plataforma, cuando sea necesario, le otorgaremos acceso a la Plataforma de acuerdo con este Acuerdo. Si viola este Acuerdo, su acceso para usar nuestra Plataforma puede ser terminado a nuestra discreción.`
        },
        {
          title: "5. Propiedad de la Plataforma",
          content: `Usted reconoce que la estructura, organización y código de la Plataforma, cualquier servicio alojado y todos los componentes de software relacionados son propiedad de Sdadim y/o licenciatarios de Sdadim, y que Sdadim y/o sus licenciatarios conservan la propiedad exclusiva de la Plataforma.`
        },
        {
          title: "6. Plataforma y Servicios",
          content: `La Plataforma Sdadim puede ofrecer servicios ("Servicios Sdadim") a los usuarios de la Plataforma. Tenga en cuenta que cualquier Servicio Sdadim se proporciona "tal cual" y "según disponibilidad". Nos reservamos el derecho de alterar, modificar, actualizar o eliminar la Plataforma o cualquier Servicio Sdadim en cualquier momento a nuestra discreción.`
        },
        {
          title: "7. Privacidad del usuario",
          content: `Valoramos su privacidad y entendemos sus preocupaciones de privacidad. Nuestra Política de Privacidad está incorporada en este Acuerdo y rige su envío de información a nuestra Plataforma.`
        },
        {
          title: "8. Uso de la Plataforma",
          content: `Al usar nuestra Plataforma, usted es responsable de su uso de la Plataforma. Usted acepta no copiar, distribuir, acceder o divulgar ninguna parte de la Plataforma de ninguna manera, incluido sin limitación cualquier "scraping" automatizado o no automatizado o uso no autorizado del servidor API.`
        },
        {
          title: "9. Suscripciones y pagos",
          content: `Algunas funciones de la Plataforma pueden requerir el pago de una suscripción. Usted acepta pagar todas las tarifas asociadas con su suscripción. Las suscripciones se renuevan automáticamente por períodos de la misma duración que su suscripción inicial hasta que se nos notifique lo contrario.`
        },
        {
          title: "10. Reembolsos",
          content: `Queremos que esté satisfecho con los Servicios Sdadim; sin embargo, no se permitirán reembolsos después del inicio de su suscripción de pago. Si tiene alguna pregunta sobre la suscripción o nuestras políticas, póngase en contacto con nosotros.`
        }
      ]
    },
    en: {
      title: "Terms and conditions",
      lastModified: "Last Modified: July 14, 2023",
      sections: [
        {
          title: "1. Your Acceptance",
          content: `Welcome to the Sdadim Terms and Conditions. This is an agreement ("Agreement") between Sdadim ("us", "we", "our"), the owner and operator of the Sdadim Platform, including the website, iOS and Android mobile applications, components, and the Sdadim Services (defined below) (collectively the "Platform") and you ("you", "your", "User"), a User of the Platform.

PLEASE BE AWARE THAT THERE ARE ARBITRATION AND CLASS ACTION PROVISIONS THAT MAY AFFECT YOUR RIGHTS.

By clicking "I agree", subscribing to the Platform, and accessing or using the Platform you agree to be bound by this Agreement and the Privacy Policy. We may amend this Agreement or the Privacy Policy and may notify you when we do so. If you do not agree to this Agreement or the Privacy Policy please cease using our Platform immediately.`
        },
        {
          title: "2. Accounts",
          content: `Users may be required to register prior to using or accessing the Platform. Your information will be collected and disclosed in accordance with our Privacy Policy. All users are required to provide truthful, up-to-date, and accurate information when registering for our Platform. We reserve the right to verify all user credentials and to reject any users.`
        },
        {
          title: "3. Age Limits",
          content: `Users must be 13 years of age or older to register and use our Platform. If you are between the age of 13 and under 18 you must have your parent(s) or guardian(s) consent to continue using the services provided and agree to this Agreement on your behalf.`
        },
        {
          title: "4. Access",
          content: `After registering and properly paying for our Platform, where required, we shall grant you access to the Platform as permitted by us and in accordance with this Agreement. If you breach this Agreement, your access to use our Platform may be terminated at our discretion.`
        },
        {
          title: "5. Platform Ownership",
          content: `You acknowledge that the structure, organization, and code of the Platform, any hosted services, and all related software components are proprietary to Sdadim and/or Sdadim' licensors and that Sdadim and/or its licensors retains exclusive ownership of the Platform.`
        },
        {
          title: "6. Platform and Services",
          content: `The Sdadim Platform may offer services ("Sdadim Services") to users of the Platform. Please be aware that any Sdadim Services are "as-is" and "as-available". We reserve the right to alter, modify, update, or remove the Platform or any Sdadim Services, at any time at our discretion.`
        },
        {
          title: "7. User Privacy",
          content: `We value your privacy and understand your privacy concerns. Our Privacy Policy is incorporated into this Agreement, and it governs your submission of information to our Platform.`
        },
        {
          title: "8. Use of the Platform",
          content: `When using our Platform, you are responsible for your use of the Platform. You agree not to copy, distribute, access, or disclose any part of the Platform in any medium, including without limitation by any automated or non-automated "scraping" or unauthorized use of the server API.`
        },
        {
          title: "9. Subscriptions and Payments",
          content: `Some features of the Platform may require payment of a subscription. You agree to pay all fees associated with your subscription. Subscriptions automatically renew for periods of the same length as your initial subscription until we are notified otherwise.`
        },
        {
          title: "10. Refunds",
          content: `We want you to be satisfied with the Sdadim Services; however, no refunds will be permitted after the start of your paid subscription. If you have any questions regarding the subscription or our policies, please contact us.`
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
            <strong>{language === 'ru' ? 'Контакты:' : language === 'es' ? 'Contacto:' : 'Contact:'}</strong> support@sdadim.com
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <strong>{language === 'ru' ? 'Адрес:' : language === 'es' ? 'Dirección:' : 'Address:'}</strong> Россия, Москва, Сити 122
          </p>
        </div>
      </div>
    </Layout>
  );
}

