import { FileText, Stethoscope, Car, GraduationCap } from "lucide-react";
import RadialOrbitalTimeline, { TimelineItem } from "@/components/ui/radial-orbital-timeline";

const timelineData: TimelineItem[] = [
  {
    id: 1,
    title: "Подготовка",
    date: "до 1 месяца",
    content: "Чтобы успешно сдать экзамен, нужно тщательно подготовиться. Наш курс разработан совместно с испанскими автошколами и включает: актуальную лексику, разбор ловушек DGT, тренировочные тесты и пошаговый план.",
    category: "Planning",
    icon: GraduationCap,
    relatedIds: [2],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "Psicotécnico",
    date: "~30 минут",
    content: "Быстрый психофизический тест (Psicotécnico) в авторизованном медицинском центре вашего города (Centro de Reconocimiento de Conductores).",
    category: "Design",
    icon: Stethoscope,
    relatedIds: [3],
    status: "in-progress",
    energy: 90,
  },
  {
    id: 3,
    title: "Теория DGT",
    date: "30 минут",
    content: "Официальный экзамен. 9 из 10 наших студентов сдают с первого раза. Нужно ответить на 30 вопросов и допустить не более 3 ошибок. Результаты действуют в течение 2 лет по всей Испании.",
    category: "Development",
    icon: FileText,
    relatedIds: [4],
    status: "pending",
    energy: 60,
  },
  {
    id: 4,
    title: "Практика",
    date: "10-20 уроков",
    content: "Идёте в любую местную автошколу для практического вождения и финального экзамена в городе. Для допуска нужен как минимум 1 урок с инструктором. Площадки нет — только город.",
    category: "Release",
    icon: Car,
    relatedIds: [],
    status: "pending",
    energy: 30,
  },
];

export function CourseTimeline() {
  return (
    <div className="w-full relative min-h-[600px] flex items-center justify-center -my-20 md:-my-10">
      <RadialOrbitalTimeline timelineData={timelineData} />
    </div>
  );
}
