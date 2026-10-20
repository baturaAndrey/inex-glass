import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./sanitize-svg";

describe("sanitizeSvg", () => {
  it("keeps drawing elements and presentation attributes", () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 10 10"><path d="M0 0L10 10" stroke="#000" stroke-width="2"/></svg>'
    );
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('d="M0 0L10 10"');
    expect(out).toContain('aria-hidden="true"');
  });

  it("drops scripts, handlers, foreign content and external references", () => {
    const out =
      sanitizeSvg(
        '<svg onload="alert(1)"><script>alert(1)</script><foreignObject><div/></foreignObject>' +
          '<a href="javascript:alert(1)"><rect/></a><rect fill="url(https://evil/x)" onclick="x()"/>' +
          '<use href="#a"/><rect fill="url(#grad)"/></svg>'
      ) ?? "";
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|javascript|evil|<a|<use/i);
    expect(out).toContain('fill="url(#grad)"');
  });

  it("drops CDATA sections so hidden markup cannot reach innerHTML", () => {
    const out =
      sanitizeSvg(
        "<svg><title><![CDATA[</title><img src=x onerror=alert(1)>]]></title><rect/></svg>"
      ) ?? "";
    expect(out).not.toMatch(/CDATA|<img|onerror/i);
    expect(out).toContain("<title/>");
    expect(out).toContain("<rect/>");
  });

  it("drops comments, processing instructions and doctypes", () => {
    const out =
      sanitizeSvg(
        '<?xml version="1.0"?><!DOCTYPE svg><svg><!--<img src=x onerror=alert(1)>-->' +
          '<?php evil ?><g><circle r="1"/></g></svg>'
      ) ?? "";
    expect(out).not.toMatch(/<!--|<\?|<!DOCTYPE|<img|onerror|php/i);
    expect(out).toContain('<circle r="1"/>');
  });

  it("escapes text and attribute values on output", () => {
    const out =
      sanitizeSvg(
        '<svg><text x="1&quot; onmouseover=&quot;alert(1)">&lt;img src=x onerror=alert(1)&gt;</text></svg>'
      ) ?? "";
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(out).toContain('x="1&quot; onmouseover=&quot;alert(1)"');
    // Parsed by an HTML5 parser (parse5, as innerHTML would), no executable element or handler.
    const $ = load(`<div>${out}</div>`);
    expect($("img").length).toBe(0);
    expect($("[onmouseover]").length).toBe(0);
    expect($("text").text()).toBe("<img src=x onerror=alert(1)>");
  });

  it.each([
    ['<svg><script type="text/javascript">alert(1)</script></svg>', /script|alert/i],
    ["<svg><SCRIPT>alert(1)</SCRIPT></svg>", /script|alert/i],
    ['<svg><foreignObject><img src="x" onerror="alert(1)"/></foreignObject></svg>', /img|onerror/i],
    ['<svg><use xlink:href="https://evil/sprite.svg#x"/></svg>', /use|evil|href/i],
    ['<svg><use href="data:image/svg+xml;base64,PHN2Zz4="/></svg>', /use|data:|href/i],
    ['<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>', /<a|javascript|href/i],
    ['<svg><rect style="fill:url(https://evil/x)"/></svg>', /style|evil/i],
    ['<svg><rect style="width:expression(alert(1))"/></svg>', /style|expression/i],
    ['<svg><rect fill="expression(alert(1))"/></svg>', /expression/i],
    ["<svg><style>rect{fill:url(https://evil)}</style><rect/></svg>", /style|evil/i],
    [
      '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>',
      /animate|javascript/i,
    ],
    ['<svg><set attributeName="onmouseover" to="alert(1)"/></svg>', /<set|alert/i],
    ['<svg><image href="x" onerror="alert(1)"/></svg>', /image|onerror/i],
    ['<svg><rect onMouseOver="alert(1)" ONLOAD="alert(1)"/></svg>', /alert|mouseover|onload/i],
    ['<svg><iframe src="javascript:alert(1)"/></svg>', /iframe|javascript/i],
  ])("neutralizes %s", (input, forbidden) => {
    const out = sanitizeSvg(input);
    expect(out).not.toBeNull();
    expect(out).not.toMatch(forbidden);
  });

  it("returns null for empty or non-svg input", () => {
    expect(sanitizeSvg("")).toBeNull();
    expect(sanitizeSvg(null)).toBeNull();
    expect(sanitizeSvg("<div>text</div>")).toBeNull();
  });
});
