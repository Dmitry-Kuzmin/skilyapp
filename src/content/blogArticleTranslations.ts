import type { Language } from "@/contexts/LanguageContext";

export type BlogArticleLocalizedFields = {
  title?: string;
  description?: string;
  excerpt?: string;
  category?: string;
  author?: string;
  content?: string;
};

export const BLOG_ARTICLE_TRANSLATIONS: Record<
  string,
  Partial<Record<Language, BlogArticleLocalizedFields>>
> = {
  "ekzamen-dgt-2026": {
    ru: {
      excerpt:
        "Видео-вопросы, новые знаки ZBE и VMP, интервью с директором автошколы и 7 советов по подготовке — полный разбор реформы DGT 2026.",
    },
    en: {
      title: "New Theory Driving Exam in Spain: 2026 Changes",
      description:
        "DGT has launched its biggest reform in 10 years. Video questions arrive in February 2026, while new road signs are already in place — here is what changed and how to prepare.",
      excerpt:
        "Video questions, new ZBE and VMP road signs, a driving-school interview and 7 preparation tips — a complete breakdown of the DGT 2026 reform.",
      category: "DGT 2026",
      author: "Dmitry, founder of Skilyapp",
    },
    es: {
      title: "Nuevo examen teórico de conducir en España: cambios de 2026",
      description:
        "La DGT ha lanzado su mayor reforma en 10 años. Las preguntas en vídeo llegan en febrero de 2026 y las nuevas señales ya están en vigor: te explicamos qué cambia y cómo prepararte.",
      excerpt:
        "Preguntas en vídeo, nuevas señales ZBE y VMP, entrevista con una autoescuela y 7 consejos de preparación: análisis completo de la reforma DGT 2026.",
      category: "DGT 2026",
      author: "Dmitry, fundador de Skilyapp",
    },
  },
  "novye-voprosy-dgt-2025": {
    ru: {
      excerpt:
        "Разбираем обновлённый формат вопросов DGT 2025 и показываем, как тренироваться на примерах Skilyapp.",
    },
    en: {
      title: "New DGT Question Types in 2025: What to Prepare For",
      description:
        "Fresh exam requirements and practical preparation tactics with Skilyapp.",
      excerpt:
        "We break down the updated DGT 2025 question format and show how to train for it with Skilyapp.",
      category: "News",
      author: "Skilyapp Team",
      content: `
# New DGT Question Types in 2025: What to Prepare For

DGT is placing even more weight on risk perception and digital skills. It is no longer enough to remember the rule: you must read the situation faster and connect several clues at once.

## Why it matters

Candidates who prepare only with classic single-answer questions usually make more mistakes in visual and combined formats. With only 3 mistakes allowed on the real exam, that difference becomes critical.

## What changed in practice

- More questions based on photos and short visual sequences.
- More tasks where you must confirm every correct action, not just pick one option.
- More references to driving assistants, electronics and connected services.
- More real-life administrative situations around Mi DGT and cita previa.

## 1. Visual risk scenarios

The new format often shows 2 or 3 frames from the same situation. You are expected to detect the dangerous moment before it becomes obvious.

How to train:
- run filters for recent DGT questions,
- practice fast recognition in short game sessions,
- review every mistake with AI explanations until you understand the trigger.

## 2. Multiple-correct answers

These tasks punish rushed reading. One option may look familiar, but the correct solution is usually a set of actions that must all be checked.

How to train:
- slow down and validate every line,
- practice themed duels to improve scanning speed,
- repeat mixed tests where similar options are placed side by side.

## 3. Electronics and driver assistance

Modern theory includes systems such as ESP, ABS, fatigue detection and eco-restriction logic. You do not need to be an engineer, but you do need to know what each system does and when it matters.

The fastest approach is to learn the term, the function and one practical example together.

## 4. Digital DGT services

Questions now more often mention online booking, personal records and digital document flows. That means the exam is moving closer to the real user journey of a driver in Spain.

## A simple 5-day prep block

### Day 1

Take a diagnostic test with the latest question types turned on. Save every uncertain question.

### Day 2

Focus on signs and visual situations. Train with short, high-frequency sessions.

### Day 3

Work on multiple-answer questions only. Learn to read the task completely before touching the options.

### Day 4

Revise electronics and digital DGT services. Build a mini glossary with key terms.

### Day 5

Run a full 30-question simulation and compare it with your Day 1 diagnostic.

## Common mistakes

1. Waiting until the danger is obvious instead of predicting it early.
2. Choosing the first correct option and ignoring the rest.
3. Memorising abbreviations without understanding the real function.

## Final takeaway

The 2025 format rewards candidates who combine theory, reaction and context. If your training includes visual scenarios, mixed-answer logic and AI review, you will adapt much faster than students who only repeat old ticket patterns.
      `,
    },
    es: {
      title: "Nuevos tipos de preguntas DGT en 2025: cómo prepararte",
      description:
        "Nuevas exigencias del examen y tácticas prácticas de preparación con Skilyapp.",
      excerpt:
        "Analizamos el formato actualizado de preguntas DGT 2025 y cómo entrenarlo con Skilyapp.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
      content: `
# Nuevos tipos de preguntas DGT en 2025: cómo prepararte

La DGT está reforzando los bloques de percepción del riesgo y habilidades digitales. Ya no basta con recordar la norma: ahora hay que leer la situación más rápido y conectar varias pistas a la vez.

## Por qué importa

Los alumnos que se preparan solo con preguntas clásicas de una respuesta suelen fallar más en los formatos visuales y combinados. Con solo 3 errores permitidos en el examen real, esa diferencia es decisiva.

## Qué ha cambiado en la práctica

- Más preguntas basadas en fotos y secuencias visuales cortas.
- Más tareas en las que debes marcar todas las acciones correctas, no solo una.
- Más referencias a asistentes de conducción, electrónica y servicios conectados.
- Más situaciones administrativas reales relacionadas con Mi DGT y cita previa.

## 1. Escenarios visuales de riesgo

El nuevo formato suele mostrar 2 o 3 fotogramas de una misma situación. Se espera que detectes el peligro antes de que sea evidente.

Cómo entrenarlo:
- activa los filtros de preguntas recientes de la DGT,
- practica reconocimiento rápido en sesiones cortas,
- revisa cada error con explicaciones IA hasta entender el detonante.

## 2. Respuestas múltiples correctas

Estas tareas castigan la lectura apresurada. Una opción puede sonar familiar, pero la solución correcta suele ser un conjunto de acciones que deben marcarse todas.

Cómo entrenarlo:
- reduce la velocidad y valida cada línea,
- usa duelos temáticos para mejorar el escaneo,
- repite tests mixtos con opciones parecidas una junto a otra.

## 3. Electrónica y asistentes

La teoría moderna incluye sistemas como ESP, ABS, detección de fatiga y restricciones ecológicas. No hace falta ser ingeniero, pero sí saber qué hace cada sistema y cuándo importa.

La forma más rápida de aprenderlo es unir término, función y un ejemplo práctico.

## 4. Servicios digitales de la DGT

Las preguntas mencionan cada vez más la cita previa, el área personal y los flujos documentales digitales. El examen se acerca a la experiencia real de un conductor en España.

## Un bloque simple de preparación en 5 días

### Día 1

Haz un test diagnóstico con los formatos nuevos activados. Guarda todas las preguntas dudosas.

### Día 2

Trabaja señales y situaciones visuales. Entrena con sesiones breves y frecuentes.

### Día 3

Concéntrate solo en preguntas de respuesta múltiple. Aprende a leer el enunciado completo antes de tocar las opciones.

### Día 4

Repasa electrónica y servicios digitales de la DGT. Crea un mini glosario con los términos clave.

### Día 5

Haz una simulación completa de 30 preguntas y compárala con el diagnóstico del Día 1.

## Errores más comunes

1. Esperar a que el peligro sea evidente en lugar de anticiparlo.
2. Elegir la primera opción correcta e ignorar las demás.
3. Memorizar siglas sin entender la función real.

## Conclusión

El formato 2025 premia a quienes combinan teoría, reacción y contexto. Si tu preparación incluye escenarios visuales, lógica de respuesta múltiple y revisión con IA, te adaptarás mucho antes que quienes solo repiten patrones antiguos.
      `,
    },
  },
  "analitika-dgt-progress": {
    ru: {
      excerpt:
        "Если вы теряетесь в цифрах статистики, эта статья покажет, как превратить аналитику в конкретные шаги.",
    },
    en: {
      title: "How to Read Progress Analytics and Close Weak Topics",
      description:
        "A method that turns Skilyapp reports into concrete preparation steps.",
      excerpt:
        "If statistics feel abstract, this guide shows how to turn analytics into daily training decisions.",
      category: "Preparation",
      author: "Skilyapp Team",
      content: `
# How to Read Progress Analytics and Close Weak Topics

Numbers in your profile are not decoration. They tell you where your time creates the highest return.

## Why analytics matter

Without a clear view of weak areas, students often overtrain familiar topics and undertrain the mistakes that will cost them points on the exam.

Good analytics should answer three questions:
- what is weak right now,
- whether the trend is improving or getting worse,
- what exact action to take next.

## Core metrics to watch

### Topic accuracy

If a topic stays below 70%, it is still unstable. Move it into a focused practice block instead of mixing it with everything else.

### Response tempo

If you need too long to answer, the issue is often not knowledge but decoding the wording under pressure.

### Error clusters

When several mistakes belong to the same logic pattern, fix the pattern, not only the individual questions.

### Readiness trend

A flat trend means you are repeating effort without upgrading method. A rising trend means the loop is working.

## A practical workflow

### Step 1. Diagnose

Open analytics and pick the 3 weakest topics. Do not start with all of them at once.

### Step 2. Go narrow

Take a short themed test on one topic only. Save every mistake and read the explanation immediately.

### Step 3. Build a repeat pack

Create a small review set:
- saved questions,
- key rules,
- tricky wording,
- 1 or 2 memory triggers.

### Step 4. Recheck in 48 hours

Run a second focused test. If the score rises, the topic is stabilising. If it does not, reduce scope even more.

## How to prioritise weak topics

Use this order:
1. topics that appear often on the exam,
2. topics linked to safety and right-of-way,
3. topics where your speed collapses under stress,
4. everything else.

## A weekly rhythm

### Monday

Review analytics and choose the week’s priorities.

### Tuesday to Thursday

Work on one weak topic per day using short targeted sessions.

### Friday

Run a full simulation and compare it with Monday’s baseline.

### Weekend

Maintain strong topics with light revision so they do not cool down.

## Common mistakes when using analytics

1. Ignoring yellow zones because they look “good enough”.
2. Working only on red zones and letting strong topics decay.
3. Looking at the chart but not turning it into a next action.

## Final takeaway

Analytics become useful only when they drive a decision. If each chart leads to a specific training move, progress stops being random and starts becoming predictable.
      `,
    },
    es: {
      title: "Cómo leer la analítica de progreso y cerrar temas débiles",
      description:
        "Un método que convierte los informes de Skilyapp en pasos concretos de preparación.",
      excerpt:
        "Si las estadísticas te resultan abstractas, esta guía te muestra cómo convertir la analítica en decisiones diarias de entrenamiento.",
      category: "Preparación",
      author: "Equipo Skilyapp",
      content: `
# Cómo leer la analítica de progreso y cerrar temas débiles

Los números de tu perfil no son decoración. Te dicen dónde tu tiempo produce el mayor retorno.

## Por qué importa la analítica

Sin una visión clara de tus puntos débiles, muchos alumnos entrenan de más lo que ya dominan y de menos los errores que realmente cuestan puntos en el examen.

Una buena analítica debe responder a tres preguntas:
- qué está flojo ahora,
- si la tendencia mejora o empeora,
- qué acción exacta toca hacer después.

## Métricas clave

### Precisión por tema

Si un tema sigue por debajo del 70%, aún no está estable. Llévalo a un bloque de práctica focalizada en lugar de mezclarlo con todo.

### Ritmo de respuesta

Si tardas demasiado, muchas veces el problema no es saber menos, sino descifrar el enunciado bajo presión.

### Agrupación de errores

Cuando varios fallos pertenecen al mismo patrón lógico, hay que corregir el patrón y no solo las preguntas sueltas.

### Tendencia de preparación

Una tendencia plana significa que repites esfuerzo sin mejorar el método. Una tendencia ascendente indica que el ciclo funciona.

## Flujo práctico de trabajo

### Paso 1. Diagnosticar

Abre la analítica y elige los 3 temas más débiles. No empieces con todos a la vez.

### Paso 2. Ir al detalle

Haz un test corto solo de un tema. Guarda todos los fallos y lee la explicación en el momento.

### Paso 3. Crear un paquete de repetición

Prepara un bloque pequeño de repaso:
- preguntas guardadas,
- reglas clave,
- formulaciones confusas,
- 1 o 2 disparadores de memoria.

### Paso 4. Revisión en 48 horas

Haz un segundo test focalizado. Si la nota sube, el tema se está estabilizando. Si no, reduce aún más el alcance.

## Cómo priorizar temas débiles

Sigue este orden:
1. temas que salen mucho en el examen,
2. temas ligados a seguridad y prioridad,
3. temas donde tu velocidad cae bajo estrés,
4. todo lo demás.

## Un ritmo semanal

### Lunes

Revisa la analítica y define las prioridades de la semana.

### De martes a jueves

Trabaja un tema débil por día con sesiones cortas y dirigidas.

### Viernes

Haz una simulación completa y compárala con la línea base del lunes.

### Fin de semana

Mantén los temas fuertes con repasos ligeros para que no se enfríen.

## Errores comunes al usar analítica

1. Ignorar las zonas amarillas porque parecen “suficientes”.
2. Trabajar solo las zonas rojas y dejar caer los temas fuertes.
3. Mirar el gráfico pero no convertirlo en una acción siguiente.

## Conclusión

La analítica solo sirve cuando conduce a una decisión. Si cada gráfico termina en un movimiento concreto de entrenamiento, el progreso deja de ser aleatorio y empieza a ser predecible.
      `,
    },
  },
  "podgotovka-na-russkom-i-ispanskom": {
    ru: {
      excerpt:
        "Стратегия для тех, кто читает вопросы на испанском, но объяснять себе правила хочет на русском.",
    },
    en: {
      title:
        "How to Prepare for DGT if You Think in Russian but Take the Exam in Spanish",
      description:
        "A bilingual strategy: glossary, translation support and mixed practice tests.",
      excerpt:
        "A practical approach for students who read the exam in Spanish but still process the rules more confidently in Russian.",
      category: "Preparation",
      author: "Skilyapp Team",
      content: `
# How to Prepare for DGT if You Think in Russian but Take the Exam in Spanish

Thinking in your native language is not a weakness. It becomes a strength if you build a clear bridge from understanding to exam language.

## Why bilingual study works

When you first understand the rule in Russian and then practise it in Spanish, you create two access points to the same concept. Under stress, that often makes recall faster, not slower.

## The main problems Russian-speaking students face

### False friends

Words like carril, adelantar or ceda el paso look simple after translation, but the real exam meaning is more precise than the first instinct.

### Grammar under pressure

Passive forms, formal instructions and negative constructions make a known rule feel unfamiliar.

### Technical terminology

Many students know the traffic rule but freeze on electronics, documentation or legal vocabulary.

## A working bilingual method

### Step 1. Learn the rule in plain Russian

If the rule is still fuzzy in your head, Spanish will not fix it. Start with clarity.

### Step 2. Attach the Spanish wording

Do not translate whole paragraphs every time. Instead, connect the rule to 3 to 5 exact exam phrases.

### Step 3. Train mixed mode

Alternate:
- explanation in Russian,
- question in Spanish,
- answer options in Spanish,
- final recap in both languages.

### Step 4. Build a live glossary

Create your own set of recurring terms:
- priority,
- overtaking,
- parking,
- restrictions,
- road signs,
- driver assistance.

## What to avoid

1. Studying only in Russian until the very last week.
2. Switching to Spanish too early while the concept is still unclear.
3. Translating every word instead of recognising standard patterns.

## A 20-minute daily routine

### 5 minutes

Review key Spanish terms and one tricky construction.

### 10 minutes

Take a short themed test in Spanish.

### 5 minutes

Explain your mistakes to yourself in Russian, then restate the key rule in Spanish.

## What good progress looks like

You are moving in the right direction when:
- you stop translating every sentence word by word,
- you recognise recurring structures instantly,
- your answer speed in Spanish begins to approach your speed in Russian.

## Final takeaway

The goal is not to erase Russian from the process. The goal is to use Russian for deep understanding and Spanish for fast recognition on exam day.
      `,
    },
    es: {
      title:
        "Cómo prepararte para la DGT si piensas en ruso pero examinas en español",
      description:
        "Una estrategia bilingüe: glosario, apoyo de traducción y tests mixtos.",
      excerpt:
        "Un enfoque práctico para alumnos que leen el examen en español pero aún procesan mejor las normas en ruso.",
      category: "Preparación",
      author: "Equipo Skilyapp",
      content: `
# Cómo prepararte para la DGT si piensas en ruso pero examinas en español

Pensar en tu idioma nativo no es una debilidad. Se convierte en una ventaja si construyes un puente claro entre la comprensión y el idioma del examen.

## Por qué funciona el estudio bilingüe

Cuando primero entiendes la norma en ruso y luego la practicas en español, creas dos puntos de acceso para la misma idea. Bajo estrés, eso suele acelerar el recuerdo.

## Problemas habituales de los rusohablantes

### Falsos amigos

Palabras como carril, adelantar o ceda el paso parecen fáciles al traducirlas, pero en el examen real el matiz es más preciso de lo que parece.

### Gramática bajo presión

Las formas pasivas, las instrucciones formales y las construcciones negativas hacen que una norma conocida parezca nueva.

### Terminología técnica

Muchos alumnos conocen la regla, pero se bloquean con electrónica, documentación o vocabulario legal.

## Un método bilingüe que sí funciona

### Paso 1. Aprende la norma en ruso claro

Si la idea todavía es borrosa en tu cabeza, el español no la va a arreglar. Primero, claridad.

### Paso 2. Añade la formulación en español

No traduzcas párrafos enteros cada vez. Une la norma con 3 a 5 frases reales de examen.

### Paso 3. Entrena en modo mixto

Alterna:
- explicación en ruso,
- pregunta en español,
- opciones en español,
- resumen final en ambos idiomas.

### Paso 4. Construye un glosario vivo

Crea tu propio bloque de términos recurrentes:
- prioridad,
- adelantamiento,
- estacionamiento,
- restricciones,
- señales,
- ayudas a la conducción.

## Qué evitar

1. Estudiar solo en ruso hasta la última semana.
2. Pasarte al español demasiado pronto cuando el concepto aún no está claro.
3. Traducir cada palabra en vez de reconocer patrones estándar.

## Rutina diaria de 20 minutos

### 5 minutos

Repasa términos clave en español y una construcción difícil.

### 10 minutos

Haz un test corto temático en español.

### 5 minutos

Explícate los errores en ruso y después reformula la regla clave en español.

## Cómo se ve un buen progreso

Vas bien cuando:
- dejas de traducir cada frase palabra por palabra,
- reconoces estructuras repetidas al instante,
- tu velocidad de respuesta en español empieza a acercarse a la que tienes en ruso.

## Conclusión

El objetivo no es borrar el ruso del proceso. El objetivo es usar el ruso para comprender a fondo y el español para reconocer rápido el patrón el día del examen.
      `,
    },
  },
  "ispanskie-znaki-kotorye-pytayut": {
    ru: {
      excerpt:
        "Собрали пять знаков, на которых чаще всего ошибаются наши пользователи, и подсказали, как их запомнить за вечер.",
    },
    en: {
      title: "5 Spanish Road Signs That Confuse Russian Speakers",
      description:
        "A quick guide to signs that look familiar but mean something else entirely.",
      excerpt:
        "Five road signs that cause the most mistakes among our users, with simple memory hooks for each one.",
      category: "Tips",
      author: "Skilyapp Team",
      content: `
# 5 Spanish Road Signs That Confuse Russian Speakers

Some signs look intuitive until you answer the question and realise you imported the wrong meaning from another system.

## Why these signs are tricky

Russian-speaking learners often rely on visual similarity. That works until Spain uses the same shape for a different legal nuance.

## 1. Ceda el paso

Many students understand the icon but underestimate how strict the priority rule is in questions with low visibility and merging traffic.

Memory hook: if the sign is present, priority is not “shared”, it is already decided.

## 2. Entry restrictions in low-emission zones

These signs mix environmental logic, time conditions and vehicle classes. Students miss details hidden in the lower text or additional panel.

Memory hook: always read the plate below the main sign before answering.

## 3. Bus and multi-occupancy lanes

The icon is clear, but exam traps appear around who may enter and in which conditions.

Memory hook: vehicle type alone is rarely enough; occupancy and exceptions matter.

## 4. Temporary work-zone signage

Many students treat temporary signs as secondary. In practice, they override the usual permanent logic inside the roadworks area.

Memory hook: orange context means temporary control has priority.

## 5. Parking restrictions with schedules

This is one of the biggest sources of mistakes because the sign combines colour, arrows, days and hours.

Memory hook: decode in this order:
1. whether stopping or parking is restricted,
2. direction of the arrows,
3. time and day conditions.

## How to memorise signs faster

- group them by situation, not by alphabetical name;
- attach one real-life scene to every confusing sign;
- repeat the sign again after 24 hours and 72 hours;
- train mixed question packs instead of isolated flashcards only.

## Final takeaway

The exam rarely punishes you for not seeing the sign. It punishes you for seeing it too fast and assuming the wrong rule. Slow down, decode the details and attach each sign to a scenario, not just an icon.
      `,
    },
    es: {
      title: "5 señales españolas que confunden a los rusohablantes",
      description:
        "Una guía rápida sobre señales que parecen familiares pero significan algo diferente.",
      excerpt:
        "Cinco señales en las que más fallan nuestros usuarios, con trucos simples para memorizarlas.",
      category: "Consejos",
      author: "Equipo Skilyapp",
      content: `
# 5 señales españolas que confunden a los rusohablantes

Algunas señales parecen intuitivas hasta que respondes la pregunta y descubres que has traído el significado equivocado de otro sistema.

## Por qué estas señales son difíciles

Muchos alumnos rusohablantes se apoyan en la similitud visual. Eso funciona hasta que en España la misma forma se usa con un matiz legal distinto.

## 1. Ceda el paso

Muchos entienden el icono, pero subestiman lo estricta que es la prioridad en preguntas con poca visibilidad o incorporación de tráfico.

Truco: si la señal está presente, la prioridad no se “negocia”; ya está definida.

## 2. Restricciones de acceso en zonas de bajas emisiones

Estas señales mezclan lógica ambiental, franjas horarias y clases de vehículos. Muchos fallan por no leer la placa inferior.

Truco: antes de responder, mira siempre el panel complementario.

## 3. Carriles BUS-VAO

El icono es claro, pero las trampas aparecen al preguntar quién puede entrar y en qué condiciones.

Truco: el tipo de vehículo rara vez basta; la ocupación y las excepciones importan.

## 4. Señalización temporal por obras

Muchos estudiantes tratan estas señales como secundarias. En realidad, dentro de la zona de obras prevalecen sobre la lógica permanente.

Truco: el contexto naranja significa prioridad temporal.

## 5. Restricciones de estacionamiento con horario

Es una fuente enorme de errores porque la señal combina color, flechas, días y horas.

Truco: descifra en este orden:
1. si prohíbe parar o estacionar,
2. hacia qué lado apuntan las flechas,
3. qué días u horas limita.

## Cómo memorizarlas más rápido

- agrúpalas por situación y no por nombre,
- asocia una escena real a cada señal confusa,
- repítela a las 24 y a las 72 horas,
- usa packs mixtos y no solo tarjetas aisladas.

## Conclusión

El examen rara vez te castiga por no ver la señal. Te castiga por verla demasiado rápido y asumir la norma equivocada. Baja el ritmo, lee los detalles y ata cada señal a una situación real.
      `,
    },
  },
  "motivaciya-dgt-gamifikaciya": {
    ru: {
      excerpt:
        "Показываем, как превращать подготовку в игру: рейтинги, награды и напоминания Skilyapp.",
    },
    en: {
      title: "Gamifying Preparation: How to Keep the Pace for 60 Days",
      description:
        "Use streaks, duels and seasonal challenges so your preparation does not collapse halfway through.",
      excerpt:
        "A practical guide to motivation systems that help students keep showing up for DGT preparation week after week.",
      category: "Tips",
      author: "Skilyapp Team",
      content: `
# Gamifying Preparation: How to Keep the Pace for 60 Days

Most students do not fail because they are incapable. They fail because preparation becomes irregular long before knowledge becomes solid.

## Why gamification helps

Motivation is unreliable. Systems are better. A good study game loop turns “I should study” into “I do not want to break the chain”.

## The 4 mechanics that work best

### 1. Streaks

Daily continuity removes the heavy restart cost. Even a 10-minute session keeps the learning engine warm.

### 2. Visible rewards

Coins, XP, levels and badges are not childish. They are feedback. They show that effort has weight.

### 3. Duels and comparison

Friendly competition increases focus and speed. It also makes repetition less boring.

### 4. Seasons and events

A fixed-time challenge creates urgency. “Later” becomes less attractive when the event ends soon.

## How to use gamification without burning out

- keep the daily minimum small,
- let strong days go longer naturally,
- never miss twice in a row,
- use rewards to reinforce consistency, not perfection.

## A 60-day rhythm

### Days 1-15

Build the habit. Focus on showing up, not on huge sessions.

### Days 16-30

Add duels, timed drills and visible progress targets.

### Days 31-45

Use analytics to focus the game on your weak areas.

### Days 46-60

Switch the system toward exam simulations and stress control.

## Mistakes to avoid

1. Turning every session into a marathon.
2. Chasing rewards while ignoring weak topics.
3. Using punishment instead of positive momentum.

## Final takeaway

Gamification is not about making study silly. It is about making consistency easier. If the system helps you return tomorrow, it is already doing its job.
      `,
    },
    es: {
      title: "Gamificación de la preparación: cómo mantener el ritmo 60 días",
      description:
        "Usa rachas, duelos y retos de temporada para no abandonar la preparación a mitad de camino.",
      excerpt:
        "Una guía práctica de sistemas de motivación que ayudan a mantener la constancia en la preparación DGT.",
      category: "Consejos",
      author: "Equipo Skilyapp",
      content: `
# Gamificación de la preparación: cómo mantener el ritmo 60 días

La mayoría de alumnos no falla por falta de capacidad. Fallan porque la preparación se vuelve irregular mucho antes de que el conocimiento se consolide.

## Por qué ayuda la gamificación

La motivación es inestable. Los sistemas funcionan mejor. Un buen bucle convierte el “debería estudiar” en “no quiero romper la cadena”.

## Las 4 mecánicas que mejor funcionan

### 1. Rachas

La continuidad diaria elimina el coste de volver a arrancar. Incluso una sesión de 10 minutos mantiene el motor caliente.

### 2. Recompensas visibles

Monedas, XP, niveles e insignias no son algo infantil. Son feedback. Le dan peso al esfuerzo.

### 3. Duelos y comparación

La competencia amistosa aumenta el foco y la velocidad. Además, hace la repetición menos aburrida.

### 4. Temporadas y eventos

Un reto con fecha final crea urgencia. “Luego” suena peor cuando el evento termina pronto.

## Cómo usar la gamificación sin quemarte

- mantén pequeño el mínimo diario,
- deja que los días fuertes se alarguen de forma natural,
- no faltes dos veces seguidas,
- usa las recompensas para reforzar constancia, no perfección.

## Un ritmo de 60 días

### Días 1-15

Construye el hábito. Lo importante es aparecer, no hacer sesiones enormes.

### Días 16-30

Añade duelos, ejercicios cronometrados y metas visibles.

### Días 31-45

Usa la analítica para dirigir el juego hacia tus puntos débiles.

### Días 46-60

Cambia el sistema hacia simulaciones de examen y control del estrés.

## Errores que conviene evitar

1. Convertir cada sesión en una maratón.
2. Perseguir recompensas e ignorar temas débiles.
3. Basar el sistema en castigo y no en impulso positivo.

## Conclusión

La gamificación no consiste en volver ridículo el estudio. Consiste en hacer más fácil la constancia. Si el sistema te ayuda a volver mañana, ya está funcionando.
      `,
    },
  },
  "kak-gotovitsya-dgt-pri-plotnom-grafike": {
    ru: {
      excerpt:
        "Узнайте, как вписать изучение теории DGT в плотный график: короткие тренировки, адаптивные тесты и использование Skilyapp с ИИ-подсказками.",
    },
    en: {
      title: "How to Study DGT Theory Effectively with a Busy Schedule",
      description:
        "A step-by-step strategy for students balancing work, family and preparation.",
      excerpt:
        "How to fit DGT theory into a crowded routine using micro-sessions, focus blocks and adaptive practice.",
      category: "Preparation",
      author: "Skilyapp Team",
      content: `
# How to Study DGT Theory Effectively with a Busy Schedule

If your calendar is already full, the answer is not “find 2 free hours”. The answer is to reduce friction and increase precision.

## The core principle

Busy students do best when they remove choice. The study block should be ready before free time appears.

## What actually works

### Micro-sessions

Use 5 to 15 minute blocks for recall, signs and weak-topic revision.

### Focus sessions

Reserve 20 to 30 minute windows for hard topics or simulations.

### Queue-based learning

Always know your next action:
- today’s weak topic,
- saved mistakes,
- one glossary set,
- one mini simulation.

## A realistic weekly template

### Monday to Friday

- 10 minutes in the morning: glossary or signs.
- 10 to 15 minutes later in the day: one focused test.
- 5 minutes before sleep: review mistakes only.

### Weekend

Run one full exam simulation and one analytics review.

## How to protect consistency

1. Keep the app ready on your phone.
2. Save unfinished practice for instant return.
3. Use reminders linked to existing habits, not random time slots.

## What to avoid

- waiting for the “perfect” free evening,
- doing random tests without a goal,
- spending energy deciding what to study.

## Final takeaway

With a busy schedule, efficiency beats intensity. Short, targeted repetition done consistently is stronger than rare heroic sessions.
      `,
    },
    es: {
      title: "Cómo estudiar la teoría DGT con un horario muy apretado",
      description:
        "Una estrategia paso a paso para quienes combinan trabajo, familia y preparación.",
      excerpt:
        "Cómo encajar la teoría DGT en una agenda llena usando micro-sesiones, bloques de foco y práctica adaptativa.",
      category: "Preparación",
      author: "Equipo Skilyapp",
      content: `
# Cómo estudiar la teoría DGT con un horario muy apretado

Si tu calendario ya está lleno, la solución no es “buscar dos horas libres”. La solución es reducir fricción y aumentar precisión.

## El principio central

Los alumnos con poco tiempo avanzan más cuando eliminan decisiones. El bloque de estudio debe estar definido antes de que aparezca el hueco.

## Lo que sí funciona

### Micro-sesiones

Usa bloques de 5 a 15 minutos para recordar normas, repasar señales y atacar temas débiles.

### Sesiones de foco

Reserva ventanas de 20 a 30 minutos para temas difíciles o simulaciones.

### Aprendizaje por cola

Ten siempre clara la acción siguiente:
- el tema débil del día,
- los errores guardados,
- un bloque de glosario,
- una mini simulación.

## Una plantilla semanal realista

### De lunes a viernes

- 10 minutos por la mañana: glosario o señales.
- 10 a 15 minutos más tarde: un test dirigido.
- 5 minutos antes de dormir: repasar solo errores.

### Fin de semana

Haz una simulación completa y una revisión de analítica.

## Cómo proteger la constancia

1. Ten la app preparada en el móvil.
2. Guarda la práctica incompleta para volver al instante.
3. Usa recordatorios ligados a hábitos existentes y no a horas aleatorias.

## Qué conviene evitar

- esperar a la “noche perfecta” para estudiar,
- hacer tests aleatorios sin objetivo,
- gastar energía decidiendo qué tocar.

## Conclusión

Con un horario apretado, la eficiencia vale más que la intensidad. La repetición breve, dirigida y constante gana a las sesiones heroicas pero aisladas.
      `,
    },
  },
  "kak-trenirovat-vospriyatie-riska-dgt": {
    ru: {
      excerpt:
        "Разбираем, почему восприятие риска стало ключевой частью экзамена DGT и как Skilyapp помогает натренировать реакцию через сценарии и дуэли.",
    },
    en: {
      title: "How to Train Risk Perception Before the DGT Exam",
      description:
        "Practical techniques to spot danger earlier than the examiner expects.",
      excerpt:
        "Why risk perception matters so much on the DGT exam and how to train it through scenarios, timing and review loops.",
      category: "Tips",
      author: "Skilyapp Team",
      content: `
# How to Train Risk Perception Before the DGT Exam

Risk perception is the ability to notice a dangerous situation before it fully unfolds. That is exactly why it shows up more often in modern DGT questions.

## Why students miss these questions

They look at the scene statically. The exam expects dynamic reading: what is about to happen, not only what is visible right now.

## The 3-layer scanning method

### Layer 1. Immediate lane situation

Who is where? What is moving, slowing or merging?

### Layer 2. Hidden risk

What can appear next: a cyclist, a pedestrian, a blind spot, a sudden stop?

### Layer 3. Decision window

At what moment should the driver already be reducing speed or preparing to yield?

## Training drills

### Photo pause drill

Look at one image for 3 seconds and describe the next likely hazard aloud.

### Sequence drill

Use short visual chains and identify the frame where the risk becomes predictable.

### Timing drill

Answer under light time pressure to train early recognition, not late certainty.

## The best review question after every mistake

Do not ask only “What was the right answer?”

Ask:
- what signal I ignored,
- when the danger first became visible,
- what earlier action would have been safer.

## Final takeaway

Risk perception improves when you train anticipation. The goal is to stop reacting to danger and start seeing it one step sooner.
      `,
    },
    es: {
      title: "Cómo entrenar la percepción del riesgo antes del examen DGT",
      description:
        "Técnicas prácticas para detectar el peligro antes de que el examinador lo espere.",
      excerpt:
        "Por qué la percepción del riesgo importa tanto en la DGT y cómo entrenarla con escenarios, tiempo y revisión.",
      category: "Consejos",
      author: "Equipo Skilyapp",
      content: `
# Cómo entrenar la percepción del riesgo antes del examen DGT

La percepción del riesgo es la capacidad de detectar una situación peligrosa antes de que se desarrolle del todo. Por eso aparece cada vez más en las preguntas modernas de la DGT.

## Por qué se fallan estas preguntas

Muchos alumnos miran la escena de forma estática. El examen espera una lectura dinámica: qué está a punto de pasar, no solo qué se ve ahora.

## El método de escaneo en 3 capas

### Capa 1. Situación inmediata del carril

Quién está dónde, quién acelera, frena o se incorpora.

### Capa 2. Riesgo oculto

Qué puede aparecer después: un ciclista, un peatón, un ángulo muerto, una frenada brusca.

### Capa 3. Ventana de decisión

En qué momento el conductor ya debería reducir velocidad o preparar la cesión.

## Ejercicios útiles

### Pausa de foto

Mira una imagen durante 3 segundos y di en voz alta cuál es el siguiente peligro probable.

### Secuencia visual

Usa cadenas cortas de imágenes e identifica en qué fotograma el riesgo ya era previsible.

### Ejercicio de tiempo

Responde con presión ligera de tiempo para entrenar reconocimiento temprano y no certeza tardía.

## La mejor pregunta de revisión tras cada error

No preguntes solo “¿cuál era la respuesta correcta?”.

Pregunta:
- qué señal ignoré,
- cuándo el peligro se volvió visible por primera vez,
- qué acción previa habría sido más segura.

## Conclusión

La percepción del riesgo mejora cuando entrenas anticipación. El objetivo es dejar de reaccionar al peligro y empezar a verlo un paso antes.
      `,
    },
  },
  "mikrotreningi-dgt-na-telefone": {
    ru: {
      excerpt:
        "Рассказываем, как строить микротренировки на телефоне, чтобы прогресс не зависел от расписания автошколы. Везде с вами — Skilyapp.",
    },
    en: {
      title: "Phone Micro-Training: The Path to Stable DGT Results",
      description:
        "How to turn spare 5-minute windows into real progress with mobile learning.",
      excerpt:
        "A simple system for building DGT progress from short sessions on your phone instead of waiting for long study blocks.",
      category: "Preparation",
      author: "Skilyapp Team",
      content: `
# Phone Micro-Training: The Path to Stable DGT Results

Five minutes are enough to protect momentum. The key is choosing the right task for the size of the gap you have.

## What micro-training is good for

- sign repetition,
- glossary review,
- saved mistakes,
- mini themed tests,
- one fast duel or reaction drill.

## What it is not good for

Do not use tiny sessions for heavy new theory if you are tired and distracted. That belongs in a focused block.

## The best 5-minute routine

### Minute 1

Open the app and resume exactly where you stopped.

### Minutes 2-4

Solve one narrow set: signs, weak topic, or saved mistakes.

### Minute 5

Review the one rule you almost missed.

## Why mobile training works

It removes the startup cost. You do not need a desk, notebook or perfect timing. That makes repetition much more consistent.

## How to make it sustainable

1. Keep one active weak topic at a time.
2. Save unclear questions immediately.
3. Let notifications remind you, but keep the daily target small.

## Final takeaway

Micro-training is not a replacement for deep study. It is the glue that keeps everything alive between bigger sessions.
      `,
    },
    es: {
      title: "Microentrenamientos en el móvil: camino a un resultado estable en DGT",
      description:
        "Cómo convertir huecos de 5 minutos en progreso real con aprendizaje móvil.",
      excerpt:
        "Un sistema simple para construir progreso DGT desde sesiones cortas en el móvil en lugar de esperar grandes bloques de estudio.",
      category: "Preparación",
      author: "Equipo Skilyapp",
      content: `
# Microentrenamientos en el móvil: camino a un resultado estable en DGT

Cinco minutos bastan para proteger el ritmo. La clave es elegir la tarea correcta para el hueco que tienes.

## Para qué sirven bien

- repaso de señales,
- revisión de glosario,
- errores guardados,
- mini tests temáticos,
- un duelo rápido o ejercicio de reacción.

## Para qué no sirven

No uses sesiones mínimas para teoría nueva y pesada si estás cansado o distraído. Eso pertenece a un bloque de foco.

## La mejor rutina de 5 minutos

### Minuto 1

Abre la app y vuelve exactamente al punto donde lo dejaste.

### Minutos 2-4

Resuelve un bloque estrecho: señales, tema débil o errores guardados.

### Minuto 5

Repasa la regla que casi fallaste.

## Por qué funciona el móvil

Elimina el coste de arrancar. No necesitas mesa, cuaderno ni un momento perfecto. Eso hace la repetición mucho más constante.

## Cómo hacerlo sostenible

1. Mantén un solo tema débil activo a la vez.
2. Guarda al instante las preguntas confusas.
3. Usa notificaciones, pero con una meta diaria pequeña.

## Conclusión

El microentrenamiento no sustituye al estudio profundo. Es el pegamento que mantiene vivo el aprendizaje entre sesiones grandes.
      `,
    },
  },
  "tehnologii-skilyapp": {
    ru: {
      excerpt:
        "Погружаемся в экосистему Skilyapp: карта обучения, микротренировки, игры, сезоны, Telegram-бот и AI-компаньон Skily — всё в одной заботливой связке.",
    },
    en: {
      title: "How Skilyapp Combines Tests, Games, Seasons and AI",
      description:
        "A big-picture article on how the learning map, Skily, duels and micro-training work together.",
      excerpt:
        "A guided tour of the Skilyapp ecosystem: learning map, micro-training, games, seasons, Telegram and AI support in one system.",
      category: "News",
      author: "Skilyapp Team",
      content: `
# How Skilyapp Combines Tests, Games, Seasons and AI

Skilyapp is not a random set of features. Each layer exists to solve a different part of the preparation problem.

## 1. Tests build accuracy

Classic question practice gives you coverage. It helps you meet the official structure and spot weak topics quickly.

## 2. The learning map builds order

Many students lose energy because they study everything at once. The map creates a route, so progress feels directional instead of chaotic.

## 3. Games build speed and attention

When theory gets heavy, games keep training active. They convert repetition into quick recognition, reaction and risk scanning.

## 4. Duels add pressure in a healthy dose

Competition simulates exam stress better than passive reading. It sharpens timing and keeps motivation high.

## 5. Seasons create long-term rhythm

Without medium-term goals, users often study in bursts and disappear. Seasonal progression makes consistency visible.

## 6. AI closes the feedback gap

The biggest problem in solo study is not knowing why the answer was wrong. AI shortens that loop by explaining the logic pattern behind the mistake.

## 7. Telegram and mobile access reduce friction

Preparation works better when the next session is one tap away. Fast access increases repetition frequency.

## Final takeaway

Tests teach the rules. Analytics show the gaps. Games sharpen reactions. AI explains the mistakes. Seasons keep you moving. The system works because each piece supports the others.
      `,
    },
    es: {
      title: "Cómo Skilyapp combina tests, juegos, temporadas e IA",
      description:
        "Una visión completa de cómo el mapa de aprendizaje, Skily, los duelos y el microentrenamiento funcionan juntos.",
      excerpt:
        "Un recorrido por el ecosistema Skilyapp: mapa de aprendizaje, microentrenamiento, juegos, temporadas, Telegram y ayuda IA en un solo sistema.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
      content: `
# Cómo Skilyapp combina tests, juegos, temporadas e IA

Skilyapp no es un conjunto aleatorio de funciones. Cada capa existe para resolver una parte distinta del problema de preparación.

## 1. Los tests construyen precisión

La práctica clásica te da cobertura. Te ayuda a conocer la estructura oficial y detectar pronto los temas débiles.

## 2. El mapa de aprendizaje crea orden

Muchos alumnos se agotan porque estudian todo a la vez. El mapa crea una ruta y hace que el progreso tenga dirección.

## 3. Los juegos entrenan velocidad y atención

Cuando la teoría pesa, los juegos mantienen el entrenamiento activo. Transforman la repetición en reconocimiento rápido, reacción y lectura del riesgo.

## 4. Los duelos añaden presión útil

La competencia simula mejor el estrés del examen que la lectura pasiva. Mejora el timing y sostiene la motivación.

## 5. Las temporadas crean ritmo a medio plazo

Sin metas intermedias, muchos usuarios estudian por ráfagas y desaparecen. La progresión estacional hace visible la constancia.

## 6. La IA cierra el vacío de feedback

El gran problema del estudio en solitario es no saber por qué una respuesta estaba mal. La IA acorta ese ciclo explicando el patrón lógico detrás del error.

## 7. Telegram y el acceso móvil reducen fricción

La preparación funciona mejor cuando la siguiente sesión está a un toque. El acceso rápido aumenta la frecuencia de repetición.

## Conclusión

Los tests enseñan las normas. La analítica enseña los huecos. Los juegos afinan la reacción. La IA explica el error. Las temporadas mantienen el movimiento. El sistema funciona porque cada pieza empuja a las demás.
      `,
    },
  },
  "kak-sdat-ekzamen-dgt-s-pervogo-raza": {
    ru: {
      excerpt:
        "Теория DGT может показаться сложной, но с правильным подходом вы можете освоить её быстро. Узнайте, как эффективно учиться и избежать распространенных ошибок.",
    },
    en: {
      title: "How to Master DGT Theory Efficiently",
      description:
        "A practical guide to studying DGT theory in Spain with fewer mistakes and more structure.",
      excerpt:
        "A complete beginner-friendly guide to learning DGT theory efficiently and building exam-ready confidence.",
      category: "Preparation",
      author: "Skilyapp Team",
      content: `
# How to Master DGT Theory Efficiently

The fastest students are not the ones who read the most. They are the ones who repeat the right material in the right order.

## Start with structure

Break theory into stable blocks:
- signs,
- right of way,
- speed and distance,
- parking and stopping,
- safety systems,
- documentation and responsibility.

## Learn in cycles

Use this loop:
1. understand the rule,
2. test it in questions,
3. review mistakes,
4. repeat after a delay.

## Do not study only passively

Reading explanations helps, but the exam checks retrieval under pressure. You need active recall, not only exposure.

## Save mistakes early

Your wrong answers are the shortest route to improvement. Build revision packs from them instead of starting every day from zero.

## Add timing gradually

First learn the logic calmly. Then add time pressure. Speed built too early creates shallow habits.

## Know when you are ready

Look for:
- strong topic accuracy,
- stable performance across several tests,
- controlled timing,
- fewer repeated mistakes.

## Final takeaway

Efficient DGT preparation is not about cramming. It is about turning rules into repeatable recognition patterns you can trust on exam day.
      `,
    },
    es: {
      title: "Cómo dominar la teoría DGT de forma eficiente",
      description:
        "Una guía práctica para estudiar la teoría DGT en España con menos errores y más estructura.",
      excerpt:
        "Una guía completa y clara para aprender teoría DGT con eficacia y llegar al examen con confianza real.",
      category: "Preparación",
      author: "Equipo Skilyapp",
      content: `
# Cómo dominar la teoría DGT de forma eficiente

Los estudiantes que avanzan más rápido no son los que más leen. Son los que repiten el material correcto en el orden correcto.

## Empieza con estructura

Divide la teoría en bloques estables:
- señales,
- prioridad,
- velocidad y distancia,
- parada y estacionamiento,
- sistemas de seguridad,
- documentación y responsabilidad.

## Aprende en ciclos

Usa este bucle:
1. entiende la norma,
2. ponla a prueba con preguntas,
3. revisa los errores,
4. repite con separación en el tiempo.

## No estudies solo de forma pasiva

Leer ayuda, pero el examen mide recuperación bajo presión. Necesitas recuerdo activo y no solo exposición.

## Guarda los errores pronto

Tus respuestas incorrectas son el camino más corto hacia la mejora. Construye repasos a partir de ellas en vez de empezar cada día desde cero.

## Añade tiempo poco a poco

Primero aprende la lógica con calma. Después añade presión temporal. La velocidad demasiado temprana crea hábitos superficiales.

## Cómo saber que ya estás listo

Busca esto:
- buena precisión por tema,
- rendimiento estable en varias pruebas,
- timing controlado,
- menos errores repetidos.

## Conclusión

Preparar la DGT con eficacia no es empollar. Es convertir normas en patrones de reconocimiento repetibles en los que puedas confiar el día del examen.
      `,
    },
  },
  "ai-repetitor-dgt-kak-iskusstvennyj-intellekt-pomogaet-sdat-ekzamen": {
    ru: {
      excerpt:
        "Искусственный интеллект в Skilyapp — это не просто чат-бот. Он анализирует ваши слабые места, объясняет сложные вопросы на русском и создаёт персональный план подготовки к экзамену DGT.",
    },
    en: {
      title:
        "AI DGT Tutor: How Artificial Intelligence Helps You Pass the Exam",
      description:
        "How AI in Skilyapp analyses mistakes, adapts training and accelerates preparation.",
      excerpt:
        "Why AI support is more than a chatbot and how it can shorten the path from repeated mistake to stable understanding.",
      category: "News",
      author: "Skilyapp Team",
      content: `
# AI DGT Tutor: How Artificial Intelligence Helps You Pass the Exam

AI becomes useful in preparation only when it reduces the time between mistake, explanation and next action.

## What AI should do well

- explain why the answer was wrong,
- adapt the explanation to your level,
- identify repeated logic patterns,
- point to the next exercise that matters most.

## What makes this different from a chatbot

A generic chatbot answers the question you ask. A learning AI should also answer the question you forgot to ask:
“What exactly keeps making me fail this topic?”

## Where AI helps most in DGT preparation

### Error analysis

It can turn a wrong answer into a clear logic correction instead of a vague comment.

### Language support

For bilingual students, AI can explain the Spanish wording in simpler terms and connect it to the underlying rule.

### Pattern detection

When your mistakes repeat, AI can group them into one weakness instead of treating them as isolated events.

### Revision guidance

It can tell you what to repeat next so you stop wasting effort on material that is already stable.

## Limits of AI

AI does not replace deliberate practice. It accelerates understanding, but you still need repetition, testing and timing.

## Final takeaway

Used correctly, AI makes feedback faster and more personal. It does not magically pass the exam for you, but it can sharply reduce confusion, hesitation and wasted practice.
      `,
    },
    es: {
      title:
        "Tutor IA para la DGT: cómo la inteligencia artificial te ayuda a aprobar",
      description:
        "Cómo la IA en Skilyapp analiza errores, adapta el entrenamiento y acelera la preparación.",
      excerpt:
        "Por qué la ayuda IA es mucho más que un chatbot y cómo puede acortar el camino entre error y comprensión estable.",
      category: "Actualidad",
      author: "Equipo Skilyapp",
      content: `
# Tutor IA para la DGT: cómo la inteligencia artificial te ayuda a aprobar

La IA solo aporta valor real en la preparación cuando reduce el tiempo entre error, explicación y acción siguiente.

## Qué debe hacer bien una buena IA

- explicar por qué la respuesta fue incorrecta,
- adaptar la explicación a tu nivel,
- detectar patrones repetidos de error,
- señalar el siguiente ejercicio con más impacto.

## Qué la diferencia de un chatbot cualquiera

Un chatbot general responde a la pregunta que haces. Una IA de aprendizaje también debe responder a la que no llegaste a formular:
"¿qué es exactamente lo que me hace fallar siempre en este tema?".

## Dónde ayuda más en la preparación DGT

### Análisis de errores

Convierte una respuesta fallada en una corrección lógica clara y no en un comentario vago.

### Apoyo de idioma

Para alumnos bilingües, la IA puede simplificar la formulación española y conectarla con la norma real.

### Detección de patrones

Si tus errores se repiten, la IA puede agruparlos como una sola debilidad en lugar de tratarlos como casos aislados.

### Guía de repaso

Puede decirte qué repetir a continuación para que dejes de gastar energía en material ya estable.

## Los límites de la IA

La IA no sustituye la práctica deliberada. Acelera la comprensión, pero siguen haciendo falta repetición, test y control del tiempo.

## Conclusión

Bien usada, la IA hace el feedback más rápido y personal. No aprueba el examen por ti, pero reduce de forma clara la confusión, la duda y el entrenamiento perdido.
      `,
    },
  },
  "top-10-oshibok-na-ekzamene-dgt": {
    ru: {
      excerpt:
        "Многие кандидаты повторяют одни и те же ошибки. Мы собрали топ-10 самых частых промахов и рассказали, как их избежать.",
    },
    en: {
      title: "Top 10 Mistakes When Studying DGT Theory",
      description:
        "The most common mistakes students make when learning DGT traffic rules and how to avoid them.",
      excerpt:
        "Ten repeated preparation mistakes that slow students down and how to correct each one before exam day.",
      category: "Tips",
      author: "Skilyapp Team",
      content: `
# Top 10 Mistakes When Studying DGT Theory

Most students do not fail because of one dramatic gap. They fail because several small mistakes keep repeating.

## 1. Studying randomly

Without order, progress feels busy but shallow.

## 2. Repeating only strong topics

Students naturally return to what feels comfortable. The exam punishes what remains weak.

## 3. Ignoring saved mistakes

Wrong answers are your best revision source. Leaving them untouched wastes the most useful data.

## 4. Reading explanations passively

If you never retrieve the rule yourself, it will not hold under pressure.

## 5. Adding speed too early

First accuracy, then tempo. Reversing the order creates rushed habits.

## 6. Not training risk perception

Modern DGT theory expects anticipation, not only memorisation.

## 7. Avoiding bilingual confusion

If Spanish wording slows you down, you must train that layer directly, not hope it disappears.

## 8. Studying in rare long marathons

Consistency beats intensity for theory retention.

## 9. Skipping analytics

Without feedback, many students misjudge where their real weakness is.

## 10. Simulating the exam too late

You need to feel timing and stress before the real day, not only on it.

## Final takeaway

Most of these mistakes are fixable once you see them clearly. A better system does not require more willpower, only better sequencing and more honest feedback.
      `,
    },
    es: {
      title: "Top 10 errores al estudiar la teoría DGT",
      description:
        "Los fallos más comunes al estudiar las normas DGT y cómo evitarlos.",
      excerpt:
        "Diez errores repetidos de preparación que frenan a muchos alumnos y cómo corregirlos antes del examen.",
      category: "Consejos",
      author: "Equipo Skilyapp",
      content: `
# Top 10 errores al estudiar la teoría DGT

La mayoría de alumnos no falla por una gran carencia aislada. Falla porque varios errores pequeños se repiten una y otra vez.

## 1. Estudiar sin orden

Sin estructura, el progreso parece activo pero se queda superficial.

## 2. Repetir solo temas fuertes

Es natural volver a lo que resulta cómodo. El examen castiga lo que sigue débil.

## 3. Ignorar los errores guardados

Las respuestas falladas son tu mejor material de repaso. Dejarlas sin tocar desaprovecha el dato más útil.

## 4. Leer explicaciones de forma pasiva

Si nunca recuperas tú mismo la regla, no aguantará bien bajo presión.

## 5. Meter velocidad demasiado pronto

Primero precisión, luego ritmo. Hacerlo al revés crea hábitos precipitados.

## 6. No entrenar la percepción del riesgo

La teoría DGT moderna exige anticipación, no solo memoria.

## 7. Evitar la capa bilingüe

Si el español te ralentiza, hay que entrenar esa capa de forma directa.

## 8. Estudiar solo en maratones largas y raras

Para retener teoría, la constancia gana a la intensidad aislada.

## 9. Saltarse la analítica

Sin feedback, muchos estudiantes juzgan mal su verdadera debilidad.

## 10. Simular el examen demasiado tarde

Hay que sentir el tiempo y la presión antes del día real, no solo ese día.

## Conclusión

La mayoría de estos errores se corrigen en cuanto se ven con claridad. Un sistema mejor no exige más fuerza de voluntad: exige mejor secuencia y feedback más honesto.
      `,
    },
  },
};

