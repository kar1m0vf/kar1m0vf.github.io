const chromePath = process.env.CHROME_PATH;
const isLinux = process.platform === 'linux';
const chromeFlags = isLinux ? '--no-sandbox --disable-dev-shm-usage' : '';

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run preview -- --port 4173',
      startServerReadyPattern: 'Local:',
      url: ['http://127.0.0.1:4173/'],
      settings: {
        ...(chromePath ? { chromePath } : {}),
        ...(chromeFlags ? { chromeFlags } : {}),
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
