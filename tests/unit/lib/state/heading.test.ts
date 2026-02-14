import { describe, it, expect } from "vitest";
import {
  getHeadingInfo,
  hasHeading,
  getHeadingCardRange,
  getHeadingCardBlockIds,
} from "@/lib/state/heading";
import type { Block } from "@/types/block";

const makeBlock = (
  id: string,
  type: Block["type"],
  text: string,
): Block => ({
  id,
  messageId: "msg-1",
  type,
  text,
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
});

describe("heading", () => {
  describe("getHeadingInfo", () => {
    it("parses H1", () => {
      const info = getHeadingInfo("# Title");
      expect(info).toEqual({ level: 1, prefix: "# " });
    });

    it("parses H2", () => {
      const info = getHeadingInfo("## Subtitle");
      expect(info).toEqual({ level: 2, prefix: "## " });
    });

    it("parses H6", () => {
      const info = getHeadingInfo("###### Deep");
      expect(info).toEqual({ level: 6, prefix: "###### " });
    });

    it("returns null for non-heading", () => {
      expect(getHeadingInfo("Hello world")).toBeNull();
    });

    it("returns null for hash without space", () => {
      expect(getHeadingInfo("#NoSpace")).toBeNull();
    });

    it("returns null for 7+ hashes", () => {
      expect(getHeadingInfo("####### Too many")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getHeadingInfo("")).toBeNull();
    });
  });

  describe("hasHeading", () => {
    it("returns true for heading text", () => {
      expect(hasHeading("## Title")).toBe(true);
    });

    it("returns false for plain text", () => {
      expect(hasHeading("plain text")).toBe(false);
    });
  });

  describe("getHeadingCardRange", () => {
    it("returns null for non-existent heading", () => {
      const blocks = [makeBlock("b1", "paragraph", "text")];
      expect(getHeadingCardRange(blocks, "missing")).toBeNull();
    });

    it("returns range for single heading at end", () => {
      const blocks = [
        makeBlock("b1", "paragraph", "intro"),
        makeBlock("b2", "heading", "## Section"),
      ];
      const range = getHeadingCardRange(blocks, "b2");
      expect(range).toEqual({ startIndex: 1, endIndex: 1 });
    });

    it("includes content until next same-level heading", () => {
      const blocks = [
        makeBlock("h1", "heading", "## Section A"),
        makeBlock("p1", "paragraph", "content A"),
        makeBlock("p2", "paragraph", "more A"),
        makeBlock("h2", "heading", "## Section B"),
        makeBlock("p3", "paragraph", "content B"),
      ];
      const range = getHeadingCardRange(blocks, "h1");
      expect(range).toEqual({ startIndex: 0, endIndex: 2 });
    });

    it("includes nested lower-level headings", () => {
      const blocks = [
        makeBlock("h1", "heading", "## Section"),
        makeBlock("p1", "paragraph", "intro"),
        makeBlock("h2", "heading", "### Subsection"),
        makeBlock("p2", "paragraph", "sub content"),
        makeBlock("h3", "heading", "## Next Section"),
      ];
      // H2 card should include H3 nested inside
      const range = getHeadingCardRange(blocks, "h1");
      expect(range).toEqual({ startIndex: 0, endIndex: 3 });
    });

    it("stops at higher-level heading", () => {
      const blocks = [
        makeBlock("h1", "heading", "### Sub"),
        makeBlock("p1", "paragraph", "content"),
        makeBlock("h2", "heading", "## Parent"),
      ];
      const range = getHeadingCardRange(blocks, "h1");
      expect(range).toEqual({ startIndex: 0, endIndex: 1 });
    });

    it("goes to end when no closing heading", () => {
      const blocks = [
        makeBlock("h1", "heading", "## Section"),
        makeBlock("p1", "paragraph", "content 1"),
        makeBlock("p2", "paragraph", "content 2"),
      ];
      const range = getHeadingCardRange(blocks, "h1");
      expect(range).toEqual({ startIndex: 0, endIndex: 2 });
    });
  });

  describe("getHeadingCardBlockIds", () => {
    it("returns empty array for non-existent heading", () => {
      const blocks = [makeBlock("b1", "paragraph", "text")];
      expect(getHeadingCardBlockIds(blocks, "missing")).toEqual([]);
    });

    it("returns correct block IDs for a heading card", () => {
      const blocks = [
        makeBlock("h1", "heading", "## Section"),
        makeBlock("p1", "paragraph", "content"),
        makeBlock("p2", "paragraph", "more"),
        makeBlock("h2", "heading", "## Next"),
      ];
      const ids = getHeadingCardBlockIds(blocks, "h1");
      expect(ids).toEqual(["h1", "p1", "p2"]);
    });

    it("returns just heading when no content follows", () => {
      const blocks = [
        makeBlock("h1", "heading", "## Section"),
        makeBlock("h2", "heading", "## Next"),
      ];
      const ids = getHeadingCardBlockIds(blocks, "h1");
      expect(ids).toEqual(["h1"]);
    });
  });
});
