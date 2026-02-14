import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { Math } from "@/components/content/Math";

const mockRenderMath = vi.fn();
vi.mock("@/lib/rendering/katex", () => ({
  renderMath: (...args: unknown[]) => mockRenderMath(...args),
}));

describe("Math", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inline math as span", () => {
    const { container } = render(<Math tex="E=mc^2" />);
    const el = container.querySelector("span");
    expect(el).toBeTruthy();
    expect(el?.className).toContain("doc-math-inline");
  });

  it("renders display math as div", () => {
    const { container } = render(<Math tex="\\int_0^1 x dx" display />);
    const el = container.querySelector("div");
    expect(el).toBeTruthy();
    expect(el?.className).toContain("doc-math-block");
  });

  it("sets data-tex attribute", () => {
    const { container } = render(<Math tex="x^2" />);
    expect(container.querySelector('[data-tex="x^2"]')).toBeTruthy();
  });

  it("calls renderMath with correct arguments for inline", () => {
    render(<Math tex="E=mc^2" />);
    expect(mockRenderMath).toHaveBeenCalledWith(
      expect.any(HTMLSpanElement),
      "E=mc^2",
      false,
    );
  });

  it("calls renderMath with display=true for block math", () => {
    const tex = "x^2 + y^2 = z^2";
    render(<Math tex={tex} display />);
    expect(mockRenderMath).toHaveBeenCalledWith(expect.anything(), tex, true);
  });

  it("appends custom className", () => {
    const { container } = render(<Math tex="x" className="extra" />);
    const el = container.querySelector("span");
    expect(el?.className).toContain("doc-math-inline");
    expect(el?.className).toContain("extra");
  });

  it("renders tex as fallback content", () => {
    const { container } = render(<Math tex="y=2x" />);
    expect(container.textContent).toBe("y=2x");
  });
});
