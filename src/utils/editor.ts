function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:|\/)/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function renderMarks(text: string, marks: Array<Record<string, unknown>> = []): string {
  return marks.reduce((output, mark) => {
    const type = typeof mark?.type === "string" ? mark.type : "";
    const attrs = typeof mark?.attrs === "object" && mark.attrs !== null ? mark.attrs as Record<string, unknown> : {};

    switch (type) {
      case "bold":
        return `<strong>${output}</strong>`;
      case "italic":
        return `<em>${output}</em>`;
      case "strike":
        return `<s>${output}</s>`;
      case "code":
        return `<code>${output}</code>`;
      case "link": {
        const href = sanitizeUrl(attrs.href);
        if (!href) return output;
        return `<a href="${escapeAttribute(href)}" rel="noopener noreferrer">${output}</a>`;
      }
      case "textStyle": {
        const styles: string[] = [];
        if (typeof attrs.color === "string" && attrs.color.trim()) {
          styles.push(`color:${attrs.color.trim()}`);
        }
        if (!styles.length) return output;
        return `<span style="${escapeAttribute(styles.join(";"))}">${output}</span>`;
      }
      default:
        return output;
    }
  }, text);
}

function renderChildren(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content.map((node) => renderNode(node)).join("");
}

function renderNode(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }

  const typedNode = node as Record<string, unknown>;
  const type = typeof typedNode.type === "string" ? typedNode.type : "";
  const attrs = typeof typedNode.attrs === "object" && typedNode.attrs !== null ? typedNode.attrs as Record<string, unknown> : {};
  const children = renderChildren(typedNode.content);

  switch (type) {
    case "doc":
      return children;
    case "paragraph": {
      const style = typeof attrs.textAlign === "string" ? ` style="text-align:${escapeAttribute(attrs.textAlign)}"` : "";
      return `<p${style}>${children || "<br>"}</p>`;
    }
    case "text": {
      const text = typeof typedNode.text === "string" ? escapeHtml(typedNode.text) : "";
      const marks = Array.isArray(typedNode.marks) ? typedNode.marks as Array<Record<string, unknown>> : [];
      return renderMarks(text, marks);
    }
    case "heading": {
      const level = typeof attrs.level === "number" ? Math.min(6, Math.max(1, attrs.level)) : 2;
      const style = typeof attrs.textAlign === "string" ? ` style="text-align:${escapeAttribute(attrs.textAlign)}"` : "";
      return `<h${level}${style}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const src = sanitizeUrl(attrs.src);
      if (!src) return "";
      const alt = typeof attrs.alt === "string" ? attrs.alt : "";
      const title = typeof attrs.title === "string" ? attrs.title : "";
      const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
      return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${titleAttr} />`;
    }
    case "mention": {
      const label = typeof attrs.label === "string" ? attrs.label : typeof typedNode.text === "string" ? typedNode.text : "";
      return `<span class="term-mention">${escapeHtml(label)}</span>`;
    }
    case "table":
      return `<table><tbody>${children}</tbody></table>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableHeader":
      return `<th>${children}</th>`;
    case "tableCell":
      return `<td>${children}</td>`;
    default:
      return children;
  }
}

/**
 * Generates HTML preview from stored content without relying on TipTap runtime packages.
 */
export function generateHTMLPreview(content: unknown): string {
  if (!content) return "";

  if (typeof content === "string") {
    return content;
  }

  if (typeof content !== "object") {
    return "";
  }

  const typedContent = content as Record<string, unknown>;

  if (typeof typedContent.html === "string") {
    return typedContent.html;
  }

  try {
    return renderNode(typedContent);
  } catch (error) {
    console.error("Error generating HTML preview:", error);
    return "";
  }
}
