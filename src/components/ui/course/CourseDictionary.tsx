import React, { useState } from 'react';
import { Search, Book, SpellCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const DICTIONARY = [
  { term: "Permiso de Conducir", translation: "Водительское удостоверение", description: "Документ, удостоверяющий право управления транспортным средством. Выдается после успешной сдачи теоретического и практического экзаменов." },
  { term: "Examen Teórico", translation: "Теоретический экзамен", description: "Письменный тест на знание ПДД, знаков и безопасного вождения. Включает 30 вопросов с вариантами ответов (допускается 3 ошибки)." },
  { term: "Examen Práctico", translation: "Практический экзамен", description: "Экзамен по вожнению на дорогах общего пользования (в городе), проверяющий навыки безопасного управления автомобилем." },
  { term: "NIE", translation: "Идентификационный номер", description: "Número de Identificación de Extranjeros. Присваивается иностранцу один раз на всю жизнь, используется для записи на экзамены." },
  { term: "TIE", translation: "Карточка резидента", description: "Tarjeta de Identificación de Extranjeros. Документ с фото, типом резиденции и вашим NIE." },
  { term: "Empadronamiento", translation: "Прописка (Padrón)", description: "Подтверждение регистрации по месту жительства в Испании. Обязательна для получения справки и сдачи экзамена." },
  { term: "Cita", translation: "Предварительная запись", description: "Запись на приём в госучреждение (DGT, полицию) для подачи документов или сдачи экзамена." },
  { term: "Tasa", translation: "Государственная пошлина", description: "Официальный сбор (Tasa DGT), оплачиваемый за прохождение экзаменов. Дает право на 3 попытки сдачи." },
  { term: "Matrícula", translation: "Регистрация / Матрикула", description: "Документ о зачислении на курс. В автошколах — подтверждение вашей регистрации на уроки." },
  { term: "Traductor Jurado", translation: "Присяжный переводчик", description: "Официальный специализированный переводчик. Только их переводы мед. справок или прав признаются в DGT." },
  { term: "DGT", translation: "Главное управление движением", description: "Dirección General de Tráfico. Испанская инстанция (аналог ГАИ), выдающая водительские права и принимающая экзамены." },
  { term: "Clases Prácticas", translation: "Уроки вождения", description: "Практические занятия с инструктором на дорогах общего пользования. Обязательны для подготовки перед практическим экзаменом." },
  { term: "Vehículo de Autoescuela", translation: "Учебный автомобиль", description: "Автомобиль школы с двойными педалями (сцепление/тормоз), на котором проходят занятия и сдается финальный экзамен." },
  { term: "Señales de Tráfico", translation: "Дорожные знаки", description: "Указатели и символы на дороге. Отличное знание знаков критически важно как на сдаче теории, так и в городе." },
  { term: "Código de Circulación", translation: "Испанские ПДД", description: "Свод правил и норм, регулирующий движение транспортных средств и поведение водителей на территории Испании." },
  { term: "Carnet por Puntos", translation: "Система баллов", description: "В Испании водителям начисляются баллы (pts). За нарушения ПДД (скорость, телефон, алкоголь) баллы списываются вплоть до лишения." },
  { term: "Psicotécnico", translation: "Медицинский тест", description: "Обязательное обследование (Test de Aptitud) для проверки зрения, координации, реакции и психической пригодности." },
  { term: "Multa", translation: "Штраф", description: "Денежное наказание за нарушение. Если оплатить multa в течение первых 20 дней, дается скидка 50%." },
  { term: "Zona de Examen", translation: "Зона экзамена", description: "Определённый район, где проходит практика (в Барселоне их несколько). Там же инструктор обучает маневрам." },
  { term: "Permiso Internacional", translation: "Международные права", description: "Опциональный документ в виде книжки, который позволяет управлять авто за пределами Евросоюза." }
];

export function CourseDictionary() {
  const [search, setSearch] = useState("");

  const filtered = DICTIONARY.filter(item => 
    item.term.toLowerCase().includes(search.toLowerCase()) || 
    item.translation.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full relative z-10 px-4 py-16 max-w-[1325px] mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
          <Book className="w-3.5 h-3.5" />
          Словарик
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Термины автошколы</h2>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Шпаргалка базовых испанских слов, которые вам понадобятся на экзамене и при оформлении бумаг.
        </p>
      </div>

      <div className="max-w-md mx-auto relative mb-12">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-500" />
        </div>
        <input 
          type="text" 
          placeholder="Поиск по терминам..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-zinc-900/50 border border-white/10 text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((item, index) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              key={item.term}
              className="group flex flex-col p-5 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight">
                  {item.term}
                </h3>
              </div>
              
              <div className="inline-flex items-center gap-1.5 w-fit px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/10">
                <SpellCheck className="w-3 h-3" />
                {item.translation}
              </div>
              
              <p className="text-sm text-zinc-400 leading-relaxed mt-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500">
            Ничего не найдено. Попробуйте изменить запрос.
          </div>
        )}
      </div>
    </div>
  );
}
