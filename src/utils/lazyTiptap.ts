/**
 * Lazy loader для Tiptap редактора
 * Загружается только когда действительно нужен (в админке)
 * Уменьшает основной bundle на ~150KB
 */

let tiptapModules: {
  react?: typeof import("@tiptap/react");
  starterKit?: typeof import("@tiptap/starter-kit");
  extensions?: {
    image?: typeof import("@tiptap/extension-image");
    link?: typeof import("@tiptap/extension-link");
    placeholder?: typeof import("@tiptap/extension-placeholder");
    mention?: typeof import("@tiptap/extension-mention");
    characterCount?: typeof import("@tiptap/extension-character-count");
    table?: typeof import("@tiptap/extension-table");
    tableRow?: typeof import("@tiptap/extension-table-row");
    tableCell?: typeof import("@tiptap/extension-table-cell");
    tableHeader?: typeof import("@tiptap/extension-table-header");
  };
  html?: typeof import("@tiptap/html");
} = {};

export const loadTiptap = async () => {
  if (tiptapModules.react) return tiptapModules;

  try {
    const [
      react,
      starterKit,
      image,
      link,
      placeholder,
      mention,
      characterCount,
      table,
      tableRow,
      tableCell,
      tableHeader,
      html
    ] = await Promise.all([
      import("@tiptap/react"),
      import("@tiptap/starter-kit"),
      import("@tiptap/extension-image"),
      import("@tiptap/extension-link"),
      import("@tiptap/extension-placeholder"),
      import("@tiptap/extension-mention"),
      import("@tiptap/extension-character-count"),
      import("@tiptap/extension-table"),
      import("@tiptap/extension-table-row"),
      import("@tiptap/extension-table-cell"),
      import("@tiptap/extension-table-header"),
      import("@tiptap/html")
    ]);

    tiptapModules = {
      react,
      starterKit,
      extensions: { image, link, placeholder, mention, characterCount, table, tableRow, tableCell, tableHeader },
      html
    };

    return tiptapModules;
  } catch (error) {
    console.error('Failed to load Tiptap:', error);
    throw new Error('Не удалось загрузить редактор');
  }
};

export const getTiptap = () => tiptapModules;