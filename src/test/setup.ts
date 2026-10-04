import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// ProseMirror measures caret coordinates through browser layout APIs that
// JSDOM does not implement. Minimal geometry shims keep rich-text interaction
// tests focused on editor behavior instead of synthetic layout failures.
Object.defineProperty(document, 'elementFromPoint', {
  configurable: true,
  value: () => null,
});
Object.defineProperties(Range.prototype, {
  getBoundingClientRect: {
    configurable: true,
    value: () => new DOMRect(),
  },
  getClientRects: {
    configurable: true,
    value: () => [],
  },
});
