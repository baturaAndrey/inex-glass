import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg-sanitize";

describe("sanitizeSvg", () => {
  it("keeps drawing elements and presentation attributes", () => {
    const out = sanitizeSvg(
      '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M0 0L10 10"/><rect x="1" y="2" width="3" height="4" rx="2" fill="#D9DCDE"/>' +
        '<circle cx="5" cy="5" r="3"/></svg>'
    );
    expect(out).toContain('viewBox="0 0 120 120"');
    expect(out).toContain('<path d="M0 0L10 10"/>');
    expect(out).toContain('<rect x="1" y="2" width="3" height="4" rx="2" fill="#D9DCDE"/>');
    expect(out).toContain('<circle cx="5" cy="5" r="3"/>');
  });

  it("removes <script>, on* handlers, href and <foreignObject>", () => {
    const out = sanitizeSvg(
      '<svg onload="alert(1)" viewBox="0 0 1 1"><script>alert(1)</script>' +
        "<foreignObject><div>x</div></foreignObject>" +
        '<a href="javascript:alert(1)"><rect/></a>' +
        '<rect onclick="x()" xlink:href="#a" href="#b" width="1"/>' +
        '<use href="#a"/><image href="https://evil/x.png"/><style>*{}</style></svg>'
    );
    expect(out).not.toMatch(/script|onload|onclick|foreignObject|href|<a|<use|<image|<style/i);
    expect(out).toContain('<rect width="1"/>');
  });

  it("drops external url() but keeps local gradient references", () => {
    const out = sanitizeSvg(
      '<svg><rect fill="url(https://evil/x)"/><rect fill="url(#g)"/><rect fill="url(\'#g\')"/>' +
        '<rect fill="url(#g) url(https://evil/y)"/></svg>'
    );
    expect(out).not.toContain("evil");
    expect(out).toContain('fill="url(#g)"');
    expect(out).toContain("fill=\"url('#g')\"");
  });

  it("drops style and class attributes entirely", () => {
    const out = sanitizeSvg(
      '<svg style="position:fixed;inset:0;z-index:9999" class="fixed inset-0">' +
        '<rect style="opacity:.5" class="sr-only"/></svg>'
    );
    expect(out).not.toMatch(/style|class|fixed|z-index|sr-only/);
    expect(out).toContain("<rect/>");
  });

  it("drops CDATA so hidden markup cannot reach innerHTML", () => {
    const out = sanitizeSvg(
      "<svg><title><![CDATA[</title><img src=x onerror=alert(1)>]]></title><rect/></svg>"
    );
    expect(out).not.toMatch(/CDATA|<img|onerror/i);
    expect(out).toContain("<title/>");
    expect(out).toContain("<rect/>");
  });

  it("drops comments, processing instructions and doctypes", () => {
    const out = sanitizeSvg(
      '<?xml version="1.0"?><!DOCTYPE svg><svg><!--<img src=x onerror=alert(1)>-->' +
        '<?php evil ?><g><circle r="1"/></g></svg>'
    );
    expect(out).not.toMatch(/<!--|<\?|<!DOCTYPE|<img|onerror|php/i);
    expect(out).toContain('<circle r="1"/>');
  });

  it("escapes text and attribute values on output", () => {
    const out = sanitizeSvg(
      '<svg><text x="1&quot; onmouseover=&quot;alert(1)">&lt;img src=x onerror=alert(1)&gt;</text></svg>'
    );
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(out).toContain('x="1&quot; onmouseover=&quot;alert(1)"');
    // Parsed by an HTML5 parser (parse5, as innerHTML would): no executable element or handler.
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
    // CSS escapes (`\72` = `r`, `\75` = `u`) would bypass a plain `url(` check.
    ['<svg><rect style="fill:u\\72l(https://evil/x)"/></svg>', /style|evil/i],
    ['<svg><rect fill="\\75rl(https://evil/x)"/></svg>', /fill|evil/i],
    ['<svg><rect fill="u\\rl(https://evil/x)"/></svg>', /fill|evil/i],
    // `image-set()` / `image()` load resources without `url(`.
    ["<svg><rect style=\"fill:image-set('https://evil/x' 1x)\"/></svg>", /style|evil/i],
    ["<svg><rect fill=\"image-set('https://evil/x' 1x)\"/></svg>", /fill|evil/i],
    ["<svg><rect mask=\"-webkit-image-set('https://evil/x' 1x)\"/></svg>", /mask|evil/i],
    ["<svg><rect fill=\"image('https://evil/x')\"/></svg>", /fill|evil/i],
    // Layout escape and site utilities.
    ['<svg style="position:fixed;top:0;left:0;width:100vw"><rect/></svg>', /style|fixed/i],
    ['<svg class="fixed inset-0 z-50"><rect class="bg-red-500"/></svg>', /class|fixed|z-50/i],
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
    expect(out).toMatch(/^<svg/);
    expect(out).not.toMatch(forbidden);
  });

  it("returns an empty string without a valid <svg> root", () => {
    expect(sanitizeSvg("")).toBe("");
    expect(sanitizeSvg(null)).toBe("");
    expect(sanitizeSvg("<div><svg/></div>")).toBe("");
    expect(sanitizeSvg("<div>text</div>")).toBe("");
    expect(sanitizeSvg("just text")).toBe("");
  });

  it("hides unnamed schemes and keeps role=img with aria-label and <title>", () => {
    const hidden = sanitizeSvg('<svg viewBox="0 0 1 1" role="presentation"><rect/></svg>');
    expect(hidden).toContain('aria-hidden="true"');
    expect(hidden).toContain('focusable="false"');
    expect(hidden).not.toContain("role=");

    const named = sanitizeSvg(
      '<svg role="img" aria-label="Схема козырька на тягах"><title>Козырёк</title><rect/></svg>'
    );
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Схема козырька на тягах"');
    expect(named).toContain("<title>Козырёк</title>");
    expect(named).not.toContain("aria-hidden");

    const forced = sanitizeSvg('<svg role="img" aria-label="Схема"><rect/></svg>', {
      decorative: true,
    });
    expect(forced).toContain('aria-hidden="true"');
    expect(forced).not.toMatch(/aria-label|role=/);
  });

  it("does not let nested elements carry accessibility overrides", () => {
    const out = sanitizeSvg('<svg><g role="button" aria-hidden="false"><rect/></g></svg>');
    expect(out).toContain("<g><rect/></g>");
  });

  it("is stable: sanitizing the output again changes nothing", () => {
    const once = sanitizeSvg(
      '<svg role="img" aria-label="A &amp; B" viewBox="0 0 2 1"><text>a &lt; b</text></svg>'
    );
    expect(sanitizeSvg(once)).toBe(once);
  });
});
