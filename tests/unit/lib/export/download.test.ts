import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadMarkdown } from "@/lib/export/download";

describe("downloadMarkdown", () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLMock = vi.fn();
    clickSpy = vi.fn();

    globalThis.URL.createObjectURL =
      createObjectURLMock as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL =
      revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;

    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node,
    );
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node,
    );

    vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) => {
        if (tag === "a") {
          return {
            href: "",
            download: "",
            click: clickSpy,
          } as unknown as HTMLAnchorElement;
        }
        return document.createElement(tag);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates blob with markdown content", () => {
    downloadMarkdown("# Hello", "test.md");
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
  });

  it("sets download filename on link", () => {
    downloadMarkdown("content", "export.md");
    const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("export.md");
  });

  it("triggers click to download", () => {
    downloadMarkdown("content", "test.md");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("cleans up link and revokes URL after download", () => {
    downloadMarkdown("content", "test.md");
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");
  });
});
