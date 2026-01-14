
const fs = require('fs');
const path = require('path');

const filePath = 'data/parsed/topic-02/topic-02_test-002.json';
const rawData = fs.readFileSync(filePath, 'utf8');
let questions = JSON.parse(rawData);

// Hardcoded enriched data maps by question_number (or we match text if numbers duplicate)
// We will use question_number matching for simplicity as observed in the file.
const enrichedData = {
    18: {
        question: {
            ru: "Вблизи поворота с ограниченной видимостью запрещено...",
            en: "In the vicinity of a curve with reduced visibility, it is prohibited to..."
        },
        answers: {
            a: { ru: "Останавливаться и парковаться.", en: "Stop and park." },
            b: { ru: "Останавливаться, но не парковаться.", en: "Stop, but not park." },
            c: { ru: "Парковаться, но не останавливаться.", en: "Park, but not stop." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nПоворот с ограниченной видимостью — это \"слепая зона\". Любая остановившаяся машина там — смертельная ловушка для других. Водитель, вылетающий из поворота, просто не успеет среагировать. Поэтому запрещено ВСЁ: и на секундочку (остановка), и надолго (стоянка).\n\n### 💣 Ловушка / Трюк\nИногда кажется, что если остановиться \"ненадолго\", то можно. Нет! В таких местах запрещено всё.",
            en: "### 🧠 The Logic \"Why\"\nA curve with reduced visibility is a blind spot. Any car stopped there is a death trap. A driver coming out of the curve won't have time to react. That's why EVERYTHING is forbidden: both stopping (briefly) and parking.",
            es: "### 🧠 La Lógica \"Por qué\"\nUna curva de visibilidad reducida es un \"punto ciego\". Cualquier coche parado allí es una trampa mortal. Un conductor que sale de la curva no tendrá tiempo de reaccionar. Por eso está prohibido TODO: tanto parar (un momento) como estacionar.\n\n### 💣 La Trampa / El Truco\nA veces parece que si paras solo un momento está bien. ¡No! En estos lugares está prohibido todo."
        }
    },
    19: {
        question: {
            ru: "Как следует выезжать на дорогу общего пользования с частной дороги?",
            en: "How should you join a public road from an exclusively private road?"
        },
        answers: {
            a: { ru: "На скорости, позволяющей немедленно остановиться.", en: "At a speed that allows stopping immediately." },
            b: { ru: "На максимальной скорости, разрешенной на дороге, на которую выезжаете.", en: "At the maximum speed permitted on the road you are joining." },
            c: { ru: "Медленно, уступая дорогу только транспортным средствам, приближающимся справа.", en: "Slowly, giving way only to vehicles approaching from the right." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nВыезд с частной территории (гараж, двор) или грунтовой дороги — это второстепенный маневр. Ты обязан уступить ВСЕМ. Скорость должна быть такой низкой (\"черепашьей\"), чтобы если вдруг появится машина или пешеход, ты встал как вкопанный мгновенно.",
            en: "### 🧠 The Logic \"Why\"\nExiting private property (garage, yard) is a secondary maneuver. You must give way to EVERYONE. Your speed must be so low that if a car or pedestrian appears, you can stop immediately.",
            es: "### 🧠 La Lógica \"Por qué\"\nSalir de una propiedad privada es una maniobra secundaria. Debes ceder el paso a TODOS. La velocidad debe ser tan baja que si aparece un coche o peatón, puedas detenerte en el acto."
        }
    },
    21: {
        question: {
            ru: "Водитель, совершающий обгон...",
            en: "A driver overtaking..."
        },
        answers: {
            a: { ru: "может превысить максимальную скорость на 20 км/ч.", en: "may exceed the maximum speed by 20 km/h." },
            b: { ru: "должен поддерживать умеренную скорость.", en: "must maintain a moderate speed." },
            c: { ru: "должен вести автомобиль со скоростью, заметно превышающей скорость обгоняемого.", en: "must drive at a speed noticeably higher than the overtaken vehicle." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nОбгон — опасный маневр на встречке. Чем дольше ты там, тем выше риск. Чтобы минимизировать время, разница в скорости должна быть ощутимой. Если ты едешь чуть-чуть быстрее, обгон займет вечность. Дави на газ (в пределах правил), чтобы завершить маневр быстро!",
            en: "### 🧠 The Logic \"Why\"\nOvertaking is dangerous. The longer you are in the other lane, the higher the risk. To minimize time, the speed difference must be noticeable. Accelerate to finish quickly!",
            es: "### 🧠 La Lógica \"Por qué\"\nAdelantar es peligroso. Cuanto más tiempo estés en sentido contrario, mayor es el riesgo. Para minimizar ese tiempo, la diferencia de velocidad debe ser notable. ¡Acelera para acabar rápido!"
        }
    },
    23: {
        question: {
            ru: "Разрешено ли движение, если разбито левое наружное зеркало?",
            en: "Is driving allowed if the left exterior mirror is broken?"
        },
        answers: {
            a: { ru: "Да, оно не обязательно.", en: "Yes, it is not mandatory." },
            b: { ru: "Только если есть внутреннее зеркало.", en: "Only if there is an interior mirror." },
            c: { ru: "Нет, если водитель не видит обстановку сзади.", en: "No, if the driver cannot see traffic behind." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nЛевое зеркало — это \"глаза\" водителя. Без него ты слеп при обгоне. Это **обязательное** зеркало. Ездить без него — всё равно что бегать с закрытым глазом: опасно и запрещено.",
            en: "### 🧠 The Logic \"Why\"\nThe left mirror is the driver's eyes. Without it, you are blind when overtaking. It is mandatory. Driving without it is dangerous and prohibited.",
            es: "### 🧠 La Lógica \"Por qué\"\nEl espejo izquierdo son los \"ojos\" del conductor. Sin él, estás ciego al adelantar. Es obligatorio. Conducir sin él es peligroso y prohibido."
        }
    },
    24: {
        question: {
            ru: "Судя по изображению, обязательно ли обгонять трамвай справа?",
            en: "Judging by the image, is it mandatory to overtake the tram on the right?"
        },
        answers: {
            a: { ru: "Нет, можно справа или слева.", en: "No, right or left is allowed." },
            b: { ru: "Да, всегда.", en: "Yes, always." },
            c: { ru: "Нет, нужно слева.", en: "No, must be on the left." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nРаз ответ \"справа или слева\", значит это **одностороннее** движение. Встречки нет, объезжай трамвай где удобно. Если бы было двустороннее, слева обгонять было бы нельзя.",
            en: "### 🧠 The Logic \"Why\"\nSince the answer is \"right or left\", it's a **one-way** street. No oncoming traffic, so pass on either side.",
            es: "### 🧠 La Lógica \"Por qué\"\nSi la respuesta es \"derecha o izquierda\", es una vía de **sentido único**. No hay coches de frente, puedes rodear por donde te convenga."
        }
    },
    26: {
        question: {
            ru: "Нужно ли использовать упоры при парковке с прицепом?",
            en: "Must chocks be used when parking with a trailer?"
        },
        answers: {
            a: { ru: "Да, всегда.", en: "Yes, always." },
            b: { ru: "Да, на склоне.", en: "Yes, on a slope." },
            c: { ru: "Нет, только для грузовиков.", en: "No, only for trucks." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nПрицеп тяжелый. На склоне ручник может не выдержать. Упоры (кальцос) — это гарантия, что \"поезд\" не уедет. Камни использовать нельзя, нужны специальные упоры.",
            en: "### 🧠 The Logic \"Why\"\nA trailer is heavy. On a slope, the handbrake might fail. Chocks guarantee the vehicle won't roll. You cannot use stones.",
            es: "### 🧠 La Lógica \"Por qué\"\nUn remolque es pesado. En pendiente, el freno de mano puede fallar. Los calzos son la garantía de que no rodará. No valen piedras."
        }
    },
    28: {
        question: {
            ru: "Правый поворотник указывает на...",
            en: "The right indicator indicates..."
        },
        answers: {
            a: { ru: "смещение вправо.", en: "movement to the right." },
            b: { ru: "разворот.", en: "U-turn." },
            c: { ru: "поворот налево.", en: "left turn." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nПоворотники — это язык жестов. Правый говорит \"я иду вправо\" (парковка, съезд). Разворот всегда влево, поэтому там нужен левый.",
            en: "### 🧠 The Logic \"Why\"\nIndicators are sign language. Right says \"I go right\". A U-turn starts to the left, so needs the left indicator.",
            es: "### 🧠 La Lógica \"Por qué\"\nLos intermitentes son lenguaje de signos. El derecho dice \"voy a la derecha\". El cambio de sentido es a la izquierda, usa el izquierdo."
        }
    },
    29: {
        question: {
            ru: "Где можно парковаться на городской двусторонней дороге?",
            en: "Where can you park on a two-way urban road?"
        },
        answers: {
            a: { ru: "Справа по ходу движения.", en: "On the right side in direction of travel." },
            b: { ru: "С обеих сторон.", en: "On both sides." },
            c: { ru: "С обеих сторон, если не мешаешь.", en: "On both sides if not obstructing." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nНа двусторонней дороге парковка слева (\"против шерсти\") запрещена — это опасное пересечение встречки. Паркуемся только справа.",
            en: "### 🧠 The Logic \"Why\"\nOn a two-way road, parking on the left (against traffic) is forbidden due to dangerous crossing. Park only on the right.",
            es: "### 🧠 La Lógica \"Por qué\"\nEn vía de doble sentido, aparcar a la izquierda (\"a contramano\") es peligrosísimo. Solo a la derecha."
        }
    },
    5: {
        question: {
            ru: "Запрещено парковаться...",
            en: "It is prohibited to park..."
        },
        answers: {
            a: { ru: "на загородных дорогах.", en: "on interurban roads." },
            b: { ru: "у пешеходных переходов.", en: "near pedestrian crossings." },
            c: { ru: "перед обозначенными выездами (гаражами).", en: "in front of marked driveways." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nVado (Выезд) — это святое право владельца гаража. Если вы перекроете выезд, это мгновенный эвакуатор.",
            en: "### 🧠 The Logic \"Why\"\nA driveway is sacred. If you block it, you block someone's freedom. Instant tow-away.",
            es: "### 🧠 La Lógica \"Por qué\"\nUn Vado es sagrado. Si aparcas ahí, bloqueas la salida. Grúa asegurada."
        }
    },
    10: {
        question: {
            ru: "Можно ли обгонять на этом перекрестке?",
            en: "Can you overtake at this intersection?"
        },
        answers: {
            a: { ru: "Нет, запрещено.", en: "No, prohibited." },
            b: { ru: "Да, только двухколесные.", en: "Yes, only two-wheelers." },
            c: { ru: "Да, если позволяет обстановка (есть приоритет).", en: "Yes, if traffic permits (priority)." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nОбычно на перекрестках обгон запрещен. Но если у вас ГЛАВНАЯ дорога (приоритет), обгонять можно. Ответ \"Да\" подразумевает наличие приоритета.",
            en: "### 🧠 The Logic \"Why\"\nUsually overtaking at intersections is forbidden. But if you have PRIORITY, you can.",
            es: "### 🧠 La Lógica \"Por qué\"\nNormalmente está prohibido. Pero si tienes PRIORIDAD, sí puedes."
        }
    },
    20: {
        question: {
            ru: "Можно ли на полосе разгона ехать быстрее потока?",
            en: "Can you driver faster than traffic in the acceleration lane?"
        },
        answers: {
            a: { ru: "Нет, это обгон справа.", en: "No, that's undertaking." },
            b: { ru: "Да.", en: "Yes." },
            c: { ru: "Только мотоциклы.", en: "Only motorcycles." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nПолоса разгона — для разгона. Вам нужно набрать скорость потока. Если поток медленный, вы можете ехать быстрее него для безопасного слияния. Это не считается обгоном.",
            en: "### 🧠 The Logic \"Why\"\nThe acceleration lane is for gaining speed. If traffic is slow, you can pass them to merge safely. This is not undertaking.",
            es: "### 🧠 La Lógica \"Por qué\"\nEl carril de aceleración es para acelerar. Si el flujo es lento, puedes ir más rápido para entrar seguro. No es adelantamiento."
        }
    },
    22: {
        question: {
            ru: "Где нужно убедиться в безопасности выезда с полосы разгона?",
            en: "Where must you check safety when merging?"
        },
        answers: {
            a: { ru: "В конце.", en: "At the end." },
            b: { ru: "В начале полосы.", en: "At the beginning." },
            c: { ru: "Где угодно.", en: "Anywhere." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nСмотреть нужно СРАЗУ (в начале). Если места нет, останавливаемся в начале, чтобы потом разогнаться. Если доехать до конца и встать, разогнаться будет негде.",
            en: "### 🧠 The Logic \"Why\"\nCheck IMMEDIATELY (at start). If no gap, stop at start to save runway. If you stop at the end, you can't accelerate.",
            es: "### 🧠 La Lógica \"Por qué\"\nMira AL PRINCIPIO. Si no hay hueco, para al principio. Si llegas al final y paras, no podrás acelerar."
        }
    },
    25: {
        question: {
            ru: "Разрешена ли остановка на обочине трассы?",
            en: "Is stopping allowed on the highway shoulder?"
        },
        answers: {
            a: { ru: "Разрешена.", en: "Allowed." },
            b: { ru: "Запрещены и остановка, и стоянка.", en: "Both stopping and parking prohibited." },
            c: { ru: "Разрешены обе.", en: "Both allowed." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nОбочина трассы — зона безопасности. Остановка без аварийной причины запрещена. Хотите отдохнуть? Ищите зону отдыха.",
            en: "### 🧠 The Logic \"Why\"\nThe shoulder is safety zone. Stopping without emergency is banned. Find a rest area.",
            es: "### 🧠 La Lógica \"Por qué\"\nEl arcén es zona de seguridad. Parar sin emergencia es ilegal. Busca un área de descanso."
        }
    },
    27: {
        question: {
            ru: "Где можно остановиться на загородной дороге?",
            en: "Where can you stop on a country road?"
        },
        answers: {
            a: { ru: "Слева.", en: "On left." },
            b: { ru: "Справа, вне обочины.", en: "On right, off the shoulder." },
            c: { ru: "Справа на обочине.", en: "On right, on shoulder." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nТолько СПРАВА и ПОЛНОСТЬЮ съехав с асфальта (и с обочины). Не мешайте проезду.",
            en: "### 🧠 The Logic \"Why\"\nOnly RIGHT and COMPLETELY off the road/shoulder. Don't block way.",
            es: "### 🧠 La Lógica \"Por qué\"\nSolo a la DERECHA y FUERA de la calzada/arcén. No estorbes."
        }
    },
    30: {
        question: {
            ru: "Как показать сигнал в городе, если сломались поворотники?",
            en: "How to signal in city if indicators break?"
        },
        answers: {
            a: { ru: "Сигналом.", en: "Horn." },
            b: { ru: "Рукой.", en: "Arm." },
            c: { ru: "Только поворотниками.", en: "Only indicators." }
        },
        explanation: {
            ru: "### 🧠 Логика \"Почему\"\nРука — легальная замена поворотнику. Звуковой сигнал в городе запрещен (кроме ЧП).",
            en: "### 🧠 The Logic \"Why\"\nArm is legal backup. Horn is banned in city.",
            es: "### 🧠 La Lógica \"Por qué\"\nEl brazo es alternativa legal. El claxon está prohibido en ciudad."
        }
    }
};

let updatedCount = 0;
questions = questions.map(q => {
    const enrich = enrichedData[q.question_number];
    if (enrich) {
        updatedCount++;
        console.log(`Updating Question #${q.question_number}`);

        // Update Question
        q.question.ru = enrich.question.ru;
        q.question.en = enrich.question.en;

        // Update Answers
        q.answers.forEach(ans => {
            const eAns = enrich.answers[ans.id];
            if (eAns) {
                ans.text.ru = eAns.ru;
                ans.text.en = eAns.en;
            }
        });

        // Update Explanation
        q.explanation.ru = enrich.explanation.ru;
        q.explanation.en = enrich.explanation.en;
        if (enrich.explanation.es) { // Only update ES explanation if we have a better one generated
            q.explanation.es = enrich.explanation.es;
        }
    }
    return q;
});

fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
console.log(`Success! Updated ${updatedCount} questions.`);
