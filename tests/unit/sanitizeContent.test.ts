import { describe, expect, it } from "vitest";
import { sanitizeRichTextContent } from "../../src/lib/sanitizeContent.js";

describe("sanitizeRichTextContent", () => {
  it("passes through everything the editor's allowlisted tags can produce", () => {
    const input =
      '<h2>Heading</h2><p>Some <strong>bold</strong>, <em>italic</em>, <u>underline</u>, ' +
      '<s>strike</s>, <sup>sup</sup> and <sub>sub</sub> text.</p>' +
      '<ul><li>one</li><li>two</li></ul>' +
      '<blockquote>a quote</blockquote>' +
      '<a href="https://example.com" target="_blank">a link</a>' +
      '<figure><img src="https://cdn.example.com/r2/photo.png" alt="a photo" /><figcaption>caption</figcaption></figure>' +
      '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>' +
      '<p style="text-align: center; margin-left: 20px;">centered, indented</p>' +
      '<hr /><pre><code>const x = 1;</code></pre>';

    const output = sanitizeRichTextContent(input);

    expect(output).toContain("<h2>Heading</h2>");
    expect(output).toContain("<strong>bold</strong>");
    expect(output).toContain('<img src="https://cdn.example.com/r2/photo.png" alt="a photo"');
    expect(output).toContain("<figcaption>caption</figcaption>");
    expect(output).toContain("<table>");
    expect(output).toContain('text-align:center');
    expect(output).toContain('margin-left:20px');
  });

  it("strips script tags entirely", () => {
    const output = sanitizeRichTextContent('<p>hello</p><script>alert("xss")</script>');
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert");
    expect(output).toContain("<p>hello</p>");
  });

  it("strips event-handler attributes like onerror and onclick", () => {
    const output = sanitizeRichTextContent(
      '<img src="https://example.com/a.png" onerror="alert(1)" /><p onclick="alert(2)">hi</p>'
    );
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("alert");
  });

  it("strips javascript: URLs from links", () => {
    const output = sanitizeRichTextContent('<a href="javascript:alert(1)">click me</a>');
    expect(output).not.toContain("javascript:");
  });

  it("strips data: URIs on images, forcing real uploaded URLs only", () => {
    const output = sanitizeRichTextContent(
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" alt="x" />'
    );
    expect(output).not.toContain("data:image");
  });

  it("always forces rel=noopener noreferrer on links, even if the input tried to omit it", () => {
    const output = sanitizeRichTextContent('<a href="https://example.com" target="_blank">link</a>');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("discards any tag not on the allowlist, e.g. iframe and style", () => {
    const output = sanitizeRichTextContent(
      '<iframe src="https://evil.example.com"></iframe><style>body{display:none}</style><p>safe</p>'
    );
    expect(output).not.toContain("<iframe");
    expect(output).not.toContain("<style");
    expect(output).toContain("<p>safe</p>");
  });

  it("rejects style properties outside the text-align/margin-left allowlist", () => {
    const output = sanitizeRichTextContent('<p style="background: url(https://evil.example.com/x.png)">hi</p>');
    expect(output).not.toContain("background");
    expect(output).not.toContain("url(");
  });
});
