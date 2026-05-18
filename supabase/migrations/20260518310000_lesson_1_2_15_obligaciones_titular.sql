-- Lección 1.2.15 — Obligaciones del titular del vehículo
-- Module id: bef4ce90-5902-49d1-a082-173faeefda12

DO $$
DECLARE
  mod_id  uuid := 'bef4ce90-5902-49d1-a082-173faeefda12';
  l_id    uuid;
BEGIN

  INSERT INTO course_lessons
    (module_id, code, title_es, title_ru, order_index, xp_reward, is_premium)
  VALUES
    (mod_id, '1.2.15',
     'Obligaciones del titular del vehículo',
     'Обязанности владельца транспортного средства',
     22, 25, false)
  RETURNING id INTO l_id;

  -- ── Step 1 · Theory — Deber de conservación del vehículo ─────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 1, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Titular vs conductor","text":"El TITULAR es la persona que figura como propietaria del vehículo en el Registro de Vehículos. El CONDUCTOR es quien lo conduce en un momento determinado. Pueden ser la misma persona o personas distintas. Las obligaciones del titular son independientes de las del conductor."},
      {"type":"callout","variant":"info","title":"Deber de conservación","text":"El titular del vehículo está obligado a mantenerlo en las condiciones técnicas reglamentarias en todo momento: ITV en vigor, seguro obligatorio en vigor, documentación al día, y todos los sistemas de seguridad en correcto funcionamiento."},
      {"type":"list","style":"check","title":"Obligaciones de mantenimiento","items":[
        "Pasar la ITV en los plazos establecidos",
        "Mantener el seguro obligatorio de responsabilidad civil vigente",
        "Conservar la documentación del vehículo actualizada",
        "Asegurarse de que los frenos, luces, neumáticos y sistemas de seguridad funcionan correctamente"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Владелец vs водитель","text":"ВЛАДЕЛЕЦ — лицо, зарегистрированное как собственник транспортного средства в Реестре транспортных средств. ВОДИТЕЛЬ — тот, кто управляет им в данный момент. Это могут быть одно и то же лицо или разные люди. Обязанности владельца независимы от обязанностей водителя."},
      {"type":"callout","variant":"info","title":"Обязанность по техобслуживанию","text":"Владелец транспортного средства обязан постоянно поддерживать его в нормативном техническом состоянии: действующий техосмотр (ITV), действующая обязательная страховка, актуальные документы и все системы безопасности в исправном состоянии."},
      {"type":"list","style":"check","title":"Обязательства по обслуживанию","items":[
        "Проходить технический осмотр (ITV) в установленные сроки",
        "Поддерживать обязательное страхование гражданской ответственности",
        "Хранить актуальную документацию на транспортное средство",
        "Обеспечивать исправность тормозов, фар, шин и систем безопасности"
      ]}
    ]}'
  );

  -- ── Step 2 · Theory — Prohibición de ceder el vehículo sin permiso ───────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 2, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"No permitir conducción sin permiso válido","text":"El titular no puede permitir que conduzca su vehículo una persona que no sea titular de la autorización administrativa (permiso/licencia de conducción) necesaria para ese tipo de vehículo, o que tenga el permiso retirado, suspendido o caducado."},
      {"type":"list","style":"cross","title":"Conductas prohibidas del titular","items":[
        "Dejar el vehículo a quien no tiene carné de conducir",
        "Permitir que conduzca alguien con el carné retirado o suspendido",
        "Ceder el vehículo a un conductor con el permiso caducado",
        "Permitir que un menor sin carné conduzca el vehículo"
      ]},
      {"type":"callout","variant":"warning","text":"El titular que permite conducir a alguien sin permiso es responsable solidario de las consecuencias del accidente que se produzca."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Запрет передавать ТС лицу без действующих прав","text":"Владелец не может разрешить управление своим транспортным средством лицу, не имеющему необходимого административного разрешения (водительского удостоверения) для данного типа ТС, либо у которого оно изъято, приостановлено или просрочено."},
      {"type":"list","style":"cross","title":"Запрещённые действия владельца","items":[
        "Передавать ТС тому, у кого нет водительских прав",
        "Разрешать управление лицу с изъятыми или приостановленными правами",
        "Передавать ТС водителю с просроченными правами",
        "Разрешать несовершеннолетнему без прав управлять ТС"
      ]},
      {"type":"callout","variant":"warning","text":"Владелец, разрешивший управление лицу без прав, несёт солидарную ответственность за последствия возможного ДТП."}
    ]}'
  );

  -- ── Step 3 · Theory — Identificación del conductor infractor ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 3, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Obligación de identificar al conductor infractor","text":"Cuando el vehículo comete una infracción y el titular no era el conductor en ese momento, el titular está OBLIGADO a identificar a la persona que conducía su vehículo cuando se produjo la infracción."},
      {"type":"callout","variant":"warning","title":"Consecuencia de no identificar","text":"Si el titular se niega a identificar al conductor infractor o no puede hacerlo, la infracción y la sanción (incluyendo la pérdida de puntos) recaerán sobre el propio TITULAR, aunque no fuera quien conducía."},
      {"type":"list","style":"check","title":"¿Cómo identificar al conductor?","items":[
        "Indicar nombre completo, DNI/NIE y número de permiso de conducción",
        "El plazo para responder al requerimiento de la DGT es de 15 días hábiles",
        "La identificación puede hacerse por escrito o en comparecencia ante la autoridad"
      ]}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"danger","title":"Обязанность идентифицировать водителя-нарушителя","text":"Если транспортное средство совершило нарушение, а владелец в тот момент не управлял им, владелец ОБЯЗАН установить личность человека, управлявшего его ТС в момент нарушения."},
      {"type":"callout","variant":"warning","title":"Последствия неидентификации","text":"Если владелец отказывается установить личность водителя-нарушителя или не может этого сделать, нарушение и санкция (включая лишение баллов) будут возложены на самого ВЛАДЕЛЬЦА, даже если он не был за рулём."},
      {"type":"list","style":"check","title":"Как идентифицировать водителя?","items":[
        "Указать полное имя, DNI/NIE и номер водительского удостоверения",
        "Срок ответа на запрос DGT — 15 рабочих дней",
        "Идентификация может быть произведена письменно или лично в органах власти"
      ]}
    ]}'
  );

  -- ── Step 4 · Quiz — authored (identificación del infractor) ──────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 4, 'quiz',
    '{"text":"El titular de un vehículo recibe una notificación de infracción, pero en ese momento conducía otra persona. ¿Qué debe hacer el titular?","options":["Pagar la multa él mismo, ya que es el propietario del vehículo.","Identificar a la persona que conducía su vehículo en el momento de la infracción.","Ignorar la notificación, ya que no era él quien conducía."],"correct":1,"explanation":"El titular está obligado a identificar a la persona que conducía su vehículo cuando se produjo la infracción. Si no lo hace o no puede, la sanción recaerá sobre él, aunque no fuera el conductor. El plazo para responder es de 15 días hábiles."}',
    '{"text":"Владелец транспортного средства получает уведомление о нарушении, но в тот момент управлял другой человек. Что должен сделать владелец?","options":["Заплатить штраф самому, так как он собственник ТС.","Идентифицировать человека, управлявшего его ТС в момент нарушения.","Игнорировать уведомление, так как он не был за рулём."],"correct":1,"explanation":"Владелец обязан установить личность человека, управлявшего его транспортным средством в момент нарушения. Если он этого не сделает или не сможет, санкция будет возложена на него, даже если он не был водителем. Срок ответа — 15 рабочих дней."}'
  );

  -- ── Step 5 · Quiz — authored (permitir conducción sin carné) ─────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 5, 'quiz',
    '{"text":"¿Puede el titular de un vehículo dejarlo a una persona cuyo carné de conducir ha sido retirado judicialmente?","options":["Sí, la retirada judicial no afecta al derecho a conducir vehículos particulares.","No, el titular no puede permitir que conduzca quien tiene el permiso retirado o suspendido.","Sí, si solo va a conducir en zonas privadas."],"correct":1,"explanation":"No, el titular no puede permitir que conduzca su vehículo una persona cuyo permiso de conducción ha sido retirado, suspendido o está caducado. El titular es responsable de asegurarse de que quien conduce su vehículo tiene la habilitación legal vigente para ello."}',
    '{"text":"Может ли владелец транспортного средства передать его лицу, у которого водительское удостоверение изъято по решению суда?","options":["Да, судебное изъятие не влияет на право управлять частными автомобилями.","Нет, владелец не может разрешать управление лицу с изъятым или приостановленным удостоверением.","Да, если передвигаться только по частной территории."],"correct":1,"explanation":"Нет, владелец не может разрешать управление своим ТС лицу, чьё водительское удостоверение изъято, приостановлено или просрочено. Владелец несёт ответственность за то, чтобы тот, кто управляет его ТС, имел действующее на это законное разрешение."}'
  );

  -- ── Step 6 · Theory — Conductor habitual y empresa de alquiler ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 6, 'theory',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Conductor habitual","text":"El titular puede designar un conductor habitual del vehículo. En caso de infracción, la notificación puede dirigirse directamente al conductor habitual designado. El titular debe comunicar a la DGT quién es el conductor habitual para que las sanciones se tramiten a nombre correcto."},
      {"type":"callout","variant":"info","title":"Empresas de alquiler (rent-a-car)","text":"Las empresas de arrendamiento de vehículos sin conductor están especialmente obligadas a identificar al conductor del vehículo en el momento de la infracción. Deben conservar los datos del arrendatario y comunicarlos a la DGT cuando sean requeridos."},
      {"type":"callout","variant":"warning","text":"Las empresas de alquiler que no identifiquen al conductor infractor en el plazo establecido pueden recibir la sanción como si fueran ellas las infractoras."}
    ]}',
    '{"blocks":[
      {"type":"callout","variant":"info","title":"Постоянный водитель","text":"Владелец может назначить постоянного водителя транспортного средства. В случае нарушения уведомление может быть направлено напрямую назначенному постоянному водителю. Владелец должен сообщить в DGT, кто является постоянным водителем, чтобы санкции оформлялись на правильное имя."},
      {"type":"callout","variant":"info","title":"Компании по аренде автомобилей (rent-a-car)","text":"Компании по аренде транспортных средств без водителя особенно обязаны идентифицировать водителя ТС в момент нарушения. Они обязаны хранить данные арендатора и передавать их в DGT по запросу."},
      {"type":"callout","variant":"warning","text":"Компании по аренде, не идентифицировавшие водителя-нарушителя в установленный срок, могут получить санкцию как если бы они сами являлись нарушителями."}
    ]}'
  );

  -- ── Step 7 · Theory — Resumen obligaciones del titular (tabla) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 7, 'theory',
    '{"blocks":[
      {"type":"heading","text":"Resumen: obligaciones del titular del vehículo"},
      {"type":"table","headers":["Obligación","Consecuencia de incumplimiento"],"rows":[
        ["Mantener ITV en vigor","Infracción + posible inmovilización"],
        ["Mantener seguro vigente","Infracción muy grave + inmovilización"],
        ["No ceder a conductor sin permiso","Responsabilidad solidaria por daños"],
        ["Identificar al conductor infractor","Sanción recae sobre el titular"],
        ["Empresa alquiler: identificar arrendatario","Sanción como si fuera el infractor"]
      ]},
      {"type":"callout","variant":"warning","text":"Dato de examen: si el titular no identifica al conductor → la sanción (multa + puntos) la recibe el TITULAR aunque no condujera."}
    ]}',
    '{"blocks":[
      {"type":"heading","text":"Сводка: обязанности владельца транспортного средства"},
      {"type":"table","headers":["Обязанность","Последствие нарушения"],"rows":[
        ["Поддерживать ITV в актуальном состоянии","Нарушение + возможная иммобилизация"],
        ["Поддерживать страховку","Грубое нарушение + иммобилизация"],
        ["Не передавать водителю без прав","Солидарная ответственность за ущерб"],
        ["Идентифицировать водителя-нарушителя","Санкция возлагается на владельца"],
        ["Компания аренды: идентифицировать арендатора","Санкция как нарушителю"]
      ]},
      {"type":"callout","variant":"warning","text":"Важно для экзамена: если владелец не идентифицирует водителя → санкция (штраф + баллы) получает ВЛАДЕЛЕЦ, даже если он не управлял ТС."}
    ]}'
  );

  -- ── Step 8 · Quiz — authored (titular responsable ITV) ───────────────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 8, 'quiz',
    '{"text":"¿Quién es el responsable de que el vehículo tenga la ITV en vigor?","options":["El conductor habitual del vehículo.","El taller mecánico donde se revisa el vehículo.","El titular del vehículo."],"correct":2,"explanation":"El titular del vehículo es el responsable de mantenerlo en las condiciones técnicas reglamentarias, lo que incluye pasar la ITV en los plazos establecidos. El incumplimiento de esta obligación puede acarrear una infracción y, en casos graves, la inmovilización del vehículo."}',
    '{"text":"Кто несёт ответственность за прохождение ТС технического осмотра (ITV) в срок?","options":["Постоянный водитель транспортного средства.","Автомастерская, где обслуживается ТС.","Владелец транспортного средства."],"correct":2,"explanation":"Владелец транспортного средства несёт ответственность за поддержание его в нормативном техническом состоянии, включая прохождение ITV в установленные сроки. Нарушение этого обязательства может повлечь штраф и в серьёзных случаях — иммобилизацию ТС."}'
  );

  -- ── Step 9 · Quiz — authored (empresa alquiler identificación) ───────────
  INSERT INTO lesson_steps (lesson_id, order_index, type, content_es, content_ru)
  VALUES (l_id, 9, 'quiz',
    '{"text":"Una empresa de alquiler de vehículos recibe una notificación de infracción por exceso de velocidad. ¿Qué debe hacer?","options":["Pagar la multa ella misma, ya que es la titular del vehículo.","Identificar a la persona que tenía alquilado el vehículo en el momento de la infracción.","Ignorar la notificación, ya que no pueden saber quién conducía."],"correct":1,"explanation":"La empresa de alquiler está especialmente obligada a identificar al conductor (arrendatario) que tenía el vehículo en el momento de la infracción, y debe comunicar sus datos a la DGT en el plazo indicado. Si no lo hace, la sanción recaerá sobre la empresa."}',
    '{"text":"Компания по аренде автомобилей получила уведомление о нарушении — превышении скорости. Что она должна сделать?","options":["Заплатить штраф самостоятельно, так как является владельцем ТС.","Идентифицировать человека, арендовавшего ТС в момент нарушения.","Игнорировать уведомление, так как невозможно знать, кто управлял."],"correct":1,"explanation":"Компания по аренде особенно обязана идентифицировать водителя (арендатора), у которого было ТС в момент нарушения, и сообщить его данные в DGT в указанный срок. Если этого не сделать, санкция будет возложена на компанию."}'
  );

END $$;
