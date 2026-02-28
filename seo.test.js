const fc = require('fast-check');
const { parseHTML, parseJSON, readFileContent, readCSS } = require('./test-helpers');

// ============================================================
// Property Tests
// ============================================================

// Feature: seo-optimization, Property 1: No inline styles on semantic elements
describe('Property 1: No inline styles on semantic elements', () => {
  const doc = parseHTML('index.html');
  const semanticTags = ['header', 'nav', 'footer', 'section', 'article'];

  test('no semantic element has a style attribute', () => {
    fc.assert(
      fc.property(
        fc.subarray(semanticTags, { minLength: 1 }),
        (tags) => {
          for (const tag of tags) {
            const elements = doc.querySelectorAll(tag);
            elements.forEach((el) => {
              expect(el.getAttribute('style')).toBeNull();
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 1.5**
});

// Feature: seo-optimization, Property 6: Heading hierarchy validity
describe('Property 6: Heading hierarchy validity', () => {
  const doc = parseHTML('index.html');
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const levels = headings.map((h) => parseInt(h.tagName[1], 10));

  test('exactly one h1', () => {
    const h1Count = levels.filter((l) => l === 1).length;
    expect(h1Count).toBe(1);
  });

  test('no skipped heading levels in document order', () => {
    // For every consecutive pair of headings in document order,
    // if the level increases, it must increase by exactly 1
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Math.max(levels.length - 2, 0) }),
        (i) => {
          if (levels.length < 2) return;
          const curr = levels[i];
          const next = levels[i + 1];
          // When going deeper, must not skip levels
          if (next > curr) {
            expect(next - curr).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 1.6**
});

// Feature: seo-optimization, Property 2: Social sharing meta tag consistency
describe('Property 2: Social sharing meta tag consistency', () => {
  const pages = ['index.html'];

  test('og:title, twitter:title, and title are consistent; og:image and twitter:image reference same .png', () => {
    fc.assert(
      fc.property(
        fc.subarray(pages, { minLength: 1 }),
        (selectedPages) => {
          for (const page of selectedPages) {
            const doc = parseHTML(page);
            const title = doc.querySelector('title')?.textContent || '';
            const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
            const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';

            // Titles should be consistent
            expect(ogTitle).toBe(title);
            expect(twitterTitle).toBe(title);

            // Images should reference same .png file
            const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
            const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || '';

            expect(ogImage).toBe(twitterImage);
            expect(ogImage).toMatch(/\.png$/);
            expect(twitterImage).toMatch(/\.png$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 3.1, 9.3**
});

// Feature: seo-optimization, Property 3: Twitter meta tags use name attribute
describe('Property 3: Twitter meta tags use name attribute', () => {
  const doc = parseHTML('index.html');

  test('all twitter: meta tags use name attribute, not property', () => {
    const allMeta = Array.from(doc.querySelectorAll('meta'));
    const twitterMetas = allMeta.filter(
      (m) => (m.getAttribute('name') || '').startsWith('twitter:') ||
             (m.getAttribute('property') || '').startsWith('twitter:')
    );

    expect(twitterMetas.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.subarray(twitterMetas, { minLength: 1 }),
        (subset) => {
          for (const meta of subset) {
            expect(meta.getAttribute('name')).toBeTruthy();
            expect(meta.getAttribute('name').startsWith('twitter:')).toBe(true);
            // Should NOT use property attribute for twitter tags
            const prop = meta.getAttribute('property') || '';
            expect(prop.startsWith('twitter:')).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 3.2**
});

// Feature: seo-optimization, Property 5: JSON-LD schemas contain required properties
describe('Property 5: JSON-LD schemas contain required properties', () => {
  const doc = parseHTML('index.html');
  const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  const schemas = jsonLdScripts.map((s) => JSON.parse(s.textContent));

  const requiredProps = {
    WebSite: ['name', 'url', 'potentialAction'],
    BreadcrumbList: ['itemListElement'],
    FAQPage: ['mainEntity'],
    Organization: ['name', 'url', 'logo'],
    SoftwareApplication: ['name', 'operatingSystem', 'applicationCategory', 'offers'],
  };

  test('each schema type has all required properties', () => {
    fc.assert(
      fc.property(
        fc.subarray(schemas, { minLength: 1 }),
        (subset) => {
          for (const schema of subset) {
            const type = schema['@type'];
            const required = requiredProps[type];
            if (required) {
              for (const prop of required) {
                expect(schema).toHaveProperty(prop);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('SoftwareApplication does not contain aggregateRating', () => {
    const softwareApp = schemas.find((s) => s['@type'] === 'SoftwareApplication');
    expect(softwareApp).toBeDefined();
    expect(softwareApp).not.toHaveProperty('aggregateRating');
  });

  test('FAQPage has at least 3 Q&A pairs', () => {
    const faqPage = schemas.find((s) => s['@type'] === 'FAQPage');
    expect(faqPage).toBeDefined();
    expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(3);
  });

  // **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
});

// ============================================================
// Unit Tests
// ============================================================

// Task 3.2: Unit tests for noscript content
describe('Noscript content', () => {
  const doc = parseHTML('index.html');

  test('noscript is inside main element', () => {
    const main = doc.querySelector('main');
    expect(main).not.toBeNull();
    const noscript = main.querySelector('noscript');
    expect(noscript).not.toBeNull();
  });

  test('noscript contains game title', () => {
    const noscript = doc.querySelector('main noscript');
    const text = noscript.innerHTML;
    expect(text).toMatch(/Sudoku/i);
  });

  test('noscript contains description', () => {
    const noscript = doc.querySelector('main noscript');
    const text = noscript.innerHTML;
    expect(text).toMatch(/free/i);
    expect(text).toMatch(/puzzle/i);
  });

  test('noscript contains difficulty levels', () => {
    const noscript = doc.querySelector('main noscript');
    const text = noscript.innerHTML;
    expect(text).toMatch(/Easy/i);
    expect(text).toMatch(/Medium/i);
    expect(text).toMatch(/Hard/i);
  });

  test('noscript contains rules', () => {
    const noscript = doc.querySelector('main noscript');
    const text = noscript.innerHTML;
    expect(text).toMatch(/row/i);
    expect(text).toMatch(/column/i);
    expect(text).toMatch(/9/);
  });

  // **Validates: Requirements 2.1, 2.3**
});

// Task 4.5: Unit tests for privacy page meta tags
describe('Privacy page meta tags', () => {
  const doc = parseHTML('privacy.html');

  test('has meta description', () => {
    const desc = doc.querySelector('meta[name="description"]');
    expect(desc).not.toBeNull();
    expect(desc.getAttribute('content')).toBeTruthy();
  });

  test('has robots noindex, follow', () => {
    const robots = doc.querySelector('meta[name="robots"]');
    expect(robots).not.toBeNull();
    expect(robots.getAttribute('content')).toBe('noindex, follow');
  });

  test('has canonical link', () => {
    const canonical = doc.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical.getAttribute('href')).toContain('privacy.html');
  });

  test('has OG tags', () => {
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    const ogDesc = doc.querySelector('meta[property="og:description"]');
    const ogUrl = doc.querySelector('meta[property="og:url"]');
    const ogType = doc.querySelector('meta[property="og:type"]');
    expect(ogTitle).not.toBeNull();
    expect(ogDesc).not.toBeNull();
    expect(ogUrl).not.toBeNull();
    expect(ogType).not.toBeNull();
  });

  // **Validates: Requirements 3.4, 8.1, 8.5**
});

// Task 7.4: Unit tests for sitemap and robots.txt
describe('Sitemap and robots.txt', () => {
  test('sitemap.xml contains both page URLs with lastmod, changefreq, and priority', () => {
    const sitemap = readFileContent('sitemap.xml');
    // Both URLs present
    expect(sitemap).toContain('https://www.sudokuonline.website/');
    expect(sitemap).toContain('https://www.sudokuonline.website/privacy.html');

    // Parse as DOM to check structure
    const doc = parseHTML('sitemap.xml');
    const urls = doc.querySelectorAll('url');
    expect(urls.length).toBeGreaterThanOrEqual(2);

    // Each url should have lastmod, changefreq, priority
    urls.forEach((url) => {
      expect(url.querySelector('lastmod')).not.toBeNull();
      expect(url.querySelector('changefreq')).not.toBeNull();
      expect(url.querySelector('priority')).not.toBeNull();
    });
  });

  test('robots.txt has User-agent, Allow, and Sitemap directives', () => {
    const robots = readFileContent('robots.txt');
    expect(robots).toMatch(/User-agent:\s*\*/);
    expect(robots).toMatch(/Allow:\s*\//);
    expect(robots).toMatch(/Sitemap:\s*https:\/\/www\.sudokuonline\.website\/sitemap\.xml/);
  });

  test('index.html has link[rel="sitemap"] in head', () => {
    const doc = parseHTML('index.html');
    const sitemapLink = doc.querySelector('head link[rel="sitemap"]');
    expect(sitemapLink).not.toBeNull();
    expect(sitemapLink.getAttribute('type')).toBe('application/xml');
    expect(sitemapLink.getAttribute('href')).toContain('sitemap.xml');
  });

  // **Validates: Requirements 5.1, 5.2, 5.3**
});
