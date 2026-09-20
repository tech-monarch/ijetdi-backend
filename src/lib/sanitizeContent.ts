import sanitizeHtml from "sanitize-html";

// ---------------------------------------------------------------------------
// Sanitizes rich-text HTML before it's persisted (Article.content,
// Publication.content — both written by the TipTap editor on the
// frontend). Runs server-side on every create AND update, for both
// entities, regardless of whatever the frontend already did — never trust
// client-side sanitization as the source of truth (same rule this
// project applies to every other kind of validation; see
// src/services/README.md-equivalent conventions elsewhere in this repo).
//
// The allowlist below matches EXACTLY the TipTap extensions enabled in
// frontend/src/admin/shared/RichTextEditor.jsx — nothing broader, nothing
// implicit. If a new extension is ever enabled there, this list needs a
// matching update, or the editor will silently strip whatever the new
// extension produces on save. See tests/unit/sanitizeContent.test.ts for
// the XSS payloads this specifically defends against.
// ---------------------------------------------------------------------------

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "em", "u", "s", "sup", "sub", "code", "pre",
    "ul", "ol", "li",
    "blockquote",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    // Alignment (TextAlign extension) and indentation (a small custom
    // paragraph/heading attribute — see RichTextEditor.jsx) both work via
    // an inline `style`, restricted below to only the two properties and
    // value shapes those two features can actually produce.
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|center|right|justify)$/],
      "margin-left": [/^\d+(\.\d+)?(px|em)$/],
    },
  },
  // No `data:` scheme — images must be real, already-uploaded R2 URLs
  // (see FileUploadField.jsx's upload flow, reused inside the editor for
  // inline image insertion) or an external https:// URL, never an inline
  // base64 payload smuggled in via paste.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  // Force rel="noopener noreferrer" on every link, regardless of what the
  // editor produced — prevents reverse-tabnabbing on any link opened with
  // target="_blank", and costs nothing on links that don't use it.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
  disallowedTagsMode: "discard",
};

export function sanitizeRichTextContent(html: string): string {
  return sanitizeHtml(html, options);
}
