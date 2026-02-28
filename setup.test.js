const { parseHTML } = require('./test-helpers');

describe('Test setup verification', () => {
  test('parses index.html and finds the document title', () => {
    const doc = parseHTML('index.html');
    expect(doc.querySelector('title')).not.toBeNull();
    expect(doc.title).toContain('Sudoku');
  });

  test('parses index.html and finds the h1 element', () => {
    const doc = parseHTML('index.html');
    const h1 = doc.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent).toBeTruthy();
  });
});
