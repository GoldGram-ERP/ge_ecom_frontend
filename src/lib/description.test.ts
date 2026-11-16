import { describe, expect, it } from "vitest";
import { descriptionText, isHtmlDescription } from "./description";

describe("product descriptions: plain text or the editor's HTML", () => {
  it("tells the editor's HTML from plain text", () => {
    expect(isHtmlDescription("<p>A 24K bar.</p>")).toBe(true);
    expect(isHtmlDescription('Line one<br />two <strong>bold</strong> <span style="font-weight: 600">x</span>')).toBe(true);
    expect(isHtmlDescription("Invest in gold.\n\nWeight < 5 g & purity > 99%")).toBe(false);
    expect(isHtmlDescription("")).toBe(false);
  });

  it("gives one line of text for cards and search engines", () => {
    expect(descriptionText("<h2>About</h2><p>Gold &amp; silver, <strong>24K</strong>.</p><ul><li>One</li><li>Two</li></ul>")).toBe(
      "About Gold & silver, 24K . One Two",
    );
    expect(descriptionText("<p>It&#39;s &quot;fine&quot;&nbsp;gold &lt;999&gt;</p>")).toBe("It's \"fine\" gold <999>");
    expect(descriptionText("Invest in gold.\n\nWeight < 5 g & purity > 99%")).toBe("Invest in gold. Weight < 5 g & purity > 99%");
    expect(descriptionText("")).toBe("");
  });
});
