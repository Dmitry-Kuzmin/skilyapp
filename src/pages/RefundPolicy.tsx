import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RefundPolicy() {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: "Политика возврата средств",
      lastModified: "Последнее обновление: 30 ноября 2025",
      intro: `Настоящая Политика возврата средств применяется ко всем покупкам, совершенным через платформу SkilyApp.`,
      sections: [
        {
          title: "Право на возврат",
          content: `Вы можете запросить возврат средств в течение 14 дней с момента покупки подписки или разового продукта, если услуга не была использована или использована минимально.

Возврат средств за частично использованные периоды рассматривается индивидуально в зависимости от обстоятельств.`
        },
        {
          title: "Как запросить возврат",
          content: `Для запроса возврата средств свяжитесь с нами по адресу support@skilyapp.com с указанием:

- Номера транзакции или идентификатора покупки
- Причины возврата
- Даты покупки

Мы рассмотрим ваш запрос в течение 5 рабочих дней и свяжемся с вами для уточнения деталей.`
        },
        {
          title: "Обработка возврата",
          content: `После одобрения возврата средств:

- Возврат производится тем же способом, которым была совершена оплата
- Срок обработки возврата: 5-10 рабочих дней
- Вы получите уведомление на email после обработки возврата`
        },
        {
          title: "Исключения",
          content: `Возврат средств может быть отклонен в следующих случаях:

- Услуга была использована в значительной степени
- Прошло более 14 дней с момента покупки
- Нарушение условий использования сервиса
- Мошеннические действия`
        },
        {
          title: "Контакты",
          content: `По всем вопросам, связанным с возвратом средств, обращайтесь:

Email: support@skilyapp.com
Время ответа: в течение 5 рабочих дней`
        }
      ]
    },
    es: {
      title: "Política de reembolso",
      lastModified: "Última actualización: 30 de noviembre de 2025",
      intro: `Esta Política de Reembolso se aplica a todas las compras realizadas a través de la plataforma SkilyApp.`,
      sections: [
        {
          title: "Derecho de reembolso",
          content: `Puede solicitar un reembolso dentro de los 14 días posteriores a la compra de una suscripción o producto único, si el servicio no ha sido utilizado o ha sido utilizado mínimamente.

Los reembolsos por períodos parcialmente utilizados se consideran caso por caso según las circunstancias.`
        },
        {
          title: "Cómo solicitar un reembolso",
          content: `Para solicitar un reembolso, contáctenos en support@skilyapp.com indicando:

- Número de transacción o ID de compra
- Razón del reembolso
- Fecha de compra

Revisaremos su solicitud dentro de 5 días hábiles y nos pondremos en contacto con usted para aclarar los detalles.`
        },
        {
          title: "Procesamiento del reembolso",
          content: `Después de aprobar el reembolso:

- El reembolso se procesa utilizando el mismo método de pago utilizado para la compra original
- Tiempo de procesamiento: 5-10 días hábiles
- Recibirá una notificación por email después del procesamiento del reembolso`
        },
        {
          title: "Excepciones",
          content: `El reembolso puede ser rechazado en los siguientes casos:

- El servicio ha sido utilizado significativamente
- Han pasado más de 14 días desde la compra
- Violación de los términos de uso del servicio
- Actividades fraudulentas`
        },
        {
          title: "Contacto",
          content: `Para cualquier pregunta relacionada con reembolsos, contáctenos:

Email: support@skilyapp.com
Tiempo de respuesta: dentro de 5 días hábiles`
        }
      ]
    },
    en: {
      title: "Refund Policy",
      lastModified: "Last updated: November 30, 2025",
      intro: `This Refund Policy applies to all purchases made through the SkilyApp platform.`,
      sections: [
        {
          title: "Right to Refund",
          content: `You may request a refund within 14 days of purchasing a subscription or one-time product if the service has not been used or has been used minimally.

Refunds for partially used periods are considered on a case-by-case basis depending on the circumstances.`
        },
        {
          title: "How to Request a Refund",
          content: `To request a refund, contact us at support@skilyapp.com with:

- Transaction number or purchase ID
- Reason for refund
- Purchase date

We will review your request within 5 business days and contact you to clarify details.`
        },
        {
          title: "Refund Processing",
          content: `After approving a refund:

- Refund is processed using the same payment method used for the original purchase
- Processing time: 5-10 business days
- You will receive an email notification after the refund is processed`
        },
        {
          title: "Exceptions",
          content: `Refunds may be declined in the following cases:

- Service has been used significantly
- More than 14 days have passed since purchase
- Violation of service terms of use
- Fraudulent activities`
        },
        {
          title: "Contact",
          content: `For any questions related to refunds, contact us:

Email: support@skilyapp.com
Response time: within 5 business days`
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
            <strong>{language === 'ru' ? 'Контакты:' : language === 'es' ? 'Contacto:' : 'Contact:'}</strong> support@skilyapp.com
          </p>
        </div>
      </div>
    </Layout>
  );
}

