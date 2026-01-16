/**
 * ============================================
 * UNIVERSAL BROWSER COLLECTOR V10.6 (Total-Check)
 * ============================================
 * 
 * ЧТО НОВОГО:
 * - Сквозная проверка на 404: теперь ловит ошибку даже на этапе результатов.
 * - Улучшенная логика ретраев.
 */

(function () {
    async function orchestrator() {
        console.log('🚀 Orchestrator V10.6 Starting...');

        var categoryBase = "test";
        var topicNum = 0;
        var tag = "general";

        var mainHeader = (document.querySelector('.section-title h4, h1, h2, .badcome-sin-tex') || {}).innerText || "";
        if (mainHeader.toLowerCase().indexOf('tema') !== -1) {
            var match = mainHeader.match(/Tema\s*(\d+)/i);
            topicNum = match ? parseInt(match[1]) : 1;
            categoryBase = "topic-" + String(topicNum).padStart(2, '0');
            tag = "topic";
        } else {
            tag = mainHeader.toLowerCase().indexOf('dgt') !== -1 ? "dgt" : "essential";
            categoryBase = tag;
        }

        var links = Array.from(document.querySelectorAll('.test-slider-items a'))
            .filter(function (a) {
                return a.href && a.href.indexOf('#') === -1 && a.href.indexOf('/test/') !== -1;
            })
            .map(function (a) {
                var nameText = (a.querySelector('h4') || {}).innerText || '001';
                var numMatch = nameText.match(/(\d+)/);
                return {
                    url: a.href,
                    testNum: numMatch ? numMatch[1].padStart(3, '0') : '001'
                };
            });

        if (links.length === 0) return alert('❌ Тесты не найдены.');
        if (!confirm('Всего тестов: ' + links.length + '. Начать сбор [' + categoryBase + ']?')) return;

        for (var i = 0; i < links.length; i++) {
            var test = links[i];
            var config = { categoryTitle: categoryBase, topicNum: topicNum, tag: tag, testNum: test.testNum };

            var success = false;
            var maxAttempts = 2;

            for (var attempt = 1; attempt <= maxAttempts; attempt++) {
                console.log('\n🔷 [' + (i + 1) + '/' + links.length + '] ' + categoryBase + '_test-' + test.testNum + (attempt > 1 ? ' (Повторно)' : ''));

                success = await processIndividualTest(test.url, config);
                if (success) break;

                if (attempt < maxAttempts) {
                    await new Promise(function (r) { setTimeout(r, 2000); });
                }
            }
        }
        console.log('✅ Все задачи выполнены!');
    }

    async function processIndividualTest(url, config) {
        var testWindow = window.open(url, '_blank', 'width=1200,height=900');
        if (!testWindow) return false;

        return new Promise(function (resolve) {
            var globalTimeout = setTimeout(function () {
                console.warn('  - [!] Тайм-аут 60с');
                try { testWindow.close(); } catch (e) { }
                resolve(false);
            }, 60000);

            // Единая функция проверки на смерть страницы
            function isDead() {
                try {
                    if (!testWindow || testWindow.closed) return true;
                    var title = (testWindow.document.title || "").toLowerCase();
                    var body = testWindow.document.body ? testWindow.document.body.innerText.toLowerCase() : "";
                    var href = testWindow.location.href.toLowerCase();

                    if (title.indexOf('encontrada') !== -1 || body.indexOf('página no encontrada') !== -1 || href.indexOf('error') !== -1) {
                        return true;
                    }
                } catch (e) { /* Если CORS мешает читать, игнорируем пока не прогрузится */ }
                return false;
            }

            var checker = setInterval(function () {
                if (isDead()) {
                    console.error('  - [!] ОБНАРУЖЕНА ОШИБКА 404 / ERROR');
                    clearInterval(checker);
                    clearTimeout(globalTimeout);
                    testWindow.close();
                    resolve(false);
                    return;
                }

                try {
                    if (testWindow.document.readyState === 'complete' && testWindow.document.getElementById('mainTest')) {
                        clearInterval(checker);
                        console.log('  - Запуск солвера...');

                        var s = testWindow.document.createElement('script');
                        s.textContent = '(' + solver.toString() + ')(' + JSON.stringify(config) + ');';
                        testWindow.document.body.appendChild(s);

                        // Следим за переходом к результатам
                        var navChecker = setInterval(function () {
                            if (isDead()) {
                                console.error('  - [!] Ошибка после решения теста');
                                clearInterval(navChecker);
                                clearTimeout(globalTimeout);
                                testWindow.close();
                                resolve(false);
                                return;
                            }

                            try {
                                if (testWindow.location.href.indexOf('test-result') !== -1) {
                                    clearInterval(navChecker);

                                    var resChecker = setInterval(function () {
                                        var div = testWindow.document.querySelector('.fallos-color-wrapper');
                                        if (testWindow.document.readyState === 'complete' && div) {
                                            clearInterval(resChecker);
                                            console.log('  - Сохранение JSON...');

                                            var p = testWindow.document.createElement('script');
                                            p.textContent = '(' + resultParser.toString() + ')(' + JSON.stringify(config) + ');';
                                            testWindow.document.body.appendChild(p);

                                            var doneListener = function (e) {
                                                if (e.data === 'test_captured_done') {
                                                    window.removeEventListener('message', doneListener);
                                                    clearTimeout(globalTimeout);
                                                    testWindow.close();
                                                    resolve(true);
                                                }
                                            };
                                            window.addEventListener('message', doneListener);
                                        }
                                    }, 1000);
                                }
                            } catch (e) { }
                        }, 1000);
                    }
                } catch (e) { }
            }, 1000);
        });
    }

    function solver(cfg) {
        async function run() {
            var mainTest = document.getElementById('mainTest');
            var total = parseInt(mainTest ? mainTest.getAttribute('data-num-questions') : "30");
            for (var i = 0; i < total; i++) {
                var ans = document.querySelector('.owl-item.active .answerAction');
                if (ans) ans.click();
                if (window.$) window.$('.owl-carousel').trigger('next.owl.carousel');
                await new Promise(function (r) { setTimeout(r, 120); });
            }
            var exit = document.querySelector('.exit-test-block');
            if (exit) exit.click();
            await new Promise(function (r) { setTimeout(r, 800); });
            var fin = document.querySelector('.modal-content a[href*="finalizar"]');
            if (fin) fin.click();

            var att = 0;
            var v = setInterval(function () {
                var btn = Array.from(document.querySelectorAll('a')).find(function (a) {
                    return a.textContent.toLowerCase().indexOf('resultados') !== -1;
                });
                if (btn) { clearInterval(v); btn.click(); }
                if (att++ > 15) clearInterval(v);
            }, 1000);
        }
        run();
    }

    function resultParser(cfg) {
        var results = [];
        var seen = {};
        var wrappers = document.querySelectorAll('.fallos-color-wrapper');
        for (var i = 0; i < wrappers.length; i++) {
            var w = wrappers[i];
            var p = w.querySelector('.fallos-blk.hide-mobile p') || w.querySelector('.fallos-blk p');
            if (!p) continue;
            var txt = p.textContent.trim();
            var s = p.querySelector('span');
            if (s) txt = txt.substring(s.textContent.length).trim();
            txt = txt.replace(/\s+/g, ' ').trim();
            if (!txt || seen[txt]) continue;
            seen[txt] = true;
            var imgEl = w.querySelector('.fallos-thumb img') || w.querySelector('.fallos-blk img');
            var schEl = w.querySelector('.pop-src[data-type="img"]');
            var ansEls = Array.from(w.querySelectorAll('.fallos-button a'));
            results.push({
                topic_number: cfg.topicNum,
                question_number: results.length + 1,
                category: "B",
                question: { es: txt, en: null, ru: null },
                answers: ansEls.map(function (a, idx) {
                    return {
                        id: String.fromCharCode(97 + idx),
                        text: { es: a.innerText.replace(/^[a-c][.)\s]*/i, '').trim(), en: null, ru: null },
                        is_correct: a.classList.contains('ok') || (a.parentElement && a.parentElement.classList.contains('ok'))
                    };
                }),
                explanation: { es: null, en: null, ru: null },
                image_url: imgEl ? imgEl.src : null,
                schema_url: schEl ? new URL(schEl.getAttribute('data-src'), window.location.origin).href : null,
                source: "practicavial",
                tags: ["practicavial", cfg.tag]
            });
        }
        if (results.length > 0) {
            var file = cfg.categoryTitle + '_test-' + cfg.testNum + '.json';
            var blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = file; a.click();
        }
        setTimeout(function () { window.opener.postMessage('test_captured_done', '*'); }, 1000);
    }

    orchestrator();
})();
