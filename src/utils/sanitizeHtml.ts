/**
 * Safe client-side HTML sanitizer to prevent XSS attacks while allowing rich technical formatting.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  if (typeof window === 'undefined') {
    return dirty.replace(/<[^>]*>/g, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirty, 'text/html');

    const allowedTags = new Set([
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'br', 'hr',
      'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
    ]);

    const allowedAttributes = new Set(['class']);

    function cleanNode(node: Node) {
      const toRemove: Node[] = [];

      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();

          if (!allowedTags.has(tagName)) {
            toRemove.push(child);
            continue;
          }

          // Strip any dangerous attributes
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            const attrValue = attr.value.toLowerCase();

            if (attrName.startsWith('on') || attrValue.includes('javascript:') || attrValue.includes('data:text/html')) {
              el.removeAttribute(attr.name);
            } else if (!allowedAttributes.has(attrName)) {
              el.removeAttribute(attr.name);
            }
          }

          cleanNode(child);
        } else if (child.nodeType === Node.COMMENT_NODE) {
          toRemove.push(child);
        }
      }

      for (const rem of toRemove) {
        node.removeChild(rem);
      }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch {
    return dirty.replace(/<[^>]*>/g, '');
  }
}
