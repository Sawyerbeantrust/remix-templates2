/**
 * Strips HTML tags from a string to ensure no raw HTML code is shown on the front end.
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // 1. Before removing general tags, extract <a> tags and convert to safe markdown links or readable text
  let processed = html.replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, (match, href, anchorText) => {
    const cleanText = anchorText.replace(/<[^>]*>/g, '').trim();
    const cleanHref = href.trim();
    if (!cleanText) return cleanHref;
    
    // For mailto or tel links, if the text is already the email/phone, just keep the text
    if (cleanHref.toLowerCase().startsWith('mailto:')) {
      const email = cleanHref.substring(7);
      if (cleanText.toLowerCase() === email.toLowerCase()) {
        return email;
      }
      return `[${cleanText}](${cleanHref})`;
    }
    if (cleanHref.toLowerCase().startsWith('tel:')) {
      const phone = cleanHref.substring(4);
      if (cleanText.replace(/\s+/g, '') === phone.replace(/\s+/g, '')) {
        return cleanText;
      }
      return `[${cleanText}](${cleanHref})`;
    }
    return `[${cleanText}](${cleanHref})`;
  });

  // Handle any other <a> tags without an href
  processed = processed.replace(/<a\s+[^>]*>(.*?)<\/a>/gi, (match, anchorText) => {
    if (anchorText.includes('](')) return match; // already converted
    return anchorText.replace(/<[^>]*>/g, '');
  });

  // 2. Remove any other HTML comments, tags, and inline markup
  let clean = processed.replace(/<[^>]*>/g, '');

  // 3. Remove WordPress plugin shortcodes like [table id=10 /], [table id=11 /], [gallery ...], [su_...] etc.
  clean = clean.replace(/\[table(?:\s+[^\]]*)?\/?\]/gi, '');
  clean = clean.replace(/\[[a-zA-Z0-9_\-]+(?:\s+[^\]]*?=(?:['"][^'"]*['"]|\S+))*?\s*\/?[\]]/g, '');
  clean = clean.replace(/\[(?:table|contact-form|gallery|caption|embed|su_[a-z0-9_]+)(?:\s+[^\]]*)?\/?\]/gi, '');
  
  // Unescape common HTML entities
  clean = clean
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');

  return clean.trim();
}
