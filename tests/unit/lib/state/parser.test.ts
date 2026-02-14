import { describe, it, expect } from "vitest";
import { splitIntoBlocks } from "@/lib/state/parser";

describe("splitIntoBlocks", () => {
  describe("basic content types", () => {
    it("should return empty array for empty content", () => {
      expect(splitIntoBlocks("")).toEqual([]);
      expect(splitIntoBlocks(null as unknown as string)).toEqual([]);
    });

    it("should parse a simple paragraph", () => {
      const result = splitIntoBlocks("Hello world");
      expect(result).toEqual([{ type: "paragraph", text: "Hello world" }]);
    });

    it("should parse a heading", () => {
      const result = splitIntoBlocks("## My Heading");
      expect(result).toEqual([{ type: "heading", text: "## My Heading" }]);
    });

    it("should parse multiple heading levels", () => {
      const result = splitIntoBlocks("# H1\n\n## H2\n\n### H3");
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: "heading", text: "# H1" });
      expect(result[1]).toEqual({ type: "heading", text: "## H2" });
      expect(result[2]).toEqual({ type: "heading", text: "### H3" });
    });
  });

  describe("code blocks", () => {
    it("should parse a code block with backtick fence", () => {
      const content = "```javascript\nconst x = 1;\n```";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("code");
      expect(result[0].text).toContain("const x = 1;");
    });

    it("should parse a code block with tilde fence", () => {
      const content = "~~~python\nprint('hi')\n~~~";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("code");
      expect(result[0].text).toContain("print('hi')");
    });

    it("should handle unclosed code block", () => {
      const content = "```\nsome code\nno closing fence";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("code");
      expect(result[0].text).toContain("some code");
    });
  });

  describe("list items", () => {
    it("should parse unordered list items", () => {
      const content = "- item one\n- item two";
      const result = splitIntoBlocks(content);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((b) => b.type === "list")).toBe(true);
    });

    it("should parse ordered list items", () => {
      const content = "1. first\n2. second";
      const result = splitIntoBlocks(content);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((b) => b.type === "list")).toBe(true);
    });

    it("should keep nested items with parent", () => {
      const content = "- parent\n  - child\n  - child2";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("list");
      expect(result[0].text).toContain("parent");
      expect(result[0].text).toContain("child");
    });

    it("should split top-level list items into separate blocks", () => {
      const content = "- first item\n- second item";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0].text).toContain("first item");
      expect(result[1].text).toContain("second item");
    });
  });

  describe("mixed content", () => {
    it("should separate paragraphs by blank lines", () => {
      const content = "Paragraph one.\n\nParagraph two.";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "paragraph",
        text: "Paragraph one.",
      });
      expect(result[1]).toEqual({
        type: "paragraph",
        text: "Paragraph two.",
      });
    });

    it("should handle heading followed by paragraph", () => {
      const content = "## Title\nSome content here.";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("heading");
      expect(result[1].type).toBe("paragraph");
    });

    it("should handle heading after list", () => {
      const content = "- item\n## Heading";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("list");
      expect(result[1].type).toBe("heading");
    });

    it("should handle blank line in list mode", () => {
      const content = "- item one\n\nParagraph after.";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("list");
      expect(result[1].type).toBe("paragraph");
    });

    it("should handle paragraph followed by list", () => {
      const content = "Some text.\n- list item";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("paragraph");
      expect(result[1].type).toBe("list");
    });

    it("should handle text after list without blank line", () => {
      const content = "- item\nSome continuation text";
      const result = splitIntoBlocks(content);
      // Text after list should flush the list and start a paragraph
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("normalizeBlocks (heading extraction from paragraphs)", () => {
    it("should extract headings from multi-line paragraphs", () => {
      const content = "Intro text.\n\n## Section\n\nMore text.";
      const result = splitIntoBlocks(content);
      const headingBlock = result.find((b) => b.type === "heading");
      expect(headingBlock).toBeDefined();
      expect(headingBlock!.text).toBe("## Section");
    });

    it("should skip empty blocks", () => {
      const content = "   \n\n\n";
      const result = splitIntoBlocks(content);
      expect(result).toEqual([]);
    });

    it("should handle Windows-style line endings", () => {
      const content = "Line one.\r\n\r\nLine two.";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(2);
    });
  });

  describe("final flush edge cases", () => {
    it("should flush remaining paragraph buffer at end", () => {
      const content = "Single line without trailing newline";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("paragraph");
    });

    it("should flush remaining list buffer at end", () => {
      const content = "- item at end";
      const result = splitIntoBlocks(content);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("list");
    });
  });
});
