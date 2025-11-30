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
          content: `Пользователи могут быть обязаны зарегистрироваться перед использованием или доступом к Платформе. Ваша информация будет собираться и раскрываться в соответствии с нашей Политикой конфиденциальности. Все пользователи обязаны предоставлять правдивую, актуальную и точную информацию при регистрации на нашей Платформе. Мы оставляем за собой право проверять все учетные данные пользователей и отклонять любых пользователей. Вы несете полную ответственность за сохранение конфиденциальности пароля и аккаунта и за любую и всю деятельность, происходящую под вашим аккаунтом. Вы соглашаетесь немедленно уведомить Sdadim о любом несанкционированном использовании вашего аккаунта или любом другом нарушении безопасности. Sdadim не несет ответственности за любые убытки, которые вы понесете в результате использования кем-либо другого вашего пароля или аккаунта, с вашим ведением или без него.`
        },
        {
          title: "3. Возрастные ограничения",
          content: `Пользователи должны быть не моложе 13 лет для регистрации и использования нашей Платформы. Если вам от 13 до 18 лет, вы должны получить согласие ваших родителей или опекунов для продолжения использования предоставляемых услуг и согласия с настоящим Соглашением от вашего имени.`
        },
        {
          title: "4. Доступ",
          content: `После регистрации и надлежащей оплаты нашей Платформы, где требуется, мы предоставим вам доступ к Платформе в соответствии с настоящим Соглашением. Если вы загружаете или устанавливаете любую часть Платформы, мы предоставляем вам отзывную, ограниченную, непередаваемую и неисключительную лицензию. Каждое устройство, на которое вы загружаете нашу Платформу, может содержать только одну копию Платформы. Все права, которые явно не предоставлены, зарезервированы за Sdadim. Если вы нарушите настоящее Соглашение, ваш доступ к использованию нашей Платформы может быть прекращен по нашему усмотрению. Кроме того, мы можем отозвать ваш доступ к нашей Платформе, если мы считаем, что ваши действия могут нанести вред нам, нашим деловым интересам или правам третьих лиц.`
        },
        {
          title: "5. Права собственности на Платформу",
          content: `Вы признаете, что структура, организация и код Платформы, любых размещенных сервисов и всех связанных программных компонентов являются собственностью Sdadim и/или лицензиаров Sdadim, и что Sdadim и/или его лицензиары сохраняют исключительное право собственности на Платформу, любую документацию, информацию и все другие права интеллектуальной собственности, относящиеся к Платформе, включая все модификации, копии, улучшения, производные работы и другое программное обеспечение и материалы, разработанные Sdadim в соответствии с настоящим Соглашением. Вы не должны продавать, копировать, воспроизводить, передавать, публиковать, раскрывать, отображать или иным образом предоставлять Платформу, доступ к Платформе или любые части Платформы, включая любые модификации, улучшения, производные работы и другое программное обеспечение и материалы, разработанные Sdadim в соответствии с настоящим Соглашением, другим лицам в нарушение настоящего Соглашения. Вы не должны удалять какие-либо проприетарные, авторские, товарные знаки или знаки обслуживания с любой части Платформы, включая любые модификации, улучшения, производные работы и другое программное обеспечение и материалы, разработанные Sdadim.`
        },
        {
          title: "6. Платформа и Сервисы",
          content: `Платформа Sdadim может предлагать услуги ("Сервисы Sdadim") пользователям Платформы. Вы можете использовать Платформу и любые связанные Сервисы Sdadim исключительно в соответствии с разрешениями Sdadim. Пожалуйста, имейте в виду, что любые Сервисы Sdadim предоставляются "как есть" и "как доступно". Мы оставляем за собой право изменять, модифицировать, обновлять или удалять Платформу или любые Сервисы Sdadim в любое время по нашему усмотрению. Мы оставляем за собой право прекращать ранее предлагаемые функции или функциональность по нашему единоличному усмотрению и без предварительного уведомления. Мы не несем ответственности перед вами или любой третьей стороной за любые изменения, приостановку или прекращение любой функции или компонента любой части Платформы или Сервисов Sdadim. Мы оставляем за собой право определять время и содержание обновлений программного обеспечения, которые могут быть автоматически загружены и установлены Платформой без уведомления вас. Мы можем проводить такие модификации нашей Платформы по соображениям безопасности, интеллектуальной собственности, правовым причинам или различным другим причинам по нашему усмотрению, и мы не обязаны объяснять такие модификации или предоставлять вам доступ к предыдущим версиям нашей Платформы. Sdadim не несет ответственности перед вами или любой третьей стороной в случае, если Sdadim осуществляет эти права.`
        },
        {
          title: "7. Конфиденциальность пользователей",
          content: `Мы ценим вашу конфиденциальность и понимаем ваши опасения по поводу конфиденциальности. Наша Политика конфиденциальности включена в настоящее Соглашение и регулирует вашу передачу информации на нашу Платформу. Пожалуйста, ознакомьтесь с нашей Политикой конфиденциальности, чтобы понять наши практики конфиденциальности. Вся информация, которую мы собираем, подпадает под нашу Политику конфиденциальности, и используя Платформу, вы соглашаетесь со всеми действиями, предпринятыми нами в отношении вашей информации в соответствии с Политикой конфиденциальности.`
        },
        {
          title: "8. Использование Платформы",
          content: `При использовании нашей Платформы вы несете ответственность за свое использование Платформы. Вы соглашаетесь со следующим:

* Вы не можете копировать, распространять, получать доступ или раскрывать любую часть Платформы любым способом, включая без ограничения любое автоматизированное или неавтоматизированное "скрапирование" или несанкционированное использование серверного API;
* Вы не можете пытаться вмешиваться, нарушать целостность или безопасность системы, или расшифровывать любые передачи на серверы или с серверов, работающих на Платформе;
* Вы не можете использовать любого робота, паука, краулера, скрапера или другие автоматизированные средства или интерфейсы, не предоставленные нами, для доступа к Платформе или извлечения данных;
* Вы не можете использовать автоматизированных ботов или другое программное обеспечение для отправки большего количества сообщений через нашу Платформу, чем это возможно для человека;
* Вы не можете использовать Платформу на компьютере, который используется для управления ядерными объектами, системами жизнеобеспечения или другими критически важными приложениями, где может быть поставлена под угрозу жизнь или собственность;
* Вы не можете декомпилировать, выполнять обратную разработку, разбирать, изменять, сдавать в аренду, продавать, сдавать в лизинг, одалживать, распространять или создавать производные работы или улучшения Платформы или любой ее части;
* Вы не можете получать доступ к нашей Платформе в попытке создать аналогичный или другой конкурирующий продукт;
* Вы не можете использовать Платформу незаконным образом;
* Вы не можете предпринимать какие-либо действия, которые налагают или могут наложить, по нашему единоличному усмотрению, необоснованную или непропорционально большую нагрузку на нашу инфраструктуру;
* Вы не можете собирать или извлекать любую личную идентифицируемую информацию, включая имена аккаунтов, за исключением случаев, когда это разрешено, с Платформы;
* Вы не можете нарушать или посягать на интеллектуальную собственность других людей, конфиденциальность или другие договорные права при использовании нашей Платформы;
* Вы не можете нарушать любые требования, процедуры, политики или правила сетей, подключенных к Sdadim;
* Вы не можете продавать, сдавать в аренду, одалживать, распространять, передавать или сублицензировать Платформу или доступ к ней или получать доход от использования или предоставления Платформы, если это не разрешено функциональностью нашей Платформы;
* Вы не можете вмешиваться или нарушать работу Платформы;
* Вы соглашаетесь не использовать Платформу любым способом, который является: вводящим в заблуждение, незаконным, клеветническим, непристойным, навязчивым, угрожающим или преследующим;
* Вы соглашаетесь, что не будете возлагать на Sdadim ответственность за ваше использование нашей Платформы; и
* Вы соглашаетесь не вызывать или способствовать нарушению, уничтожению, манипулированию, удалению, отключению или ухудшению любой части нашей Платформы.`
        },
        {
          title: "9. Подписки и платежи",
          content: `Некоторые функции Платформы могут требовать оплаты подписки. Вы соглашаетесь оплачивать все сборы, связанные с вашей подпиской. Подписки автоматически продлеваются на периоды той же длины, что и ваша первоначальная подписка, до тех пор, пока мы не получим уведомление об ином.`
        },
        {
          title: "10. Возврат средств за подписку",
          content: `Мы хотим, чтобы вы были довольны Сервисами Sdadim; однако возврат средств не будет разрешен после начала вашей платной подписки. Если у вас есть вопросы относительно подписки или наших политик, пожалуйста, свяжитесь с нами.`
        },
        {
          title: "11. Цены и повышение цен",
          content: `Цены на все платные подписки указаны на платформе Sdadim или в вашем аккаунте. Кроме того, Sdadim может повысить цену любых платных подписок по своему усмотрению, и мы оставляем за собой право делать это в любое время. В случае повышения цены Sdadim уведомит вас, и у вас будет возможность принять или отклонить повышение цены. Пожалуйста, уведомите нас, если вы намерены отклонить повышение цены. Если вы отклонили повышение цены, ваш доступ к Платформе может быть немедленно прекращен по нашему усмотрению. Вы соглашаетесь, что Sdadim не обязана предлагать какие-либо услуги по цене, первоначально предложенной вам при регистрации.`
        },
        {
          title: "12. Разделимость",
          content: `В случае, если какое-либо положение настоящего Соглашения будет признано незаконным, противоречащим другому положению Соглашения или иным образом не имеющим силы, Соглашение останется в силе, как если бы оно было заключено без включения этого недействительного положения.

Если два или более положений настоящего Соглашения или любого другого соглашения, которое у вас может быть с Sdadim, считаются противоречащими друг другу, Sdadim имеет исключительное право выбрать, какое положение остается в силе.`
        },
        {
          title: "13. Неотказ от прав",
          content: `Мы оставляем за собой все права, предоставленные нам в соответствии с настоящим Соглашением, а также в соответствии с положениями любого применимого законодательства. Наше неприменение какого-либо конкретного положения или положений настоящего Соглашения или любого применимого законодательства не должно толковаться как наш отказ от права применять это же положение в тех же или иных обстоятельствах в любое время в будущем.`
        },
        {
          title: "14. Передача прав и выживание",
          content: `Вы не можете передавать свои права и/или обязательства по настоящему Соглашению какой-либо другой стороне без нашего предварительного письменного согласия. Мы можем передать наши права и/или обязательства по настоящему Соглашению любой другой стороне по нашему усмотрению. Все части настоящего Соглашения, которые разумно считаются сохраняющими силу после прекращения действия, сохраняют силу и остаются в полной силе после прекращения действия.`
        },
        {
          title: "15. Изменения",
          content: `Мы можем изменять настоящее Соглашение время от времени. Когда мы изменяем настоящее Соглашение, мы обновим эту страницу и укажем дату последнего изменения или можем отправить вам электронное письмо. Вы можете отказаться согласиться с изменениями, но если вы это сделаете, вы должны немедленно прекратить использование нашей Платформы.`
        },
        {
          title: "16. Проблемы с Платформой",
          content: `Если у вас есть какие-либо вопросы, проблемы или если у вас возникли трудности с доступом или использованием Платформы, пожалуйста, свяжитесь с нами по адресу support@skilyapp.com.`
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
          content: `Los usuarios pueden estar obligados a registrarse antes de usar o acceder a la Plataforma. Su información será recopilada y divulgada de acuerdo con nuestra Política de Privacidad. Todos los usuarios están obligados a proporcionar información veraz, actualizada y precisa al registrarse en nuestra Plataforma. Nos reservamos el derecho de verificar todas las credenciales de usuario y rechazar cualquier usuario. Usted es completamente responsable de mantener la confidencialidad de la contraseña y la cuenta y de todas las actividades que ocurran bajo su cuenta. Usted acepta notificar inmediatamente a Sdadim sobre cualquier uso no autorizado de su cuenta o cualquier otra violación de seguridad. Sdadim no será responsable de ninguna pérdida que incurra como resultado del uso de su contraseña o cuenta por parte de otra persona, con o sin su conocimiento.`
        },
        {
          title: "3. Límites de edad",
          content: `Los usuarios deben tener al menos 13 años de edad para registrarse y usar nuestra Plataforma. Si tiene entre 13 y 18 años, debe tener el consentimiento de sus padres o tutores para continuar usando los servicios proporcionados y aceptar este Acuerdo en su nombre.`
        },
        {
          title: "4. Acceso",
          content: `Después de registrarse y pagar adecuadamente nuestra Plataforma, cuando sea necesario, le otorgaremos acceso a la Plataforma de acuerdo con este Acuerdo. Donde descargue o instale cualquier parte de la Plataforma, le otorgamos una licencia revocable, limitada, no transferible y no exclusiva. Cada dispositivo en el que descargue nuestra Plataforma solo puede contener una copia de la Plataforma. Todos los derechos que no se otorgan explícitamente están reservados para Sdadim. Si viola este Acuerdo, su acceso para usar nuestra Plataforma puede ser terminado a nuestra discreción. Además, podemos revocar su acceso a nuestra Plataforma si creemos que sus acciones pueden dañarnos, nuestros intereses comerciales o los derechos de terceros.`
        },
        {
          title: "5. Propiedad de la Plataforma",
          content: `Usted reconoce que la estructura, organización y código de la Plataforma, cualquier servicio alojado y todos los componentes de software relacionados son propiedad de Sdadim y/o licenciatarios de Sdadim, y que Sdadim y/o sus licenciatarios conservan la propiedad exclusiva de la Plataforma, cualquier documentación, información y todos los demás derechos de propiedad intelectual relacionados con la Plataforma, incluidas todas las modificaciones, copias, mejoras, derivados y otro software y materiales desarrollados por Sdadim bajo este Acuerdo. No debe vender, copiar, reproducir, transferir, publicar, divulgar, mostrar o poner a disposición de otros la Plataforma, el acceso a la Plataforma o cualquier parte de la Plataforma, incluidas las modificaciones, mejoras, derivados y otro software y materiales desarrollados por Sdadim bajo este Acuerdo, a otros en violación de este Acuerdo. No debe eliminar ninguna leyenda de propiedad, derechos de autor, marca registrada o marca de servicio de ninguna parte de la Plataforma, incluidas las modificaciones, mejoras, derivados y otro software y materiales desarrollados por Sdadim.`
        },
        {
          title: "6. Plataforma y Servicios",
          content: `La Plataforma Sdadim puede ofrecer servicios ("Servicios Sdadim") a los usuarios de la Plataforma. Usted puede usar la Plataforma y cualquier Servicio Sdadim asociado únicamente según lo permitido por Sdadim. Tenga en cuenta que cualquier Servicio Sdadim se proporciona "tal cual" y "según disponibilidad". Nos reservamos el derecho de alterar, modificar, actualizar o eliminar la Plataforma o cualquier Servicio Sdadim en cualquier momento a nuestra discreción. Nos reservamos el derecho de discontinuar funciones o funcionalidades previamente ofrecidas a nuestra sola discreción y sin previo aviso. No somos responsables ante usted o cualquier tercero por cualquier modificación, suspensión o discontinuación de cualquier función o componente de cualquier parte de la Plataforma o los Servicios Sdadim. Nos reservamos el derecho de determinar el momento y el contenido de las actualizaciones de software, que pueden descargarse e instalarse automáticamente por la Plataforma sin previo aviso. Podemos realizar tales modificaciones a nuestra Plataforma por razones de seguridad, propiedad intelectual, razones legales o varias otras razones a nuestra discreción, y no estamos obligados a explicar tales modificaciones o proporcionarle acceso a versiones anteriores de nuestra Plataforma. Sdadim no tendrá responsabilidad ante usted o cualquier tercero en el caso de que Sdadim ejerza estos derechos.`
        },
        {
          title: "7. Privacidad del usuario",
          content: `Valoramos su privacidad y entendemos sus preocupaciones de privacidad. Nuestra Política de Privacidad está incorporada en este Acuerdo y rige su envío de información a nuestra Plataforma. Por favor, revise nuestra Política de Privacidad para que pueda entender nuestras prácticas de privacidad. Toda la información que recopilamos está sujeta a nuestra Política de Privacidad, y al usar la Plataforma usted consiente todas las acciones tomadas por nosotros con respecto a su información en cumplimiento de la Política de Privacidad.`
        },
        {
          title: "8. Uso de la Plataforma",
          content: `Al usar nuestra Plataforma, usted es responsable de su uso de la Plataforma. Usted acepta lo siguiente:

* No puede copiar, distribuir, acceder o divulgar ninguna parte de la Plataforma de ninguna manera, incluido sin limitación cualquier "scraping" automatizado o no automatizado o uso no autorizado del servidor API;
* No puede intentar interferir, comprometer la integridad o seguridad del sistema, o descifrar cualquier transmisión hacia o desde los servidores que ejecutan la Plataforma;
* No puede usar ningún robot, araña, rastreador, raspador u otros medios automatizados o interfaz no proporcionados por nosotros para acceder a la Plataforma o extraer datos;
* No puede usar bots automatizados u otro software para enviar más mensajes a través de nuestra Plataforma de lo que es humanamente posible;
* No puede usar la Plataforma en una computadora que se usa para operar instalaciones nucleares, soporte vital u otras aplicaciones críticas donde la vida o la propiedad pueden estar en riesgo;
* No puede descompilar, realizar ingeniería inversa, desmontar, modificar, alquilar, vender, arrendar, prestar, distribuir o crear trabajos derivados o mejoras de la Plataforma o cualquier parte de ella;
* No puede acceder a nuestra Plataforma en un intento de crear un producto similar u otro competitivo;
* No puede usar la Plataforma de manera ilegal;
* No puede tomar ninguna acción que imponga, o pueda imponer a nuestra sola discreción, una carga irrazonable o desproporcionadamente grande en nuestra infraestructura;
* No puede recopilar o cosechar información personalmente identificable, incluidos los nombres de cuenta, excepto donde esté permitido, de la Plataforma;
* No puede violar o infringir la propiedad intelectual de otras personas, la privacidad u otros derechos contractuales mientras usa nuestra Plataforma;
* No puede violar ningún requisito, procedimiento, política o regulación de las redes conectadas a Sdadim;
* No puede vender, arrendar, prestar, distribuir, transferir o sublicenciar la Plataforma o el acceso a ella o derivar ingresos del uso o provisión de la Plataforma a menos que esté habilitado a través de la funcionalidad de nuestra Plataforma;
* No puede interferir o interrumpir la Plataforma;
* Usted acepta no usar la Plataforma de ninguna manera que sea: engañosa, ilegal, difamatoria, obscena, invasiva, amenazante o acosadora;
* Usted acepta que no responsabilizará a Sdadim por su uso de nuestra Plataforma; y
* Usted acepta no causar, o ayudar en, la interrupción, destrucción, manipulación, eliminación, desactivación o deterioro de cualquier parte de nuestra Plataforma.`
        },
        {
          title: "9. Suscripciones y pagos",
          content: `Algunas funciones de la Plataforma pueden requerir el pago de una suscripción. Usted acepta pagar todas las tarifas asociadas con su suscripción. Las suscripciones se renuevan automáticamente por períodos de la misma duración que su suscripción inicial hasta que se nos notifique lo contrario.`
        },
        {
          title: "10. Reembolsos por suscripción",
          content: `Queremos que esté satisfecho con los Servicios Sdadim; sin embargo, no se permitirán reembolsos después del inicio de su suscripción de pago. Si tiene alguna pregunta sobre la suscripción o nuestras políticas, póngase en contacto con nosotros.`
        },
        {
          title: "11. Precios y aumentos de precios",
          content: `Los precios de todas las suscripciones de pago se enumeran en la plataforma Sdadim o dentro de su cuenta. Además, Sdadim puede aumentar el precio de cualquier suscripción de pago a nuestra discreción y nos reservamos el derecho de hacerlo en cualquier momento. En caso de aumento de precio, Sdadim le notificará y tendrá la oportunidad de aceptar o rechazar cualquier aumento de precio. Por favor, notifíquenos si tiene la intención de rechazar un aumento de precio. Si ha rechazado un aumento de precio, su acceso a la Plataforma puede ser terminado inmediatamente a nuestra discreción. Usted acepta que Sdadim no tiene obligación de ofrecer ningún servicio por el precio originalmente ofrecido en el registro.`
        },
        {
          title: "12. Divisibilidad",
          content: `En el caso de que una disposición de este Acuerdo se encuentre ilegal, en conflicto con otra disposición del Acuerdo, o de otra manera inaplicable, el Acuerdo permanecerá en vigor como si se hubiera celebrado sin incluir esa disposición inaplicable.

Si dos o más disposiciones de este Acuerdo o cualquier otro acuerdo que pueda tener con Sdadim se consideran en conflicto entre sí, Sdadim tendrá el derecho exclusivo de elegir qué disposición permanece en vigor.`
        },
        {
          title: "13. No renuncia",
          content: `Nos reservamos todos los derechos permitidos bajo este Acuerdo, así como bajo las disposiciones de cualquier ley aplicable. Nuestra falta de aplicación de cualquier disposición o disposiciones particulares de este Acuerdo o cualquier ley aplicable no debe interpretarse como nuestra renuncia al derecho de hacer cumplir esa misma disposición bajo las mismas o diferentes circunstancias en cualquier momento en el futuro.`
        },
        {
          title: "14. Asignación y supervivencia",
          content: `No puede asignar sus derechos y/o obligaciones bajo este Acuerdo a ninguna otra parte sin nuestro consentimiento previo por escrito. Podemos asignar nuestros derechos y/o obligaciones bajo este Acuerdo a cualquier otra parte a nuestra discreción. Todas las partes de este Acuerdo que razonablemente se cree que sobreviven a la terminación sobrevivirán y permanecerán en pleno vigor tras la terminación.`
        },
        {
          title: "15. Enmiendas",
          content: `Podemos modificar este Acuerdo de vez en cuando. Cuando modifiquemos este Acuerdo, actualizaremos esta página e indicaremos la fecha en que fue modificado por última vez o podemos enviarle un correo electrónico. Puede rechazar aceptar las modificaciones, pero si lo hace, debe cesar inmediatamente de usar nuestra Plataforma.`
        },
        {
          title: "16. Problemas con la Plataforma",
          content: `Si tiene alguna pregunta, problema o si tiene dificultades para acceder o usar la Plataforma, póngase en contacto con nosotros en support@skilyapp.com.`
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
          content: `Users may be required to register prior to using or accessing the Platform. Your information will be collected and disclosed in accordance with our Privacy Policy. All users are required to provide truthful, up-to-date, and accurate information when registering for our Platform. We reserve the right to verify all user credentials and to reject any users. You are entirely responsible for maintaining the confidentiality of password and account and for any and all activities that occur under your account. You agree to notify Sdadim immediately of any unauthorized use of your account or any other breach of security. Sdadim will not be liable for any losses you incur as a result of someone else using your password or account, either with or without your knowledge.`
        },
        {
          title: "3. Age Limits",
          content: `Users must be 13 years of age or older to register and use our Platform. If you are between the age of 13 and under 18 you must have your parent(s) or guardian(s) consent to continue using the services provided and agree to this Agreement on your behalf.`
        },
        {
          title: "4. Access",
          content: `After registering and properly paying for our Platform, where required, we shall grant you access to the Platform as permitted by us and in accordance with this Agreement. Where you download or install any portion of the Platform, we grant you a revocable, limited, non-transferable, and non-exclusive license. Each device you download our Platform may only contain one copy of the Platform. All rights not explicitly granted are reserved for Sdadim. If you breach this Agreement, your access to use our Platform may be terminated at our discretion. Additionally, we may revoke your access to our Platform if we believe that your actions may harm us, our business interests, or any third party rights.`
        },
        {
          title: "5. Platform Ownership",
          content: `You acknowledge that the structure, organization, and code of the Platform, any hosted services, and all related software components are proprietary to Sdadim and/or Sdadim' licensors and that Sdadim and/or its licensors retains exclusive ownership of the Platform, any documentation, information and any and all other intellectual property rights relating to the Platform, including all modifications, copies, enhancements, derivatives, and other software and materials developed hereunder by Sdadim. You shall not sell, copy, reproduce, transfer, publish, disclose, display or otherwise make available the Platform, access to the Platform, or any portions of the Platform including any modifications, enhancements, derivatives, and other software and materials developed hereunder by Sdadim to others in violation of this Agreement. You shall not remove any proprietary, copyright, trademark, or service mark legend from any portion of any of the Platform, including any modifications, enhancements, derivatives, and other software and materials developed by Sdadim.`
        },
        {
          title: "6. Platform and Services",
          content: `The Sdadim Platform may offer services ("Sdadim Services") to users of the Platform. You may use the Platform and any associated Sdadim Services solely as permitted by Sdadim. Please be aware that any Sdadim Services are "as-is" and "as-available". We reserve the right to alter, modify, update, or remove the Platform or any Sdadim Services, at any time at our discretion. We reserve the right to discontinue previously offered features or functionality at our sole discretion and without prior notice. We are not liable to you or to any third party for any modification, suspension, or discontinuance of any feature or component of any portion of the Platform or the Sdadim Services. We reserve the right to determine the timing and content of software updates, which may be automatically downloaded and installed by the Platform without notice to you. We may conduct such modifications to our Platform for security reasons, intellectual property, legal reasons, or various other reasons at our discretion, and we are not required to explain such modifications or provide you access to previous versions of our Platform. Sdadim shall have no liability to you or any third party in the event that Sdadim exercises these rights.`
        },
        {
          title: "7. User Privacy",
          content: `We value your privacy and understand your privacy concerns. Our Privacy Policy is incorporated into this Agreement, and it governs your submission of information to our Platform. Please review our Privacy Policy so that you may understand our privacy practices. All information we collect is subject to our Privacy Policy, and by using the Platform you consent to all actions taken by us with respect to your information in compliance with the Privacy Policy.`
        },
        {
          title: "8. Use of the Platform",
          content: `When using our Platform, you are responsible for your use of the Platform. You agree to the following:

* You may not copy, distribute, access, or disclose any part of the Platform in any medium, including without limitation by any automated or non-automated "scraping" or unauthorized use of the server API;
* You may not attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Platform;
* You may not use any robot, spider, crawler, scraper or other automated means or interface not provided by us to access the Platform or to extract data;
* You may not use automated bots or other software to send more messages through our Platform than humanly possible;
* You may not use the Platform on a computer that is used to operate nuclear facilities, life support, or other mission critical applications where life or property may be at stake;
* You may not decompile, reverse engineer, disassemble, modify, rent, sell, lease, loan, distribute, or create derivative works or improvements to the Platform or any portion of it;
* You may not access our Platform in an attempt to build a similar or other competitive product;
* You may not use the Platform in an unlawful manner;
* You may not take any action that imposes, or may impose at our sole discretion, an unreasonable or disproportionately large load on our infrastructure;
* You may not collect or harvest any personally identifiable information, including account names, except where permitted, from the Platform;
* You may not violate or infringe other people's intellectual property, privacy, or other contractual rights while using our Platform;
* You may not violate any requirements, procedures, policies or regulations of networks connected to Sdadim;
* You may not sell, lease, loan, distribute, transfer, or sublicense the Platform or access to it or derive income from the use or provision of the Platform unless enabled through the functionality of our Platform;
* You may not interfere with or disrupt the Platform;
* You agree not to use the Platform in any way that is: misleading, unlawful, defamatory, obscene, invasive, threatening, or harassing;
* You agree that you will not hold Sdadim responsible for your use of our Platform; and
* You agree not to cause, or aid in, the disruption, destruction, manipulation, removal, disabling, or impairment of any portion of our Platform.`
        },
        {
          title: "9. Subscriptions and Payments",
          content: `Some features of the Platform may require payment of a subscription. You agree to pay all fees associated with your subscription. Subscriptions automatically renew for periods of the same length as your initial subscription until we are notified otherwise.`
        },
        {
          title: "10. Refunds for Subscription",
          content: `We want you to be satisfied with the Sdadim Services; however, no refunds will be permitted after the start of your paid subscription. If you have any questions regarding the subscription or our policies, please contact us.`
        },
        {
          title: "11. Pricing and Price Increases",
          content: `The pricing for all paid subscriptions is listed on the Sdadim Platform or within your account. Additionally, Sdadim may increase the price of any paid subscriptions at our discretion and we reserve the right to do so at any time. In the event of a price increase, Sdadim shall notify you and you will have the chance to accept or reject any price increase. Please notify us if you intend to reject a price increase. Where you have rejected a price increase, your access to the Platform may be terminated immediately at our discretion. You agree that Sdadim has no obligation to offer any services for the price originally offered to you at sign up.`
        },
        {
          title: "12. Severability",
          content: `In the event that a provision of this Agreement is found to be unlawful, conflicting with another provision of the Agreement, or otherwise unenforceable, the Agreement will remain in force as though it had been entered into without that unenforceable provision being included in it.

If two or more provisions of this Agreement or any other agreement you may have with Sdadim are deemed to conflict with each other's operation, Sdadim shall have the sole right to elect which provision remains in force.`
        },
        {
          title: "13. Non-Waiver",
          content: `We reserve all rights permitted to us under this Agreement as well as under the provisions of any applicable law. Our non-enforcement of any particular provision or provisions of this Agreement or any applicable law should not be construed as our waiver of the right to enforce that same provision under the same or different circumstances at any time in the future.`
        },
        {
          title: "14. Assignment and Survival",
          content: `You may not assign your rights and/or obligations under this Agreement to any other party without our prior written consent. We may assign our rights and/or obligations under this Agreement to any other party at our discretion. All portions of this Agreement that would reasonably be believed to survive termination shall survive and remain in full force upon termination.`
        },
        {
          title: "15. Amendments",
          content: `We may amend this Agreement from time to time. When we amend this Agreement, we will update this page and indicate the date that it was last modified or we may email you. You may refuse to agree to the amendments, but if you do, you must immediately cease using our Platform.`
        },
        {
          title: "16. Platform Issues",
          content: `Where you have any questions, issues, or if you are having trouble accessing or using the Platform, please contact us at support@skilyapp.com.`
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

