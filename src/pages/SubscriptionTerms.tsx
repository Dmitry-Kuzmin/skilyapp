import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SubscriptionTerms() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "Условия подписки",
      intro: `Вы можете отменить бесплатную пробную версию или подписку в любое время, отключив автоматическое продление. Чтобы избежать списания средств за следующий период подписки, вы должны отключить автоматическое продление не менее чем за 24 часа до окончания текущего периода подписки.

Только вы можете управлять своей подпиской. Обратите внимание, что удаление приложения или аккаунта не отменяет вашу подписку.`,
      sections: [
        {
          title: "Автоматическое продление",
          content: `Ваша подписка будет автоматически продлеваться на периоды той же длины, что и ваша первоначальная подписка, до тех пор, пока мы не получим уведомление об ином. Вы соглашаетесь, что для автоматического и периодического списания средств с вашего предпочтительного способа оплаты не требуется дополнительного согласия с вашей стороны.

Если вы начали подписку или бесплатную пробную версию через Google Play, ваш аккаунт Google Play будет автоматически продлеваться и с вас будет взиматься плата за продление, если автоматическое продление не отключено в настройках вашего аккаунта Google Play.

Если вы начали подписку или бесплатную пробную версию через Apple App Store, ваш аккаунт Apple ID будет автоматически продлеваться и с вас будет взиматься плата за продление, если автоматическое продление не отключено в настройках вашего аккаунта Apple ID.

Если вы начали подписку через способ оплаты на веб-сайте SkilyApp, ваша подписка будет автоматически продлеваться, и с вашего банковского счета будет взиматься плата за продление, если автоматическое продление не отключено. Для отключения автоматического продления свяжитесь с нами по адресу support@skilyapp.com.`
        },
        {
          title: "Отмена подписки",
          content: `Отмена подписки означает, что автоматическое продление будет отключено. У вас все еще будет доступ ко всем функциям подписки в течение оставшегося времени вашего активного периода подписки.`
        },
        {
          title: "Возврат средств",
          content: `Мы предоставляем возврат средств по нашему собственному усмотрению и в соответствии с применимым законодательством, при условии, что мы считаем запрос приемлемым. Возврат средств за частично использованные периоды не производится.

Как правило, возврат средств может быть запрошен только в течение периода подписки. Если период подписки истек, услуга будет считаться полностью потребленной. Некоторые запросы на возврат средств могут быть рассмотрены только в особых обстоятельствах.

Любой запрос на возврат средств должен быть направлен на support@skilyapp.com.`
        },
        {
          title: "Цены и повышение цен",
          content: `Цены на все платные подписки указаны на платформе SkilyApp или в вашем аккаунте. Кроме того, SkilyApp может повысить цену любых платных подписок по своему усмотрению, и мы оставляем за собой право делать это в любое время. В случае повышения цены SkilyApp уведомит вас, и у вас будет возможность принять или отклонить повышение цены.`
        },
        {
          title: "Изменения в условиях подписки",
          content: `Мы можем изменять эти Условия подписки время от времени. Когда мы изменяем эти Условия подписки, мы обновим эту страницу и укажем дату последнего изменения или можем отправить вам электронное письмо. Вы можете отказаться согласиться с изменениями, но если вы это сделаете, вы должны немедленно прекратить использование нашей Платформы.`
        }
      ]
    },
    es: {
      title: "Términos de suscripción",
      intro: `Puede cancelar su prueba gratuita o suscripción en cualquier momento desactivando la renovación automática. Para evitar que se le cobre por el próximo período de suscripción, debe desactivar la renovación automática al menos 24 horas antes del final del período de suscripción actual.

Solo usted puede administrar su suscripción. Tenga en cuenta que eliminar la aplicación o la cuenta no cancela su suscripción.`,
      sections: [
        {
          title: "Renovación automática",
          content: `Su suscripción se renovará automáticamente por períodos de la misma duración que su suscripción inicial hasta que se nos notifique lo contrario. Usted acepta que no se requiere ningún consentimiento adicional de su parte para cobrar su método de pago preferido automáticamente y de forma renovable automáticamente para la suscripción.

Si inició la suscripción o la prueba gratuita usando Google Play, su cuenta de Google Play se renovará automáticamente y se le cobrará la renovación a menos que la renovación automática esté desactivada en la configuración de su cuenta de Google Play.

Si inició la suscripción o la prueba gratuita usando la App Store de Apple, su cuenta de Apple ID se renovará automáticamente y se le cobrará la renovación a menos que la renovación automática esté desactivada en la configuración de su cuenta de Apple ID.

Si inició la suscripción usando el método de pago en el sitio web de SkilyApp, su suscripción se renovará automáticamente y se cargará a su cuenta bancaria la renovación a menos que la renovación automática esté desactivada. Para desactivar la renovación automática, contáctenos en support@skilyapp.com.`
        },
        {
          title: "Cancelación de suscripción",
          content: `Cancelar su suscripción significa que la renovación automática se desactivará. Todavía tendrá acceso a todas las funciones de suscripción durante el tiempo restante de su período de suscripción activo.`
        },
        {
          title: "Reembolsos",
          content: `Proporcionamos reembolsos de acuerdo con la ley aplicable y nuestra política de reembolso.

Puede solicitar un reembolso dentro de los 14 días posteriores a la compra de una suscripción si el servicio no ha sido utilizado o ha sido utilizado mínimamente. Los reembolsos por períodos parcialmente utilizados se consideran caso por caso.

Para solicitar un reembolso, contáctenos en support@skilyapp.com indicando la razón del reembolso. Revisaremos su solicitud dentro de 5 días hábiles.

Los reembolsos se procesan utilizando el mismo método de pago utilizado para la compra original.`
        },
        {
          title: "Precios y aumentos de precios",
          content: `Los precios de todas las suscripciones de pago se enumeran en la plataforma SkilyApp o dentro de su cuenta. Además, SkilyApp puede aumentar el precio de cualquier suscripción de pago a nuestra discreción y nos reservamos el derecho de hacerlo en cualquier momento. En caso de aumento de precio, SkilyApp le notificará y tendrá la oportunidad de aceptar o rechazar cualquier aumento de precio.`
        },
        {
          title: "Cambios en los términos de suscripción",
          content: `Podemos modificar estos Términos de suscripción de vez en cuando. Cuando modifiquemos estos Términos de suscripción, actualizaremos esta página e indicaremos la fecha en que fue modificada por última vez o podemos enviarle un correo electrónico. Puede rechazar aceptar las modificaciones, pero si lo hace, debe cesar inmediatamente de usar nuestra Plataforma.`
        }
      ]
    },
    en: {
      title: "Subscription terms",
      intro: `You may cancel your free trial or subscription anytime by turning off auto-renewal. To avoid being charged for the next subscription period, you must turn off auto-renewal at least 24 hours before the end of the current subscription period.

You alone can manage your subscription. Note that deleting the app or account does not cancel your subscription.`,
      sections: [
        {
          title: "Automatic Renewal",
          content: `Your subscription will automatically renew for periods of the same length as your initial subscription until we are notified otherwise. You agree that no additional consent is required by you to charge your preferred payment method automatically and on an automatically renewable basis for the subscription.

If you started the subscription or free trial using Google Play, your Google Play account will be automatically renewed and charged for renewal unless auto-renewal is turned off in your Google Play account settings.

If you started the subscription or free trial using Apple's App Store, your Apple ID account will be automatically renewed and charged for renewal unless auto-renewal is turned off in your Apple ID account settings.

If you started the subscription using the payment method on the SkilyApp Website, your subscription will be automatically renewed and your bank account charged for renewal unless auto-renewal is turned off. To turn off auto-renewal, contact us at support@skilyapp.com.`
        },
        {
          title: "Canceling your subscription",
          content: `Canceling your subscription means that auto-renewal will be disabled. You will still have access to all subscription features for the remaining time of your active subscription period.`
        },
        {
          title: "Refunds",
          content: `We provide refunds in accordance with applicable law and our refund policy.

You may request a refund within 14 days of your subscription purchase if the service has not been used or has been used minimally. Refunds for partially used periods are considered on a case-by-case basis.

To request a refund, please contact us at support@skilyapp.com with the reason for your refund request. We will review your request within 5 business days.

Refunds will be processed using the same payment method used for the original purchase.`
        },
        {
          title: "Pricing and Price Increases",
          content: `The pricing for all paid subscriptions is listed on the SkilyApp Platform or within your account. Additionally, SkilyApp may increase the price of any paid subscriptions at our discretion and we reserve the right to do so at any time. In the event of a price increase, SkilyApp shall notify you and you will have the chance to accept or reject any price increase.`
        },
        {
          title: "Amendments",
          content: `We may amend these Subscription Terms from time to time. When we amend these Subscription Terms, we will update this page and indicate the date that it was last modified or we may email you. You may refuse to agree to the amendments, but if you do, you must immediately cease using our Platform.`
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
            <strong>{language === 'ru' ? 'Адрес:' : language === 'es' ? 'Dirección:' : 'Address:'}</strong> Россия, Москва, Сити 122
          </p>
        </div>
      </div>
    </Layout>
  );
}



