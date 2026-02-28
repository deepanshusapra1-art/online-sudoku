const fc = require('fast-check');
const { parseHTML, parseJSON, readCSS } = require('./test-helpers');

// ============================================================
// Property Tests
// ============================================================

// Feature: seo-optimization, Property 4: Color palette defined via CSS custom properties
describe('Property 4: Color palette via CSS custom properties', () => {
  const css = readCSS('style.css');

  // Extract color-related declarations from shared component selectors
  // We look for color, background-color, background, border-color declarations
  // on shared components (not :root itself) and check they use var(--)
  const sharedComponentSelectors = [
    'header', 'nav', 'footer', '.controls button', '.numpad button',
    '.how-to-play', '.footer-link', '.nav-link', 'body',
    '.modal-content button', '.back-btn', '.tile',
  ];

  // Parse CSS to find color declarations on shared components
  function extractColorDeclarations(cssText) {
    const declarations = [];
    // Remove comments
    const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    // Match rule blocks
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(cleaned)) !== null) {
      const selector = match[1].trim();
      const body = match[2];
      // Skip :root
      if (selector === ':root') continue;
      // Check if selector matches any shared component
      const isShared = sharedComponentSelectors.some(
        (s) => selector.includes(s)
      );
      if (!isShared) continue;

      // Skip state-specific selectors (e.g., .tile.fixed, .tile.error)
      // These are element-specific overrides, not shared component base colors
      if (/\.tile\.(fixed|error|user-input|selected)/.test(selector)) continue;
      if (/\.delete-btn/.test(selector)) continue;

      // Find color-related properties
      const propRegex = /\b(color|background-color|border-color)\s*:\s*([^;]+)/gi;
      let propMatch;
      while ((propMatch = propRegex.exec(body)) !== null) {
        const property = propMatch[1].trim();
        const value = propMatch[2].trim();
        // Skip 'white', 'transparent', 'inherit', 'initial', 'unset', 'currentColor'
        if (/^(white|transparent|inherit|initial|unset|currentColor|none)$/i.test(value)) continue;
        declarations.push({ selector, property, value });
      }
    }
    return declarations;
  }

  const colorDeclarations = extractColorDeclarations(css);

  test('color declarations on shared components use CSS custom properties', () => {
    expect(colorDeclarations.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.subarray(colorDeclarations, { minLength: 1 }),
        (subset) => {
          for (const decl of subset) {
            expect(decl.value).toMatch(/var\(--/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 7.6**
});

// ============================================================
// Unit Tests
// ============================================================

// Task 8.4: Unit tests for performance hints
describe('Performance hints', () => {
  const doc = parseHTML('index.html');
  const css = readCSS('style.css');

  test('preload link for CSS exists', () => {
    const preload = doc.querySelector('link[rel="preload"][as="style"]');
    expect(preload).not.toBeNull();
    expect(preload.getAttribute('href')).toContain('style.css');
  });

  test('AdSense script has defer attribute', () => {
    const adsenseScript = doc.querySelector('script[src*="adsbygoogle"]');
    expect(adsenseScript).not.toBeNull();
    expect(adsenseScript.hasAttribute('defer')).toBe(true);
  });

  test('no amp-auto-ads elements', () => {
    const ampAutoAds = doc.querySelector('amp-auto-ads');
    expect(ampAutoAds).toBeNull();
  });

  test('CSS has aspect-ratio on #game-board', () => {
    expect(css).toMatch(/#game-board\s*\{[^}]*aspect-ratio\s*:/);
  });

  // **Validates: Requirements 6.1, 6.3, 6.5, 6.6**
});

// Task 10.7: Unit tests for visual polish
describe('Visual polish', () => {
  const css = readCSS('style.css');
  const doc = parseHTML('index.html');

  test('how-to-play section has line-height >= 1.6', () => {
    const lineHeightMatch = css.match(/\.how-to-play\s*\{[^}]*line-height\s*:\s*([\d.]+)/);
    expect(lineHeightMatch).not.toBeNull();
    const lineHeight = parseFloat(lineHeightMatch[1]);
    expect(lineHeight).toBeGreaterThanOrEqual(1.6);
  });

  test('CSS contains active/selected state rule for difficulty buttons', () => {
    // Should have a rule for .controls button.active or similar
    expect(css).toMatch(/\.controls\s+button\.active\s*\{/);
  });

  test('index.html contains a difficulty label element', () => {
    const label = doc.querySelector('#difficulty-label');
    expect(label).not.toBeNull();
  });

  // **Validates: Requirements 7.2, 7.4, 7.8**
});

// Task 11.3: Unit tests for privacy page structure
describe('Privacy page structure', () => {
  const doc = parseHTML('privacy.html');
  const html = require('fs').readFileSync(require('path').resolve(__dirname, 'privacy.html'), 'utf-8');

  test('has no inline style blocks', () => {
    const styleBlocks = doc.querySelectorAll('style');
    expect(styleBlocks.length).toBe(0);
  });

  test('has link to style.css', () => {
    const link = doc.querySelector('link[rel="stylesheet"][href="style.css"]');
    expect(link).not.toBeNull();
  });

  test('has nav element', () => {
    const nav = doc.querySelector('nav');
    expect(nav).not.toBeNull();
  });

  test('does not contain Google search URL', () => {
    expect(html).not.toContain('google.com/search');
  });

  // **Validates: Requirements 8.2, 8.3, 8.4**
});

// Task 12.2: Unit tests for manifest fields
describe('Manifest fields', () => {
  const manifest = parseJSON('manifest.json');

  test('name is "Sudoku Online"', () => {
    expect(manifest.name).toBe('Sudoku Online');
  });

  test('description exists', () => {
    expect(manifest.description).toBeTruthy();
  });

  test('categories are ["games", "puzzle"]', () => {
    expect(manifest.categories).toEqual(['games', 'puzzle']);
  });

  test('at least one icon has purpose "any maskable"', () => {
    const hasMaskable = manifest.icons.some(
      (icon) => icon.purpose && icon.purpose.includes('maskable')
    );
    expect(hasMaskable).toBe(true);
  });

  // **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
});
