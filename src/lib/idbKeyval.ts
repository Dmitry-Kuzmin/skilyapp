type IdbKeyvalModule = typeof import('idb-keyval');
type IdbKey = Parameters<IdbKeyvalModule['get']>[0];
type IdbStore = Parameters<IdbKeyvalModule['get']>[1];

let idbKeyvalPromise: Promise<IdbKeyvalModule> | null = null;

function loadIdbKeyval(): Promise<IdbKeyvalModule> {
  if (!idbKeyvalPromise) {
    idbKeyvalPromise = import('idb-keyval');
  }

  return idbKeyvalPromise;
}

export async function idbGet<T = unknown>(key: IdbKey, customStore?: IdbStore): Promise<T | undefined> {
  const { get } = await loadIdbKeyval();
  return get<T>(key, customStore);
}

export async function idbSet(key: IdbKey, value: unknown, customStore?: IdbStore): Promise<void> {
  const { set } = await loadIdbKeyval();
  await set(key, value, customStore);
}

export async function idbDel(key: IdbKey, customStore?: IdbStore): Promise<void> {
  const { del } = await loadIdbKeyval();
  await del(key, customStore);
}
