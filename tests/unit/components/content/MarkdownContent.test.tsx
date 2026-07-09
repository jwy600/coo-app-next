import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownContent } from '@/components/content/MarkdownContent';

describe('MarkdownContent', () => {
  describe('null/empty handling', () => {
    it('returns null for empty text', () => {
      const { container } = render(<MarkdownContent text="" />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('paragraphs', () => {
    it('renders plain text in a <p> tag with doc-paragraph class', () => {
      const { container } = render(<MarkdownContent text="Hello world" />);
      const p = container.querySelector('p');
      expect(p).toBeTruthy();
      expect(p!.textContent).toBe('Hello world');
      expect(p!.className).toContain('doc-paragraph');
    });

    it('renders bold text with <strong>', () => {
      const { container } = render(<MarkdownContent text="This is **bold** text" />);
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      expect(strong!.textContent).toBe('bold');
    });

    it('renders italic text with <em>', () => {
      const { container } = render(<MarkdownContent text="This is *italic* text" />);
      const em = container.querySelector('em');
      expect(em).toBeTruthy();
      expect(em!.textContent).toBe('italic');
    });

    it('renders strikethrough with <del> via GFM', () => {
      const { container } = render(<MarkdownContent text="This is ~~deleted~~ text" />);
      const del = container.querySelector('del');
      expect(del).toBeTruthy();
      expect(del!.textContent).toBe('deleted');
    });

    it('renders links with safe href, target=_blank, rel=noopener noreferrer', () => {
      const { container } = render(
        <MarkdownContent text="Visit [Google](https://google.com)" />
      );
      const link = container.querySelector('a');
      expect(link).toBeTruthy();
      expect(link!.textContent).toBe('Google');
      expect(link!.getAttribute('href')).toBe('https://google.com');
      expect(link!.getAttribute('target')).toBe('_blank');
      expect(link!.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('sanitizes javascript: URLs to #', () => {
      const { container } = render(
        <MarkdownContent text="[bad](javascript:alert(1))" />
      );
      const link = container.querySelector('a');
      expect(link!.getAttribute('href')).toBe('#');
    });

    it('renders bold with nested italic', () => {
      const { container } = render(<MarkdownContent text="**bold and *italic* inside**" />);
      const strong = container.querySelector('strong');
      expect(strong).toBeTruthy();
      const em = strong!.querySelector('em');
      expect(em).toBeTruthy();
      expect(em!.textContent).toBe('italic');
    });
  });

  describe('headings', () => {
    it('renders h1 with doc-heading class', () => {
      const { container } = render(<MarkdownContent text="# Heading 1" />);
      const h1 = container.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1!.textContent).toBe('Heading 1');
      expect(h1!.className).toContain('doc-heading');
    });

    it('renders h2', () => {
      const { container } = render(<MarkdownContent text="## Heading 2" />);
      expect(container.querySelector('h2')!.textContent).toBe('Heading 2');
    });

    it('renders h3 through h6', () => {
      const { container: c3 } = render(<MarkdownContent text="### h3" />);
      const { container: c4 } = render(<MarkdownContent text="#### h4" />);
      const { container: c5 } = render(<MarkdownContent text="##### h5" />);
      const { container: c6 } = render(<MarkdownContent text="###### h6" />);
      expect(c3.querySelector('h3')!.textContent).toBe('h3');
      expect(c4.querySelector('h4')!.textContent).toBe('h4');
      expect(c5.querySelector('h5')!.textContent).toBe('h5');
      expect(c6.querySelector('h6')!.textContent).toBe('h6');
    });
  });

  describe('lists', () => {
    it('renders unordered lists with doc-list class', () => {
      const { container } = render(
        <MarkdownContent text={'- one\n- two\n- three'} />
      );
      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      expect(ul!.className).toContain('doc-list');
      expect(ul!.querySelectorAll('li')).toHaveLength(3);
    });

    it('renders ordered lists with doc-list class', () => {
      const { container } = render(
        <MarkdownContent text={'1. first\n2. second'} />
      );
      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      expect(ol!.className).toContain('doc-list');
      expect(ol!.querySelectorAll('li')).toHaveLength(2);
    });

    it('renders nested lists', () => {
      const { container } = render(
        <MarkdownContent text={'- parent\n  - child'} />
      );
      const outerUl = container.querySelector('ul');
      const innerUl = outerUl!.querySelector('ul');
      expect(innerUl).toBeTruthy();
      expect(innerUl!.querySelector('li')!.textContent).toContain('child');
    });
  });

  describe('code', () => {
    it('renders fenced code blocks inside <pre><code>', () => {
      const { container } = render(
        <MarkdownContent text={'```js\nconsole.log(1)\n```'} />
      );
      const pre = container.querySelector('pre');
      expect(pre).toBeTruthy();
      expect(pre!.className).toContain('doc-code');
      const code = pre!.querySelector('code');
      expect(code).toBeTruthy();
      expect(code!.textContent).toContain('console.log(1)');
    });

    it('attaches language-* class to code element when fence has a language', () => {
      const { container } = render(
        <MarkdownContent text={'```python\nprint(1)\n```'} />
      );
      const code = container.querySelector('pre code');
      expect(code!.className).toContain('language-python');
    });
  });

  describe('math', () => {
    it('renders inline math via rehype-katex (using \\(..\\) delimiters)', () => {
      const { container } = render(
        <MarkdownContent text={'The formula \\(E=mc^2\\) is famous'} />
      );
      const katex = container.querySelector('.katex');
      expect(katex).toBeTruthy();
    });

    it('renders block math via rehype-katex (using \\[..\\] delimiters)', () => {
      const { container } = render(
        <MarkdownContent text={'\\[\\int_0^1 x dx\\]'} />
      );
      const katex = container.querySelector('.katex');
      expect(katex).toBeTruthy();
    });

    it('renders inline math via $..$ delimiters', () => {
      const { container } = render(<MarkdownContent text={'inline $a^2$ here'} />);
      expect(container.querySelector('.katex')).toBeTruthy();
    });
  });

  describe('blockquotes', () => {
    it('renders blockquotes', () => {
      const { container } = render(<MarkdownContent text={'> a quote'} />);
      const bq = container.querySelector('blockquote');
      expect(bq).toBeTruthy();
      expect(bq!.textContent).toContain('a quote');
    });
  });

  describe('footnote references', () => {
    it('renders [n](#fn:...) as a non-clickable superscript marker, not an <a>', () => {
      const { container } = render(
        <MarkdownContent text={'See disclosure [2](#fn:disclosure) here'} />,
      );
      expect(container.querySelector('a')).toBeNull();
      const sup = container.querySelector('sup');
      expect(sup).toBeTruthy();
      expect(sup!.textContent).toBe('2');
      expect(sup!.className).toContain('doc-footnote-ref');
    });

    it('still opens normal links in a new tab alongside a footnote ref', () => {
      const { container } = render(
        <MarkdownContent text={'[2](#fn:disclosure) and [Google](https://google.com)'} />,
      );
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe('https://google.com');
      expect(links[0].getAttribute('target')).toBe('_blank');
      expect(container.querySelector('sup')!.textContent).toBe('2');
    });
  });
});
