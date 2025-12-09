import { BookOpen, DollarSign, Clock, Shield, TrendingUp, Users, Link as LinkIcon, HelpCircle, Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PartnerHandbookProps {
  partnerType?: "barter" | "revenue_share" | "autoschool";
}

export function PartnerHandbook({ partnerType = "revenue_share" }: PartnerHandbookProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          Справочник партнера
        </h1>
        <p className="text-zinc-400 text-sm">
          Полная информация о партнерской программе, условиях и механиках
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="commissions">Комиссии</TabsTrigger>
          <TabsTrigger value="mechanics">Механики</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="examples">Примеры</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5 text-primary" />
                Что такое партнерская программа?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <p>
                Партнерская программа позволяет вам зарабатывать, привлекая новых пользователей в приложение.
                Вы получаете комиссию с каждой покупки, совершенной пользователями, которые пришли по вашей ссылке.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-white">Привлечение</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Делитесь партнерской ссылкой в своих каналах, соцсетях, блогах
                  </p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-white">Заработок</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Получайте комиссию с каждой покупки привлеченных пользователей
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <LinkIcon className="h-5 w-5 text-primary" />
                Как работает партнерская ссылка?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-white">Клик по ссылке</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Пользователь переходит по вашей партнерской ссылке
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-white">Регистрация</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Пользователь регистрируется в приложении
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-white">Покупка</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Пользователь совершает покупку (Premium, монеты, Duel Pass)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <p className="font-medium text-white">Начисление комиссии</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Комиссия автоматически добавляется в ваш баланс
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-primary" />
                Размер комиссии
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg border border-primary/20">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">30%</span>
                  <span className="text-sm text-zinc-400">от суммы покупки</span>
                </div>
                <p className="text-xs text-zinc-300 mt-2">
                  Стандартная комиссия для всех партнеров. Может быть изменена индивидуально администратором.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="font-semibold text-white mb-1">С каких покупок начисляется комиссия?</p>
                  <ul className="text-zinc-300 space-y-1 mt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      Premium подписки (месячные и годовые)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      Покупка монет (все пакеты)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      Duel Pass (сезонный пропуск)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-primary" />
                Период заморозки (Hold Period)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="font-semibold text-white mb-2">⚠️ Важно понимать</p>
                <p>
                  Комиссии не начисляются мгновенно. Они сначала попадают в <strong className="text-white">"В заморозке"</strong> (balance_hold)
                  и переводятся в <strong className="text-white">"Доступно к выводу"</strong> (balance_available) только после истечения периода заморозки.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                    Hold Period
                  </Badge>
                  <span className="text-white font-medium">14-30 дней</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Период заморозки устанавливается администратором индивидуально для каждого партнера.
                  Это защита от возвратов (chargebacks) и мошенничества.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calculator className="h-5 w-5 text-primary" />
                Пример расчета
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-zinc-300 mb-3">Пользователь купил Premium на год за <strong className="text-white">€59.99</strong></p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Сумма покупки:</span>
                    <span className="text-white font-semibold">€59.99</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Комиссия (30%):</span>
                    <span className="text-emerald-500 font-bold">€17.99</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Статус:</span>
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                        В заморозке (14 дней)
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mechanics Tab */}
        <TabsContent value="mechanics" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Воронка конверсий</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <p>Система отслеживает весь путь пользователя от клика до покупки:</p>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Click (Клик)</p>
                    <p className="text-xs text-zinc-400">Пользователь перешел по вашей ссылке</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-500">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Registration (Регистрация)</p>
                    <p className="text-xs text-zinc-400">Пользователь создал аккаунт</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Purchase (Покупка)</p>
                    <p className="text-xs text-zinc-400">Пользователь совершил покупку → комиссия начислена</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Генератор ссылок</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-300">
              <p>Вы можете создавать уникальные ссылки для разных кампаний:</p>
              <ul className="space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>UTM-метки для отслеживания источников трафика</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Кастомные параметры для аналитики</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>QR-коды для офлайн-продвижения</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-primary" />
                Система защиты от мошенничества
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-300">
              <p>Наша система использует многоуровневую защиту для предотвращения мошенничества:</p>
              
              <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="blacklist">
                  <AccordionTrigger className="text-white">Черный список</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-xs">
                    Блокировка подозрительных IP-адресов, User-Agent и Device ID
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="self-referral">
                  <AccordionTrigger className="text-white">Защита от self-referral</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-xs">
                    Партнер не может использовать свою ссылку для получения комиссии
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="cookie-stuffing">
                  <AccordionTrigger className="text-white">Cookie Stuffing Protection</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-xs">
                    Блокировка регистраций, произошедших слишком быстро после клика (менее 2 секунд)
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="fingerprinting">
                  <AccordionTrigger className="text-white">Browser Fingerprinting</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-xs">
                    Уникальная идентификация устройств для обнаружения дубликатов
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="hold-period">
                  <AccordionTrigger className="text-white">Hold Period (Период заморозки)</AccordionTrigger>
                  <AccordionContent className="text-zinc-400 text-xs">
                    Задержка выплат на 14-30 дней для защиты от chargebacks
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="when-payout">
              <AccordionTrigger className="text-white">Когда я получу выплату?</AccordionTrigger>
              <AccordionContent className="text-zinc-300 text-sm">
                Выплаты производятся после истечения периода заморозки (14-30 дней). Комиссии автоматически переводятся из "В заморозке" в "Доступно к выводу".
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="min-payout">
              <AccordionTrigger className="text-white">Какая минимальная сумма для вывода?</AccordionTrigger>
              <AccordionContent className="text-zinc-300 text-sm">
                Минимальная сумма устанавливается администратором индивидуально. Обычно это €50-100.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="multiple-purchases">
              <AccordionTrigger className="text-white">Получу ли я комиссию с повторных покупок?</AccordionTrigger>
              <AccordionContent className="text-zinc-300 text-sm">
                Да! Вы получаете комиссию со всех покупок пользователя, который пришел по вашей ссылке, даже если это повторные покупки.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tracking">
              <AccordionTrigger className="text-white">Как отслеживать эффективность ссылок?</AccordionTrigger>
              <AccordionContent className="text-zinc-300 text-sm">
                В разделе "Воронка конверсий" вы можете видеть статистику по кликам, регистрациям и покупкам. Используйте генератор ссылок для создания ссылок с UTM-метками для детальной аналитики.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="support">
              <AccordionTrigger className="text-white">Куда обращаться за поддержкой?</AccordionTrigger>
              <AccordionContent className="text-zinc-300 text-sm">
                По всем вопросам обращайтесь к администратору партнерской программы через форму обратной связи или email.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Примеры расчетов комиссий</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="font-semibold text-white mb-2">Пример 1: Premium подписка</p>
                  <div className="space-y-1 text-zinc-300">
                    <div className="flex justify-between">
                      <span>Premium Monthly (€9.99):</span>
                      <span className="text-emerald-500 font-bold">€2.99 комиссия</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Premium Yearly (€59.99):</span>
                      <span className="text-emerald-500 font-bold">€17.99 комиссия</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <p className="font-semibold text-white mb-2">Пример 2: Покупка монет</p>
                  <div className="space-y-1 text-zinc-300">
                    <div className="flex justify-between">
                      <span>100 монет (€2.99):</span>
                      <span className="text-emerald-500 font-bold">€0.90 комиссия</span>
                    </div>
                    <div className="flex justify-between">
                      <span>500 монет (€9.99):</span>
                      <span className="text-emerald-500 font-bold">€2.99 комиссия</span>
                    </div>
                    <div className="flex justify-between">
                      <span>3000 монет (€39.99):</span>
                      <span className="text-emerald-500 font-bold">€11.99 комиссия</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

