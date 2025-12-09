import { useState } from "react";
import { getFingerprint, resetFingerprintCache } from "@/lib/fingerprint";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function FingerprintTest() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    first: string | null;
    second: string | null;
    cached: string | null;
  }>({
    first: null,
    second: null,
    cached: null,
  });

  const testFingerprint = async () => {
    setLoading(true);
    setError(null);
    setFingerprint(null);

    try {
      const hash = await getFingerprint();
      setFingerprint(hash);
      console.log('[FingerprintTest] Fingerprint hash:', hash);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error('[FingerprintTest] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testCaching = async () => {
    setLoading(true);
    setError(null);
    setTestResults({ first: null, second: null, cached: null });

    try {
      // Первый вызов
      resetFingerprintCache();
      const first = await getFingerprint();
      setTestResults(prev => ({ ...prev, first }));

      // Второй вызов (должен использовать кэш)
      const second = await getFingerprint();
      setTestResults(prev => ({ ...prev, second }));

      // Проверяем, что они одинаковые
      const cached = first === second ? '✅ Кэш работает' : '❌ Кэш не работает';
      setTestResults(prev => ({ ...prev, cached: cached }));

      console.log('[FingerprintTest] Caching test:', { first, second, match: first === second });
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error('[FingerprintTest] Caching test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Fingerprint className="h-5 w-5 text-primary" />
            Тест Browser Fingerprinting
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Проверка работы FingerprintJS для идентификации устройств
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Основной тест */}
          <div className="space-y-3">
            <Button
              onClick={testFingerprint}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Генерация fingerprint...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Получить Fingerprint Hash
                </>
              )}
            </Button>

            {fingerprint && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-white">Fingerprint получен:</span>
                </div>
                <code className="text-xs text-emerald-400 font-mono break-all block mt-2">
                  {fingerprint}
                </code>
                <p className="text-xs text-zinc-400 mt-2">
                  Этот хеш уникален для вашего устройства и браузера
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="font-semibold text-white">Ошибка:</span>
                </div>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Тест кэширования */}
          <div className="border-t border-zinc-800 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Тест кэширования</h3>
            <Button
              onClick={testCaching}
              disabled={loading}
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Проверить кэширование
            </Button>

            {testResults.first && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                  <span className="text-zinc-400">Первый вызов:</span>
                  <code className="text-xs text-zinc-300 font-mono">
                    {testResults.first.substring(0, 20)}...
                  </code>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
                  <span className="text-zinc-400">Второй вызов:</span>
                  <code className="text-xs text-zinc-300 font-mono">
                    {testResults.second?.substring(0, 20)}...
                  </code>
                </div>
                {testResults.cached && (
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <Badge
                      variant={testResults.cached.includes('✅') ? 'default' : 'destructive'}
                      className={
                        testResults.cached.includes('✅')
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }
                    >
                      {testResults.cached}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Инструкции */}
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-white mb-2">Как проверить:</h3>
            <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
              <li>Нажмите "Получить Fingerprint Hash" — должен появиться уникальный хеш</li>
              <li>Проверьте кэширование — два вызова должны вернуть одинаковый хеш</li>
              <li>Откройте в другом браузере/устройстве — хеш должен отличаться</li>
              <li>Проверьте консоль браузера (F12) для детальных логов</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

