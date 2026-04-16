const chromePath = process.env.CHROME_PATH;

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: 'npx http-server . -p 4173 -c-1 --silent',
      url: ['http://127.0.0.1:4173/', 'http://127.0.0.1:4173/projects.html', 'http://127.0.0.1:4173/contact.html'],
      settings: {
        ...(chromePath ? { chromePath } : {}),
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
