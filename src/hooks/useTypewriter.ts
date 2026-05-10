import { useCallback, useRef } from 'react';

/**
 * useTypewriter — буферизирует входящие чанки и выпускает их в onFlush
 * с фиксированной скоростью (как ChatGPT). Если стрим закончился раньше,
 * чем напечатано всё — допечатывает хвост за следующие N кадров.
 *
 * Пример:
 *   const tw = useTypewriter({ charsPerSecond: 60 });
 *   tw.start((chunk) => updateLastMessage(chunk));
 *   // в onChunk:  tw.push(text)
 *   // в onDone:   tw.finish()
 */

interface Options {
  /** Сколько символов в секунду показывать. Дефолт: 60 (комфортная скорость чтения вслух). */
  charsPerSecond?: number;
}

interface Controller {
  /**
   * Подписаться на печать символов.
   * @param onFlush     вызывается с очередным куском символов
   * @param onComplete  вызывается ОДИН раз когда буфер допечатан после finish()
   */
  start: (onFlush: (text: string) => void, onComplete?: () => void) => void;
  /** Положить чанк в буфер. */
  push: (text: string) => void;
  /** Стрим закончен — допечатать хвост и остановиться. */
  finish: () => void;
  /** Прервать всё немедленно. */
  cancel: () => void;
}

export function useTypewriter(options: Options = {}): Controller {
  const { charsPerSecond = 60 } = options;

  const bufferRef = useRef('');           // ещё не показанный текст
  const onFlushRef = useRef<((s: string) => void) | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const finishedRef = useRef(false);      // стрим закрыт, опустошаем хвост

  const stop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const fireComplete = () => {
    const cb = onCompleteRef.current;
    onCompleteRef.current = null; // только один раз
    if (cb) cb();
  };

  const tick = useCallback((now: number) => {
    if (!onFlushRef.current) { stop(); return; }

    const dt = now - lastTickRef.current;
    lastTickRef.current = now;

    // Сколько символов «успели напечатать» за это время.
    // Если стрим закончился — печатаем быстрее (×3) чтобы не висеть.
    const speed = finishedRef.current ? charsPerSecond * 3 : charsPerSecond;
    let charsToFlush = Math.max(1, Math.floor((dt / 1000) * speed));

    if (bufferRef.current.length === 0) {
      if (finishedRef.current) { stop(); fireComplete(); return; }
      // буфер пуст, но стрим живой — продолжаем крутить RAF, ждём чанков
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (charsToFlush > bufferRef.current.length) charsToFlush = bufferRef.current.length;

    const slice = bufferRef.current.slice(0, charsToFlush);
    bufferRef.current = bufferRef.current.slice(charsToFlush);
    onFlushRef.current(slice);

    if (bufferRef.current.length === 0 && finishedRef.current) {
      stop();
      fireComplete();
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [charsPerSecond]);

  const start: Controller['start'] = useCallback((onFlush, onComplete) => {
    onFlushRef.current = onFlush;
    onCompleteRef.current = onComplete ?? null;
    bufferRef.current = '';
    finishedRef.current = false;
    lastTickRef.current = performance.now();
    stop();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const push: Controller['push'] = useCallback((text) => {
    bufferRef.current += text;
    if (rafRef.current === null) {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const finish: Controller['finish'] = useCallback(() => {
    finishedRef.current = true;
    if (rafRef.current === null && bufferRef.current.length > 0) {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const cancel: Controller['cancel'] = useCallback(() => {
    stop();
    bufferRef.current = '';
    finishedRef.current = true;
    onCompleteRef.current = null;
  }, []);

  return { start, push, finish, cancel };
}
