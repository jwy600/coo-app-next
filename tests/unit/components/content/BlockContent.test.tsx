import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockContent } from '@/components/content/BlockContent';

// Mock Math component to avoid KaTeX dependency
vi.mock('@/components/content/Math', () => ({
  Math: ({ tex, display }: { tex: string; display?: boolean }) => (
    <span data-testid={display ? 'block-math' : 'inline-math'}>{tex}</span>
  ),
}));

describe('BlockContent', () => {
  describe('null/empty handling', () => {
    it('returns null for empty text', () => {
      const { container } = render(<BlockContent text="" type="paragraph" />);
      expect(container.innerHTML).toBe('');
    });

    it('returns null for undefined-like falsy text', () => {
      const { container } = render(<BlockContent text={null as unknown as string} type="paragraph" />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('paragraph type', () => {
    it('renders plain text in a <p> tag', () => {
      const { container } = render(<BlockContent text="Hello world" type="paragraph" />);
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
      expect(p!.textContent).toBe('Hello world');
    });

    it('renders bold text with <strong>', () => {
      const { container } = render(<BlockContent text="This is **bold** text" type="paragraph" />);
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong!.textContent).toBe('bold');
    });

    it('renders italic text with <em>', () => {
      const { container } = render(<BlockContent text="This is *italic* text" type="paragraph" />);
      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em!.textContent).toBe('italic');
    });

    it('renders strikethrough with <del>', () => {
      const { container } = render(<BlockContent text="This is ~~deleted~~ text" type="paragraph" />);
      const del = container.querySelector('del');
      expect(del).toBeTruthy();
      expect(del!.textContent).toBe('deleted');
    });

    it('renders links with target="_blank"', () => {
      const { container } = render(
        <BlockContent text="Visit [Google](https://google.com)" type="paragraph" />
      );
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link!.textContent).toBe('Google');
      expect(link!.getAttribute('href')).toBe('https://google.com');
      expect(link!.getAttribute('target')).toBe('_blank');
      expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('renders bold with nested italic via parseNestedFormatting', () => {
      const { container } = render(
        <BlockContent text="**bold and *italic* inside**" type="paragraph" />
      );
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      const em = strong!.querySelector('em');
      expect(em).toBeTruthy();
      expect(em!.textContent).toBe('italic');
    });

    it('renders inline math via Math component', () => {
      render(<BlockContent text={'The formula \\(E=mc^2\\) is famous'} type="paragraph" />);
      expect(screen.getByTestId('inline-math')).toBeTruthy();
      expect(screen.getByTestId('inline-math').textContent).toBe('E=mc^2');
    });

    it('renders block math via Math component', () => {
      render(<BlockContent text={'\\[\\int_0^1 x dx\\]'} type="paragraph" />);
      expect(screen.getByTestId('block-math')).toBeTruthy();
    });

    it('renders blockquote with em wrapper', () => {
      const { container } = render(<BlockContent text="> This is a quote" type="paragraph" />);
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
      const em = p!.querySelector('em');
      expect(em).toBeTruthy();
      expect(em!.textContent).toContain('This is a quote');
    });

    it('uses div instead of p when display math is present', () => {
      const { container } = render(<BlockContent text={'Math: \\[x^2\\]'} type="paragraph" />);
      const div = container.querySelector('div.doc-paragraph');
      expect(div).toBeTruthy();
      const p = container.querySelector('p.doc-paragraph');
      expect(p).toBeNull();
    });

    it('applies custom className', () => {
      const { container } = render(<BlockContent text="Hello" type="paragraph" className="custom" />);
      const p = container.querySelector('p');
      expect(p!.className).toContain('custom');
    });
  });

  describe('heading type', () => {
    it('renders # as h1', () => {
      const { container } = render(<BlockContent text="# Title" type="heading" />);
      expect(container.querySelector('h1')).toBeTruthy();
      expect(container.querySelector('h1')!.textContent).toBe('Title');
    });

    it('renders ## as h2', () => {
      const { container } = render(<BlockContent text="## Subtitle" type="heading" />);
      expect(container.querySelector('h2')).toBeTruthy();
      expect(container.querySelector('h2')!.textContent).toBe('Subtitle');
    });

    it('renders ### as h3', () => {
      const { container } = render(<BlockContent text="### Section" type="heading" />);
      expect(container.querySelector('h3')).toBeTruthy();
    });

    it('renders heading with inline bold', () => {
      const { container } = render(<BlockContent text="## **Bold** heading" type="heading" />);
      const h2 = container.querySelector('h2');
      expect(h2).toBeTruthy();
      const strong = h2!.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong!.textContent).toBe('Bold');
    });

    it('falls back to paragraph when heading parse fails', () => {
      const { container } = render(<BlockContent text="Not a heading" type="heading" />);
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
    });
  });

  describe('list type', () => {
    it('renders unordered list items', () => {
      const { container } = render(<BlockContent text={"- Item 1\n- Item 2\n- Item 3"} type="list" />);
      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('renders ordered list items', () => {
      const { container } = render(<BlockContent text={"1. First\n2. Second\n3. Third"} type="list" />);
      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('renders inline markdown within list items', () => {
      const { container } = render(<BlockContent text="- This is **bold** item" type="list" />);
      const strong = container.querySelector('li strong');
      expect(strong).toBeTruthy();
      expect(strong!.textContent).toBe('bold');
    });

    it('renders fallback div when no items parsed', () => {
      const { container } = render(<BlockContent text="no list markers here" type="list" />);
      const div = container.querySelector('div');
      expect(div).toBeTruthy();
    });
  });

  describe('code type', () => {
    it('renders code in pre>code', () => {
      const { container } = render(
        <BlockContent text={"```\nconst x = 1;\n```"} type="code" />
      );
      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();
      const code = container.querySelector('code');
      expect(code).toBeTruthy();
      expect(code!.textContent).toContain('const x = 1;');
    });

    it('includes language class when specified', () => {
      const { container } = render(
        <BlockContent text={"```javascript\nconst x = 1;\n```"} type="code" />
      );
      const code = container.querySelector('code');
      expect(code!.className).toContain('language-javascript');
    });

    it('renders code without language class when no language', () => {
      const { container } = render(
        <BlockContent text={"```\nplain code\n```"} type="code" />
      );
      const code = container.querySelector('code');
      expect(code!.className).toBe('');
    });
  });

  describe('unknown type', () => {
    it('renders text in plain div', () => {
      const { container } = render(
        <BlockContent text="Unknown content" type={'unknown' as never} />
      );
      const div = container.querySelector('div');
      expect(div).toBeTruthy();
      expect(div!.textContent).toBe('Unknown content');
    });
  });
});
