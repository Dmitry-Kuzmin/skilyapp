export interface CourseTopicInventory {
  topicId: string;
  topicNumber: number;
  materialCount: number;
  shortTitle: string;
  firstStaticId: string;
  interactiveChapterId?: string;
  interactiveLessonCount: number;
}

export const VERIFIED_TERM_TOTAL = 558;
export const INTERACTIVE_CHAPTER_TOTAL = 6;
export const INTERACTIVE_LESSON_TOTAL = 30;

export const COURSE_TOPIC_INVENTORY: CourseTopicInventory[] = [
  { topicId: 'topic-1', topicNumber: 1, materialCount: 11, shortTitle: 'Определения и использование дорог', firstStaticId: 'static-topic-1-subtopic-1-1', interactiveChapterId: 'ch1', interactiveLessonCount: 5 },
  { topicId: 'topic-2', topicNumber: 2, materialCount: 5, shortTitle: 'Манёвры и перестроения', firstStaticId: 'static-topic-2-subtopic-2-1', interactiveChapterId: 'ch2', interactiveLessonCount: 5 },
  { topicId: 'topic-3', topicNumber: 3, materialCount: 6, shortTitle: 'Знаки, светофоры и сигналы', firstStaticId: 'static-topic-3-subtopic-3-1', interactiveChapterId: 'ch3', interactiveLessonCount: 5 },
  { topicId: 'topic-4', topicNumber: 4, materialCount: 7, shortTitle: 'Огни и световые приборы', firstStaticId: 'static-topic-4-subtopic-4-0', interactiveChapterId: 'ch4', interactiveLessonCount: 5 },
  { topicId: 'topic-5', topicNumber: 5, materialCount: 7, shortTitle: 'Использование транспортного средства', firstStaticId: 'static-topic-5-subtopic-5-1', interactiveChapterId: 'ch5', interactiveLessonCount: 5 },
  { topicId: 'topic-6', topicNumber: 6, materialCount: 6, shortTitle: 'Документация', firstStaticId: 'static-topic-6-subtopic-6-1-1', interactiveChapterId: 'ch6', interactiveLessonCount: 5 },
  { topicId: 'topic-7', topicNumber: 7, materialCount: 11, shortTitle: 'Аварии', firstStaticId: 'static-topic-7-subtopic-7-1-1', interactiveLessonCount: 0 },
  { topicId: 'topic-8', topicNumber: 8, materialCount: 4, shortTitle: 'Поведение в случае аварии', firstStaticId: 'static-topic-8-subtopic-8-1-1', interactiveLessonCount: 0 },
  { topicId: 'topic-9', topicNumber: 9, materialCount: 13, shortTitle: 'Механика и обслуживание', firstStaticId: 'static-topic-9-subtopic-9-1', interactiveLessonCount: 0 },
  { topicId: 'topic-10', topicNumber: 10, materialCount: 7, shortTitle: 'Типы и техники вождения', firstStaticId: 'static-topic-10-subtopic-10-1-1', interactiveLessonCount: 0 },
];

export const FULL_COURSE_TOPIC_TOTAL = COURSE_TOPIC_INVENTORY.length;
export const FULL_COURSE_MATERIAL_TOTAL = COURSE_TOPIC_INVENTORY.reduce(
  (sum, topic) => sum + topic.materialCount,
  0
);
