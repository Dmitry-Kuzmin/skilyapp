export interface HandbookSection {
    id: string;
    number: string;
    title: string;
    description: string;
    content?: string;
    images?: string[];
}

export const russiaHandbookSections: HandbookSection[] = [
    {
        id: "1",
        number: "1",
        title: "Общие положения",
        description: "Фундаментальные понятия, термины и основные принципы дорожного движения в РФ 2025.",
        images: ["/images/handbook/section_1.png"],
        content: `
            <div class="pro-handbook">
                <div class="hb-hero">
                    <h1 class="hb-hero-title">ПДД РФ 2025</h1>
                    <p class="hb-hero-subtitle">Глава 1. Общие положения. Основное законодательство и терминология официального текста ГИБДД РФ.</p>
                </div>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">1.1</div>
                    <div class="hb-rule-content">
                        <strong>Общий порядок</strong>
                        Настоящие Правила дорожного движения (В дальнейшем – Правила) устанавливают единый порядок дорожного движения на всей территории Российской Федерации. Другие нормативные акты, касающиеся дорожного движения, должны основываться на требованиях Правил и не противоречить им.
                    </div>
                </div>

                <div class="info-box-premium">
                    <p>В Правилах (п. 1.2) используются следующие основные понятия и термины, сгруппированные для удобства изучения:</p>
                </div>
                
                <!-- КАТЕГОРИЯ: ДОРОЖНАЯ ИНФРАСТРУКТУРА -->
                <div class="hb-category-label">Дорожная инфраструктура</div>
                <div class="hb-accordion">
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Автомагистраль</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Дорога, обозначенная знаком 5.1 и имеющая для каждого направления движения проезжие части, отделенные друг от друга разделительной полосой (а при ее отсутствии - дорожным ограждением), без пересечений в одном уровне с другими дорогами, железнодорожными или трамвайными путями, пешеходными или велосипедными дорожками.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Велосипедная дорожка</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Конструктивно отделенный от проезжей части и тротуара элемент дороги (либо отдельная дорога), предназначенный для движения велосипедистов и лиц, использующих для передвижения средства индивидуальной мобильности, и обозначенный знаком 4.4.1.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Главная дорога</span>
                            </div>
                            <span class="hb-tag-critical tiny">ПРИОРИТЕТ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Дорога, обозначенная знаками 2.1, 2.3.1 - 2.3.7 или 5.1, по отношению к пересекаемой (примыкающей), или дорога с твердым покрытием (асфальто- и цементобетон, каменные материалы и тому подобное) по отношению к грунтовой, либо любая дорога по отношению к выездам с прилегающих территорий. Наличие на второстепенной дороге непосредственно перед перекрестком участка с покрытием не делает ее равной по значению с пересекаемой.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Дорога</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Обустроенная или приспособленная и используемая для движения транспортных средств полоса земли либо поверхность искусственного сооружения. Дорога включает в себя одну или несколько проезжих частей, а также трамвайные пути, тротуары, обочины и разделительные полосы при их наличии.</div>
                        </div>
                    </div>
                    
                    <div class="hb-accordion-item">
                         <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Перекресток</span>
                            </div>
                            <span class="hb-tag-critical tiny">ВАЖНО</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Место пересечения, примыкания или разветвления дорог на одном уровне, ограниченное воображаемыми линиями, соединяющими соответственно противоположные, наиболее удаленные от центра перекрестка начала закруглений проезжих частей. Не считаются перекрестками выезды с прилегающих территорий.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Пешеходный переход</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Участок проезжей части, трамвайных путей, обозначенный знаками 5.19.1, 5.19.2 и (или) разметкой 1.14.1 - 1.14.3 и выделенный для движения пешеходов через дорогу. При отсутствии разметки ширина пешеходного перехода определяется расстоянием между знаками.</div>
                        </div>
                    </div>
                </div>

                <!-- КАТЕГОРИЯ: ТРАНСПОРТНЫЕ СРЕДСТВА -->
                <div class="hb-category-label">Транспортные средства</div>
                <div class="hb-accordion">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Маршрутное транспортное средство</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Транспортное средство общего пользования (автобус, троллейбус, трамвай), используемое при осуществлении регулярных перевозок пассажиров и багажа в соответствии с законодательством РФ об организации регулярных перевозок и движущееся по установленному маршруту с обозначенными местами остановок.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Механическое транспортное средство</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                             <div class="hb-desc">Транспортное средство, приводимое в движение двигателем. Термин распространяется также на любые тракторы и самоходные машины. Термин не распространяется на средства индивидуальной мобильности и велосипеды.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                         <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Средство индивидуальной мобильности (СИМ)</span>
                            </div>
                            <span class="hb-tag-new tiny">UPDATE 2025</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Транспортное средство, имеющее одно или несколько колес (роликов), предназначенное для индивидуального передвижения человека посредством использования двигателя (двигателей) (электросамокаты, электроскейтборды, гироскутеры, сигвеи, моноколеса и иные аналогичные средства).</div>
                        </div>
                    </div>
                </div>

                <!-- КАТЕГОРИЯ: УЧАСТНИКИ ДВИЖЕНИЯ -->
                <div class="hb-category-label">Участники движения</div>
                <div class="hb-accordion">
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Велосипедист</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Лицо, управляющее велосипедом.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                         <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Водитель</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Лицо, управляющее каким-либо транспортным средством, погонщик, ведущий по дороге вьючных, верховых животных или стадо. К водителю приравнивается обучающий вождению.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Пешеход</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Лицо, находящееся вне транспортного средства на дороге либо на пешеходной или велопешеходной дорожке и не производящее на них работу. К пешеходам приравниваются лица, передвигающиеся в инвалидных колясках, ведущие СИМ, велосипед, мопед, мотоцикл, везущие санки, тележку, детскую или инвалидную коляску.</div>
                        </div>
                    </div>
                </div>

                <!-- КАТЕГОРИЯ: БЕЗОПАСНОСТЬ И МАНЕВРЫ -->
                <div class="hb-category-label">Безопасность и маневры</div>
                <div class="hb-accordion">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">ДТП</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Дорожно-транспортное происшествие — событие, возникшее в процессе движения по дороге транспортного средства и с его участием, при котором погибли или ранены люди, повреждены транспортные средства, сооружения, грузы либо причинен иной материальный ущерб.</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                         <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Обгон</span>
                            </div>
                            <span class="hb-tag-critical tiny">ВНИМАНИЕ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Опережение одного или нескольких транспортных средств, связанное с выездом на полосу (сторону проезжей части), предназначенную для встречного движения, и последующим возвращением на ранее занимаемую полосу (сторону проезжей части).</div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Уступить дорогу</span>
                            </div>
                            <span class="hb-tag-critical tiny">ВАЖНО</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Требование, означающее, что участник дорожного движения не должен начинать, возобновлять или продолжать движение, осуществлять какой-либо маневр, если это может вынудить других участников движения, имеющих по отношению к нему преимущество, изменить направление движения или скорость.</div>
                        </div>
                    </div>

                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Детская удерживающая система</span>
                            </div>
                            <span class="hb-tag-new tiny">UPDATE 2025</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Конструкция, предназначенная для перевозки детей в транспортном средстве в целях снижения риска причинения вреда их жизни и здоровью. Требования к ним установлены техрегламентом ТР ТС 018/2011.</div>
                        </div>
                    </div>
                </div>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">1.3</div>
                    <div class="hb-rule-content">
                        <strong>Обязанности участников</strong>
                        Участники дорожного движения обязаны знать и соблюдать относящиеся к ним требования Правил, сигналов светофоров, знаков и разметки, а также выполнять распоряжения регулировщиков.
                    </div>
                </div>

                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">1.4</div>
                    <div class="hb-rule-content">
                        <strong>Правостороннее движение</strong>
                        На дорогах Российской Федерации установлено <strong>правостороннее</strong> движение транспортных средств.
                    </div>
                </div>

                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">1.5</div>
                    <div class="hb-rule-content">
                        <strong>Безопасность и вред</strong>
                        Участники дорожного движения должны действовать таким образом, чтобы не создавать опасности для движения и не причинять вреда. Запрещается повреждать или загрязнять покрытие дорог, знаки, светофоры, оставлять предметы, создающие помехи.
                    </div>
                </div>

                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">1.6</div>
                    <div class="hb-rule-content">
                        <strong>Ответственность</strong>
                        Лица, нарушившие Правила, несут ответственность в соответствии с действующим законодательством.
                    </div>
                </div>
            </div>
        `
    },
    {
        id: "2",
        number: "2",
        title: "Общие обязанности водителей",
        description: "Обязанности водителя: документы, ремень, запреты и действия при ДТП.",
        images: ["/images/handbook/section_2.png"],
        content: `
            <div class="pro-handbook">
                <div class="hb-hero">
                    <h1 class="hb-hero-title">Обязанности водителей</h1>
                     <p class="hb-hero-subtitle">Глава 2. Официальный текст ПДД РФ 2025.</p>
                </div>
                
                <h3 class="hb-category-title">2.1 Права и Документы</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.1.1</div>
                    <div class="hb-rule-content">
                        <strong>Водитель обязан иметь при себе:</strong>
                        <p>Иметь при себе и по требованию сотрудников полиции передавать им, для проверки:</p>
                        
                        <div class="hb-accordion" style="margin-top: 1rem;">
                            <div class="hb-accordion-item">
                                <div class="hb-accordion-trigger">
                                    <div class="hb-acc-term-wrapper"><span class="hb-acc-term">Водительское удостоверение</span></div>
                                    <span class="hb-acc-icon">+</span>
                                </div>
                                <div class="hb-accordion-content">
                                    <div class="hb-desc">Водительское удостоверение на право управления транспортным средством соответствующей категории или подкатегории.</div>
                                </div>
                            </div>
                            <div class="hb-accordion-item">
                                <div class="hb-accordion-trigger">
                                    <div class="hb-acc-term-wrapper"><span class="hb-acc-term">Регистрационные документы</span></div>
                                    <span class="hb-acc-icon">+</span>
                                </div>
                                <div class="hb-accordion-content">
                                    <div class="hb-desc">Регистрационные документы на данное транспортное средство (кроме мопедов), а при наличии прицепа - и на прицеп (кроме прицепов к мопедам).</div>
                                </div>
                            </div>
                            <div class="hb-accordion-item">
                                <div class="hb-accordion-trigger">
                                    <div class="hb-acc-term-wrapper"><span class="hb-acc-term">Другие документы (Грузы/Такси)</span></div>
                                    <span class="hb-acc-icon">+</span>
                                </div>
                                <div class="hb-accordion-content">
                                    <div class="hb-desc">В установленных случаях разрешение на осуществление деятельности по перевозке пассажиров и багажа легковым такси, путевой лист и документы на перевозимый груз (транспортная накладная, заказ-наряд, сопроводительная ведомость), а также специальные разрешения, при наличии которых допускается движение тяжеловесного/крупногабаритного ТС или ТС с опасными грузами.</div>
                                </div>
                            </div>
                             <div class="hb-accordion-item">
                                <div class="hb-accordion-trigger">
                                    <div class="hb-acc-term-wrapper"><span class="hb-acc-term">Документ об инвалидности</span></div>
                                    <span class="hb-acc-icon">+</span>
                                </div>
                                <div class="hb-accordion-content">
                                    <div class="hb-desc">Документ, подтверждающий факт установления инвалидности, в случае управления транспортным средством, на котором установлен опознавательный знак "Инвалид".</div>
                                </div>
                            </div>
                        </div>
                        <div class="info-box-premium" style="margin-top: 1rem; border-left-color: hsl(var(--primary));">
                           <p><strong>Важно:</strong> Документы, предусмотренные настоящими Правилами, в случае их оформления в электронном виде, предъявляются в виде электронного документа или его копии на бумажном носителе.</p>
                        </div>
                    </div>
                </div>

                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.1.1(1)</div>
                    <div class="hb-rule-content">
                        <strong>Полис ОСАГО</strong>
                        В случаях, когда обязанность по страхованию своей гражданской ответственности установлена Федеральным законом "Об обязательном страховании...", представить по требованию сотрудников полиции для проверки страховой полис обязательного страхования гражданской ответственности владельца транспортного средства.
                    </div>
                </div>
                
                <div class="hb-accordion" style="margin-bottom: 2rem;">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper"><span class="hb-acc-term">2.1.1(2) Грузовики и Автобусы (Рейды)</span></div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">При управлении грузовым автомобилем или автобусом, в отношении которых осуществляется постоянный рейд, по требованию уполномоченных должностных лиц Федеральной службы по надзору в сфере транспорта в пунктах транспортного контроля (знак 7.14.2) останавливаться и предъявлять ТС и документы для проверки, а также проходить взвешивание.</div>
                        </div>
                    </div>
                </div>
                
                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.1.2</div>
                    <div class="hb-rule-content">
                        <strong>Ремни и шлемы</strong>
                        При движении на транспортном средстве, оборудованном ремнями безопасности, быть пристегнутым и не перевозить пассажиров, не пристегнутых ремнями. При управлении мотоциклом быть в застегнутом мотошлеме и не перевозить пассажиров без застегнутого мотошлема.
                    </div>
                </div>

                <h3 class="hb-category-title">2.2 Международное движение</h3>
                
                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.2</div>
                    <div class="hb-rule-content">
                        <strong>Водитель, участвующий в международном движении, обязан:</strong>
                        <ul class="styled-list">
                            <li>Иметь при себе регистрационные документы на ТС (и прицеп) и водительское удостоверение, соответствующие Конвенции о дорожном движении.</li>
                            <li>Иметь документы таможенные с отметками (при временном ввозе).</li>
                            <li>Иметь на ТС регистрационные и отличительные знаки государства регистрации.</li>
                        </ul>
                         <p style="margin-top: 1rem; font-size: 0.9em; opacity: 0.8;">Если ответственность застрахована в международной системе (Зеленая карта), предъявить соответствующий документ.</p>
                    </div>
                </div>
                
                <div class="hb-accordion" style="margin-bottom: 2rem;">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper"><span class="hb-acc-term">2.2.1 Таможенный контроль</span></div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Водитель ТС (в т.ч. не осуществляющего международные перевозки) обязан останавливаться и предъявлять таможенным органам ТС и товары в зонах таможенного контроля вдоль границы (или везде для ТС > 3.5т в местах со знаком 7.14.1).</div>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title">2.3 Техническое состояние</h3>
                
                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.3.1</div>
                    <div class="hb-rule-content">
                        <strong>Проверка перед выездом</strong>
                        Перед выездом проверить и в пути обеспечить исправное техническое состояние транспортного средства.
                        <br><br>
                        <span style="color: hsl(var(--red-500)); font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">ЗАПРЕЩАЕТСЯ ДВИЖЕНИЕ ПРИ:</span>
                        <ul class="styled-list" style="margin-top: 0.5rem;">
                            <li>Неисправности рабочей тормозной системы.</li>
                            <li>Неисправности рулевого управления.</li>
                            <li>Неисправности сцепного устройства (в составе автопоезда).</li>
                            <li>Негорящих (отсутствующих) фарах и задних габаритных огнях в темное время суток или в условиях недостаточной видимости.</li>
                            <li>Недействующем со стороны водителя стеклоочистителе во время дождя или снегопада.</li>
                        </ul>
                        <p style="margin-top: 1rem; font-size: 0.9em;">При прочих неисправностях — устранить на месте, а если невозможно — следовать к месту ремонта с соблюдением мер предосторожности.</p>
                    </div>
                </div>
                
                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.3.2</div>
                    <div class="hb-rule-content">
                        <strong>Освидетельствование</strong>
                        По требованию должностных лиц, уполномоченных на гос. надзор, проходить освидетельствование на состояние алкогольного опьянения и медицинское освидетельствование.
                        <br><em style="font-size: 0.8em; opacity: 0.7;">Водители ВС РФ и Росгвардии проходят проверку также по требованию ВАИ.</em>
                    </div>
                </div>
                
                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.3.3</div>
                    <div class="hb-rule-content">
                        <strong>Предоставление ТС</strong>
                        Обязан предоставлять транспортное средство:
                        <ul class="styled-list">
                             <li>Сотрудникам полиции, ФСБ, госохраны (в установленных законом неотложных случаях).</li>
                             <li>Медицинским и фарм. работникам для перевозки граждан в ближайшую больницу в случаях, угрожающих жизни.</li>
                        </ul>
                        <p style="margin-top: 0.5rem; font-size: 0.9em;">* Лица, воспользовавшиеся ТС, должны выдать справку (или талон) для возмещения расходов.</p>
                    </div>
                </div>
                
                 <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.3.4</div>
                    <div class="hb-rule-content">
                        <strong>Жилет</strong>
                        В случае вынужденной остановки или ДТП вне населенных пунктов (ночью/при плохой видимости) при нахождении на дороге быть одетым в куртку или жилет со световозвращающими полосами.
                    </div>
                </div>

                <h3 class="hb-category-title">2.4 Право остановки</h3>
                
                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">2.4</div>
                    <div class="hb-rule-content">
                        Право остановки предоставлено:
                        <ul class="styled-list">
                            <li>Регулировщикам.</li>
                            <li>Уполномоченным лицам Ространснадзора (для грузовиков/автобусов в спец. пунктах 7.14.2).</li>
                            <li>Уполномоченным лицам Таможни (в зонах контроля и для ТС > 3.5т).</li>
                        </ul>
                         <p style="margin-top: 0.5rem; font-size: 0.9em;">* Должностные лица должны быть в форме и иметь служебное удостоверение.</p>
                    </div>
                </div>

                <h3 class="hb-category-title">2.5 – 2.6 ДТП (Полный алгоритм)</h3>
                
                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--primary));">
                    <div class="hb-rule-num-v2">2.5</div>
                    <div class="hb-rule-content">
                        <strong>Обязанности при любом ДТП:</strong>
                        <br>1. Немедленно остановить (не трогать с места) ТС.
                        <br>2. Включить аварийную сигнализацию.
                        <br>3. Выставить знак аварийной остановки.
                        <br>4. Не перемещать предметы, имеющие отношение к происшествию.
                        <br>5. Соблюдать меры предосторожности на дороге.
                    </div>
                </div>
                
                 <div class="hb-accordion">
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">2.6 Если ПОГИБЛИ или РАНЕНЫ люди</span>
                            </div>
                             <span class="hb-tag-critical tiny">SOS</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                Водитель <strong>обязан:</strong>
                                <ol class="styled-list">
                                    <li>Принять меры для оказания первой помощи, вызвать скорую и полицию.</li>
                                    <li>В экстренных случаях — отправить пострадавших на попутном, а если невозможно — доставить на своем ТС в ближайшую мед. организацию (сообщить свои данные) и возвратиться к месту ДТП.</li>
                                    <li>Освободить проезжую часть, если движение невозможно (предварительно зафиксировав на фото/видео положение ТС, следы и предметы).</li>
                                    <li>Записать контакты очевидцев и ждать полицию.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">2.6.1 Если вред ТОЛЬКО ИМУЩЕСТВУ</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                <strong>Обязан:</strong> освободить проезжую часть, если создается препятствие (предварительно зафиксировав положение на фото/видео).
                                <br><br>
                                <strong>Оформление:</strong>
                                <ul>
                                    <li>Можно не сообщать в полицию и оставить место ДТП, если можно оформить Европротокол (без участия полиции) по закону об ОСАГО.</li>
                                    <li>Если оформить без полиции нельзя (нет согласия и т.д.) — записать очевидцев и сообщить в полицию для получения указаний.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>


                <h3 class="hb-category-title" style="color: hsl(var(--red-500)); margin-top: 3rem;">⛔ 2.7 ЗАПРЕЩАЕТСЯ</h3>
                
                <div class="hb-accordion">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Управление в опьянении</span>
                            </div>
                            <span class="hb-tag-critical tiny">ЛИШЕНИЕ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">Управлять транспортным средством в состоянии опьянения (алкогольного, наркотического или иного), под воздействием лекарственных препаратов, ухудшающих реакцию и внимание, в болезненном или утомленном состоянии, ставящем под угрозу безопасность движения.</div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Передача управления</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                             <div class="hb-desc">Передавать управление ТС лицам, находящимся в состоянии опьянения, под воздействием лекарств, в болезненном/утомленном состоянии, а также лицам, не имеющим при себе ВУ (кроме обучения).</div>
                        </div>
                    </div>
                    
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                             <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Пересекать колонны</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                             <div class="hb-desc">Пересекать организованные (в том числе и пешие) колонны и занимать место в них.</div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Алкоголь ПОСЛЕ ДТП</span>
                            </div>
                            <span class="hb-tag-critical tiny">ВАЖНО</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Употреблять алкогольные напитки, наркотические или психотропные вещества <strong>после</strong> ДТП, к которому водитель причастен, либо после остановки полицией, до проведения освидетельствования (или принятия решения об освобождении от него).</div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Нарушение режима труда</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Управлять ТС с нарушением режима труда и отдыха (установленного законом или международными договорами).</div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Телефон без Hands Free</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Пользоваться во время движения телефоном, не оборудованным техническим устройством, позволяющим вести переговоры без использования рук.</div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Опасное вождение</span>
                            </div>
                            <span class="hb-tag-critical tiny">НОВОЕ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                         <div class="hb-accordion-content">
                            <div class="hb-desc">Опасное вождение, выражающееся в неоднократном совершении одного или нескольких действий: невыполнение требования уступить дорогу, перестроение при интенсивном движении (шашки), несоблюдение дистанции и бокового интервала, резкое торможение без причины, препятствование обгону — если это создает угрозу гибели/ранения людей или повреждения имущества.</div>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    {
        id: "3",
        number: "3",
        title: "Применение спецсигналов",
        description: "Приоритет спецтранспорта, маячки разных цветов и обязанности водителей.",
        images: ["/images/handbook/section_3.png"],
        content: `
            <div class="pro-handbook">
                <div class="hb-hero">
                    <h1 class="hb-hero-title">Спецсигналы</h1>
                    <p class="hb-hero-subtitle">Глава 3. Приоритет спецтранспорта, маячки разных цветов и обязанности водителей при встрече с ними.</p>
                </div>

                <h3 class="hb-category-title">3.1 Синие и Красные маячки</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">3.1</div>
                    <div class="hb-rule-content">
                        <strong>Право отступать от правил</strong>
                        Водители ТС с включенным <strong>проблесковым маячком синего цвета</strong>, выполняя неотложное служебное задание, могут отступать от требований разделов 6 (кроме регулировщика) и 8-18 Правил, а также приложений 1 и 2, при условии обеспечения безопасности.
                        <br><br>
                        То же право имеют водители ТС с маячками <strong>синего и красного цветов</strong> (ГИБДД, ФСО, ФСБ, ВАИ).
                    </div>
                </div>

                <div class="hb-accordion" style="margin-top: 1rem;">
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Как получить преимущество?</span>
                            </div>
                            <span class="hb-tag-critical tiny">ВАЖНО</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                Для получения преимущества перед другими участниками водители таких ТС должны включить:
                                <ul class="styled-list">
                                    <li>Проблесковый маячок синего (или синего и красного) цвета.</li>
                                    <li><strong>И</strong> специальный звуковой сигнал.</li>
                                </ul>
                                <p style="margin-top: 0.5rem; font-weight: 600;">Воспользоваться приоритетом они могут только убедившись, что им уступают дорогу.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Сопровождаемые колонны</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                Приоритетом пользуются также водители ТС, сопровождаемых машинами с маячками синего/красного цветов и звуковым сигналом.
                                <br>На сопровождаемых ТС должен быть включен <strong>ближний свет фар</strong>.
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title">3.2 Обязанности других водителей</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--primary));">
                    <div class="hb-rule-num-v2">3.2</div>
                    <div class="hb-rule-content">
                        <strong>Уступить дорогу</strong>
                        При приближении ТС с синим (или сине-красным) маячком <strong>И</strong> звуковым сигналом водители обязаны:
                        <ul class="styled-list">
                            <li>Уступить дорогу.</li>
                            <li>Освободить полосу (ряд) или выполнить иной маневр для обеспечения беспрепятственного проезда.</li>
                        </ul>
                    </div>
                </div>

                <div class="hb-accordion">
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Обгон спецтранспорта</span>
                            </div>
                            <span class="hb-tag-critical tiny">ЗАПРЕТ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                               Запрещается выполнять обгон транспортного средства, имеющего нанесенные специальные цветографические схемы, с включенными синим маячком и звуковым сигналом.
                               <br><br>
                               Запрещается обгон и опережение ТС с сине-красными маячками и звуком, а также сопровождаемых ими колонн.
                            </div>
                        </div>
                    </div>

                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Вклинивание в колонну</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                               Запрещается двигаться по соседним полосам со скоростью колонны, создавая помехи или препятствуя ее организованному движению.
                            </div>
                        </div>
                    </div>
                    
                     <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Стоящий спецтранспорт (3.3)</span>
                            </div>
                             <span class="hb-tag-critical tiny">ВНИМАНИЕ</span>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                               Приближаясь к стоящему ТС с включенным синим маячком, водитель должен снизить скорость, чтобы иметь возможность немедленно остановиться в случае необходимости.
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title" style="color: hsl(var(--orange-500));">3.4 Желтые и Оранжевые маячки</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--orange-500));">
                    <div class="hb-rule-num-v2">3.4</div>
                    <div class="hb-rule-content">
                        <strong>Предупреждение, но не приоритет</strong>
                        Включенный маячок желтого или оранжевого цвета <strong>не дает преимущества</strong> в движении и служит для предупреждения об опасности.
                    </div>
                </div>

                <div class="hb-accordion">
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Когда применяется?</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                <ul class="styled-list">
                                    <li>Строительство, ремонт, содержание дорог.</li>
                                    <li>Эвакуация/погрузка неисправных ТС.</li>
                                    <li>Перевозка крупногабаритных, тяжеловесных, опасных грузов.</li>
                                    <li>Сопровождение организованных групп велосипедистов (тренировки).</li>
                                    <li>Организованная перевозка группы детей.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hb-accordion-item">
                        <div class="hb-accordion-trigger">
                            <div class="hb-acc-term-wrapper">
                                <span class="hb-acc-term">Отступления от правил (3.5)</span>
                            </div>
                            <span class="hb-acc-icon">+</span>
                        </div>
                        <div class="hb-accordion-content">
                            <div class="hb-desc">
                                Водители ТС с включенным маячком желтого или оранжевого цвета при выполнении работ по строительству, ремонту или содержанию дорог, погрузке поврежденных/неисправных ТС могут отступать от требований дорожных знаков (кроме знаков 2.2 <img src="/images/signs/2.2.png" class="hb-inline-sign" alt="2.2" />, 2.4 <img src="/images/signs/2.4.png" class="hb-inline-sign" alt="2.4" /> <img src="/images/signs/2.5.png" class="hb-inline-sign" alt="2.5" /> – 2.6 <img src="/images/signs/2.6.png" class="hb-inline-sign" alt="2.6" />, 3.11 <img src="/images/signs/3.11.png" class="hb-inline-sign" alt="3.11" /> – 3.14 <img src="/images/signs/3.14.png" class="hb-inline-sign" alt="3.14" />, 3.17.2 <img src="/images/signs/3.17.2.png" class="hb-inline-sign" alt="3.17.2" />, 3.20 <img src="/images/signs/3.20.png" class="hb-inline-sign" alt="3.20" />) и дорожной разметки, а также пунктов 9.4 - 9.8 и 16.1 Правил при условии обеспечения безопасности.
                                <br><br>
                                Крупногабариты с желтым маячком могут отступать от требований разметки для безопасности.
                            </div>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title">3.6 Бело-лунные маячки</h3>
                
                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">3.6</div>
                    <div class="hb-rule-content">
                        <strong>Инкассация и Почта</strong>
                        Маячок бело-лунного цвета включается <strong>только при нападениях</strong> на ТС почтовой связи или перевозящие ценные грузы/деньги.
                        <br>
                        <span style="opacity: 0.8; font-size: 0.9em; display: block; margin-top: 0.5rem;">Не дает преимущества. Служит для привлечения внимания полиции.</span>
                    </div>
                </div>

            </div>
        `
    },
    {
        id: "4",
        number: "4",
        title: "Обязанности пешеходов",
        description: "Где ходить, как переходить дорогу, светоотражатели и правила для групп детей.",
        images: ["/images/handbook/section_4.png"],
        content: `
            <div class="pro-handbook">
                <div class="hb-hero">
                    <h1 class="hb-hero-title">Обязанности пешеходов</h1>
                    <p class="hb-hero-subtitle">Глава 4. Правила движения пешеходов, перехода дороги и взаимодействия с транспортом. ПДД РФ 2025.</p>
                </div>

                <h3 class="hb-category-title">4.1 Где должны двигаться пешеходы</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">4.1</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">
                            Пешеходы должны двигаться по <strong>тротуарам</strong>, <strong>пешеходным дорожкам</strong>, <strong>велопешеходным дорожкам</strong>, а при их отсутствии — по <strong>обочинам</strong>.
                        </p>
                        <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1rem;">
                            Пешеходы, перевозящие или переносящие громоздкие предметы, а также лица в инвалидных колясках, могут двигаться по краю проезжей части, если создают помехи другим пешеходам.
                        </p>
                        <em style="font-size: 0.85em; opacity: 0.7;">(в ред. Постановлений Правительства РФ от 22.03.2014 N 221, от 24.11.2018 N 1414)</em>
                    </div>
                </div>

                <div class="info-box-premium" style="margin-top: 1.5rem; border-left-color: hsl(var(--primary));">
                    <p style="margin-bottom: 0.75rem;"><strong>📍 При отсутствии тротуаров</strong> пешеходы могут:</p>
                    <ul class="styled-list">
                        <li>Двигаться по велосипедной дорожке (уступая велосипедистам и СИМ).</li>
                        <li>Идти <strong>в один ряд</strong> по краю проезжей части.</li>
                        <li>На дорогах с разделительной полосой — по внешнему краю.</li>
                    </ul>
                </div>

                <div class="hb-rule-card-v2" style="margin-top: 1.5rem; border-left-color: hsl(var(--orange-500));">
                    <div class="hb-rule-num-v2" style="background: linear-gradient(135deg, hsl(var(--orange-500)), hsl(var(--orange-600)));">⚠️</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Направление движения по краю дороги</p>
                        <p style="font-size: 1.05rem; line-height: 1.7;">
                            При движении по краю проезжей части пешеходы должны идти <strong style="color: hsl(var(--primary));">НАВСТРЕЧУ</strong> движению транспортных средств.
                        </p>
                        <p style="font-size: 0.95rem; margin-top: 0.75rem; opacity: 0.9;">
                            <strong>Исключение:</strong> лица в инвалидных колясках и ведущие мотоцикл, мопед, велосипед, СИМ — следуют <em>по ходу движения</em> ТС.
                        </p>
                    </div>
                </div>

                <div class="hb-rule-card-v2" style="margin-top: 1.5rem; border-left-color: hsl(var(--yellow-500)); background: linear-gradient(135deg, hsl(var(--yellow-500) / 0.08), transparent);">
                    <div class="hb-rule-num-v2" style="background: linear-gradient(135deg, hsl(var(--yellow-500)), hsl(var(--yellow-600)));">🔦</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Световозвращающие элементы</p>
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 0.75rem;">
                            При движении в <strong>темное время суток</strong> или при недостаточной видимости:
                        </p>
                        <ul class="styled-list" style="margin-bottom: 0.75rem;">
                            <li><strong>В населенных пунктах</strong> — рекомендуется иметь световозвращатели.</li>
                            <li><strong>Вне населенных пунктов</strong> — <span style="color: hsl(var(--red-500)); font-weight: 700;">ОБЯЗАНЫ</span> иметь и обеспечить их видимость.</li>
                        </ul>
                        <em style="font-size: 0.85em; opacity: 0.7;">(в ред. Постановления Правительства РФ от 14.11.2014 N 1197)</em>
                    </div>
                </div>

                <h3 class="hb-category-title">4.2 Организованные колонны и группы детей</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">4.2</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Организованные пешие колонны</p>
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            Движение по проезжей части разрешается только <strong>по направлению движения ТС</strong>, по правой стороне, не более чем по <strong>4 человека в ряд</strong>.
                        </p>
                        
                        <div style="background: hsl(var(--muted) / 0.3); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">🚩 Сопровождение колонны:</p>
                            <p style="font-size: 0.95rem; line-height: 1.6;">
                                Спереди и сзади <strong>с левой стороны</strong> — сопровождающие с <strong>красными флажками</strong>.<br>
                                Ночью: спереди — <strong>белый фонарь</strong>, сзади — <strong>красный</strong>.
                            </p>
                        </div>

                        <div style="background: linear-gradient(135deg, hsl(var(--orange-500) / 0.1), transparent); border-left: 3px solid hsl(var(--orange-500)); border-radius: 0 0.5rem 0.5rem 0; padding: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">👶 Группы детей</p>
                            <p style="font-size: 0.95rem; line-height: 1.6;">
                                Только по тротуарам и пешеходным дорожкам (при отсутствии — по обочинам).<br>
                                <strong style="color: hsl(var(--orange-500));">Только в светлое время суток и только в сопровождении взрослых!</strong>
                            </p>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title">4.3 Переход дороги</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--primary));">
                    <div class="hb-rule-num-v2">4.3</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">Где переходить дорогу</p>
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            Пешеходы должны переходить дорогу по <strong>пешеходным переходам</strong> (наземным, подземным, надземным), а при их отсутствии — на перекрестках <strong>по линии тротуаров или обочин</strong>.
                        </p>

                        <div style="background: hsl(var(--muted) / 0.3); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">↗️ Диагональный переход</p>
                            <p style="font-size: 0.95rem; line-height: 1.6;">
                                На регулируемом перекрестке допускается переход по диагонали <strong>только при наличии разметки 1.14.3</strong>.
                                <br><em style="font-size: 0.85em; opacity: 0.7;">(в ред. Постановления Правительства РФ от 06.10.2022 N 1769)</em>
                            </p>
                        </div>

                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 0.75rem;">
                            <strong>При отсутствии в зоне видимости</strong> перехода или перекрестка разрешается переходить:
                        </p>
                        <ul class="styled-list">
                            <li>Под прямым углом к краю проезжей части.</li>
                            <li>На участках без разделительной полосы и ограждений.</li>
                            <li>Там, где дорога хорошо просматривается в обе стороны.</li>
                        </ul>
                        <p style="font-size: 0.9rem; margin-top: 0.75rem; opacity: 0.8;">
                            <em>Требования п. 4.3 не распространяются на велосипедные зоны.</em>
                        </p>
                    </div>
                </div>

                <h3 class="hb-category-title">4.4 Сигналы регулирования</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">4.4</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1rem; line-height: 1.7;">
                            В местах, где движение регулируется, пешеходы должны руководствоваться сигналами <strong>регулировщика</strong>, <strong>пешеходного светофора</strong>, а при его отсутствии — <strong>транспортного светофора</strong>.
                        </p>
                    </div>
                </div>

                <h3 class="hb-category-title">4.5 Безопасность перехода</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--orange-500));">
                    <div class="hb-rule-num-v2">4.5</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            На переходах пешеходы могут выходить на проезжую часть <strong>после того, как</strong> оценят расстояние до приближающихся ТС, их скорость и убедятся в безопасности перехода.
                        </p>
                        <div style="background: linear-gradient(135deg, hsl(var(--red-500) / 0.1), transparent); border-left: 3px solid hsl(var(--red-500)); border-radius: 0 0.5rem 0.5rem 0; padding: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">⚠️ Вне пешеходного перехода:</p>
                            <ul class="styled-list" style="margin: 0;">
                                <li>Не создавать помех для движения ТС.</li>
                                <li>Не выходить из-за стоящего ТС, не убедившись в отсутствии приближающихся ТС.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title">4.6 На проезжей части</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--red-500));">
                    <div class="hb-rule-num-v2">4.6</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            Выйдя на проезжую часть, пешеходы <strong>не должны задерживаться или останавливаться</strong>, если это не связано с обеспечением безопасности.
                        </p>
                        <div style="background: hsl(var(--muted) / 0.3); border-radius: 0.75rem; padding: 1rem;">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">🏝️ Не успели перейти?</p>
                            <p style="font-size: 0.95rem; line-height: 1.6;">
                                Остановитесь на <strong>островке безопасности</strong> или на линии, разделяющей потоки. Продолжайте переход, убедившись в безопасности и с учетом сигнала светофора.
                            </p>
                        </div>
                    </div>
                </div>

                <h3 class="hb-category-title" style="color: hsl(var(--red-500));">4.7 Спецтранспорт</h3>

                <div class="hb-rule-card-v2" style="border-left-color: hsl(var(--red-500)); background: linear-gradient(135deg, hsl(var(--red-500) / 0.05), transparent);">
                    <div class="hb-rule-num-v2" style="background: linear-gradient(135deg, hsl(var(--red-500)), hsl(var(--red-600)));">🚨</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;">При приближении спецтранспорта</p>
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 0.75rem;">
                            При приближении ТС с <strong>проблесковым маячком синего цвета</strong> (или синего и красного) <strong>И звуковым сигналом</strong> пешеходы обязаны:
                        </p>
                        <ul class="styled-list" style="margin-bottom: 0.75rem;">
                            <li><strong>Воздержаться</strong> от перехода дороги.</li>
                            <li>Если на проезжей части — <strong>незамедлительно освободить</strong> её.</li>
                        </ul>
                        <em style="font-size: 0.85em; opacity: 0.7;">(п. 4.7 в ред. Постановления Правительства РФ от 14.11.2014 N 1197)</em>
                    </div>
                </div>

                <h3 class="hb-category-title">4.8 Ожидание транспорта</h3>

                <div class="hb-rule-card-v2">
                    <div class="hb-rule-num-v2">4.8</div>
                    <div class="hb-rule-content">
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            Ожидать маршрутное ТС и такси разрешается только на <strong>приподнятых посадочных площадках</strong>, при их отсутствии — на тротуаре или обочине.
                        </p>
                        <p style="font-size: 1rem; line-height: 1.7; margin-bottom: 1rem;">
                            На остановках без приподнятых площадок — выходить на проезжую часть для посадки можно <strong>только после остановки ТС</strong>. После высадки — немедленно освободить проезжую часть.
                        </p>
                        <p style="font-size: 0.95rem; opacity: 0.9;">
                            При движении к остановке через проезжую часть — руководствоваться пунктами <strong>4.4 – 4.7</strong>.
                        </p>
                    </div>
                </div>

                <div class="info-box-premium" style="margin-top: 2rem; background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05)); border-left-color: hsl(var(--primary));">
                    <p style="font-size: 1.1em; font-weight: 600; margin-bottom: 0.75rem;">📋 Резюме главы 4</p>
                    <ul class="styled-list">
                        <li>Двигаться по тротуарам, при их отсутствии — по обочинам.</li>
                        <li>По краю дороги — <strong>навстречу</strong> движению ТС.</li>
                        <li>Вне населенных пунктов ночью — обязательны световозвращатели.</li>
                        <li>Переходить по переходам, на перекрестках — по линии тротуаров.</li>
                        <li>При спецсигналах — немедленно освободить дорогу.</li>
                    </ul>
                </div>

            </div>
        `
    }
];
