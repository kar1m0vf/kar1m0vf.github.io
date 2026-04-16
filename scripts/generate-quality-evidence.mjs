import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const resolveRepoPath = (...segments) => path.join(repoRoot, ...segments);

const readJsonFile = (absolutePath) => {
  if (!existsSync(absolutePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    return null;
  }
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readTextFile = (absolutePath) => {
  if (!existsSync(absolutePath)) {
    return '';
  }
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch (error) {
    return '';
  }
};

const getGitValue = (command) => {
  try {
    return execSync(command, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch (error) {
    return '';
  }
};

const resolveGitMetaFromFiles = () => {
  const fallback = { branch: '', commit: '' };
  const gitDir = resolveRepoPath('.git');
  if (!existsSync(gitDir)) {
    return fallback;
  }

  const headContent = readTextFile(path.join(gitDir, 'HEAD')).trim();
  if (!headContent) {
    return fallback;
  }

  if (!headContent.startsWith('ref: ')) {
    return {
      branch: 'detached',
      commit: headContent,
    };
  }

  const refPath = headContent.slice(5).trim();
  const branch = refPath.split('/').pop() || '';
  const looseRefPath = path.join(gitDir, ...refPath.split('/'));
  const looseRefValue = readTextFile(looseRefPath).trim();
  if (looseRefValue) {
    return { branch, commit: looseRefValue };
  }

  const packedRefsPath = path.join(gitDir, 'packed-refs');
  const packedRefs = readTextFile(packedRefsPath);
  if (!packedRefs) {
    return { branch, commit: '' };
  }

  const matchedLine = packedRefs
    .split(/\r?\n/)
    .find((line) => line && !line.startsWith('#') && !line.startsWith('^') && line.endsWith(` ${refPath}`));

  if (!matchedLine) {
    return { branch, commit: '' };
  }

  const [commit] = matchedLine.split(' ');
  return { branch, commit: String(commit || '').trim() };
};

const parseVitestSummary = (report) => {
  if (!report || typeof report !== 'object') {
    return { passed: 0, failed: 0, durationMs: null };
  }

  const directPassed = toNumber(report.numPassedTests);
  const directFailed = toNumber(report.numFailedTests);

  let passed = directPassed || 0;
  let failed = directFailed || 0;
  let durationMs = null;

  const testResults = Array.isArray(report.testResults) ? report.testResults : [];
  if ((directPassed === null || directFailed === null) && testResults.length > 0) {
    passed = 0;
    failed = 0;
    testResults.forEach((suite) => {
      const assertions = Array.isArray(suite.assertionResults) ? suite.assertionResults : [];
      assertions.forEach((assertion) => {
        if (assertion && assertion.status === 'passed') {
          passed += 1;
        } else if (assertion && assertion.status === 'failed') {
          failed += 1;
        }
      });
    });
  }

  const directDuration = toNumber(report.duration);
  if (directDuration !== null) {
    durationMs = Math.max(0, Math.round(directDuration));
  } else {
    let totalDuration = 0;
    let hasDurationData = false;
    testResults.forEach((suite) => {
      const start = toNumber(suite.startTime);
      const end = toNumber(suite.endTime);
      if (start !== null && end !== null && end >= start) {
        totalDuration += end - start;
        hasDurationData = true;
      }
    });
    if (hasDurationData) {
      durationMs = Math.round(totalDuration);
    }
  }

  return { passed, failed, durationMs };
};

const collectPlaywrightSuites = (suites, bucket) => {
  if (!Array.isArray(suites)) {
    return;
  }
  suites.forEach((suite) => {
    if (suite && Array.isArray(suite.specs)) {
      suite.specs.forEach((spec) => bucket.push(spec));
    }
    if (suite && Array.isArray(suite.suites)) {
      collectPlaywrightSuites(suite.suites, bucket);
    }
  });
};

const parsePlaywrightSummary = (report) => {
  const fallback = {
    passed: 0,
    failed: 0,
    durationMs: null,
    projects: {
      'chromium-desktop': { passed: 0, failed: 0 },
      'chromium-mobile': { passed: 0, failed: 0 },
    },
  };

  if (!report || typeof report !== 'object') {
    return fallback;
  }

  const stats = report.stats && typeof report.stats === 'object' ? report.stats : {};
  const expected = Math.max(0, toNumber(stats.expected) || 0);
  const unexpected = Math.max(0, toNumber(stats.unexpected) || 0);
  const durationMs = toNumber(stats.duration);

  const summary = {
    passed: expected,
    failed: unexpected,
    durationMs: durationMs === null ? null : Math.max(0, Math.round(durationMs)),
    projects: {},
  };

  const specs = [];
  collectPlaywrightSuites(report.suites, specs);
  specs.forEach((spec) => {
    if (!spec || !Array.isArray(spec.tests)) {
      return;
    }

    spec.tests.forEach((testCase) => {
      const projectName = String(testCase.projectName || 'unknown');
      if (!summary.projects[projectName]) {
        summary.projects[projectName] = { passed: 0, failed: 0 };
      }

      const results = Array.isArray(testCase.results) ? testCase.results : [];
      const lastResult = results.length > 0 ? results[results.length - 1] : null;
      const finalStatus = lastResult && typeof lastResult.status === 'string' ? lastResult.status : '';

      if (finalStatus === 'passed' || finalStatus === 'flaky') {
        summary.projects[projectName].passed += 1;
        return;
      }
      if (finalStatus) {
        summary.projects[projectName].failed += 1;
      }
    });
  });

  if (!summary.projects['chromium-desktop']) {
    summary.projects['chromium-desktop'] = { passed: 0, failed: 0 };
  }
  if (!summary.projects['chromium-mobile']) {
    summary.projects['chromium-mobile'] = { passed: 0, failed: 0 };
  }

  return summary;
};

const parseLighthouseSummary = (manifest, lhrReports) => {
  const fallback = {
    performance: null,
    accessibility: null,
    bestPractices: null,
    seo: null,
  };

  const categoryMapping = {
    performance: ['performance', 'performanceScore'],
    accessibility: ['accessibility', 'accessibilityScore'],
    bestPractices: ['best-practices', 'bestPractices', 'bestPracticesScore'],
    seo: ['seo', 'seoScore'],
  };

  const totals = {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
  };
  const counts = {
    performance: 0,
    accessibility: 0,
    bestPractices: 0,
    seo: 0,
  };

  const registerScores = (rawScoreObject) => {
    if (!rawScoreObject || typeof rawScoreObject !== 'object') {
      return;
    }
    Object.entries(categoryMapping).forEach(([key, aliases]) => {
      let normalized = null;
      aliases.some((alias) => {
        const score = toNumber(rawScoreObject[alias]);
        if (score === null) {
          return false;
        }
        normalized = score <= 1 ? score : score / 100;
        return true;
      });
      if (normalized !== null) {
        totals[key] += normalized;
        counts[key] += 1;
      }
    });
  };

  if (Array.isArray(manifest) && manifest.length) {
    manifest.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const summary = entry.summary && typeof entry.summary === 'object' ? entry.summary : {};
      registerScores(summary);
    });
  }

  if (!Object.values(counts).some((value) => value > 0) && Array.isArray(lhrReports) && lhrReports.length) {
    lhrReports.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const categories = entry.categories && typeof entry.categories === 'object' ? entry.categories : {};
      registerScores({
        performance: categories.performance && categories.performance.score,
        accessibility: categories.accessibility && categories.accessibility.score,
        'best-practices': categories['best-practices'] && categories['best-practices'].score,
        seo: categories.seo && categories.seo.score,
      });
    });
  }

  if (!Object.values(counts).some((value) => value > 0)) {
    return fallback;
  }

  const result = {};
  Object.keys(totals).forEach((key) => {
    if (!counts[key]) {
      result[key] = null;
      return;
    }
    result[key] = Number((totals[key] / counts[key]).toFixed(4));
  });

  return result;
};

const readLocalLhrReports = () => {
  const lighthouseDir = resolveRepoPath('.lighthouseci');
  if (!existsSync(lighthouseDir)) {
    return [];
  }
  const entries = readdirSync(lighthouseDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^lhr-.*\.json$/i.test(entry.name))
    .map((entry) => readJsonFile(path.join(lighthouseDir, entry.name)))
    .filter((entry) => entry && typeof entry === 'object');
};

const vitestReport = readJsonFile(resolveRepoPath('test-results', 'vitest-report.json'));
const playwrightReport = readJsonFile(resolveRepoPath('test-results', 'playwright-report.json'));
const lighthouseManifest = readJsonFile(resolveRepoPath('.lighthouseci', 'manifest.json'));
const lhrReports = readLocalLhrReports();

const unitSummary = parseVitestSummary(vitestReport);
const e2eSummary = parsePlaywrightSummary(playwrightReport);
const lighthouseSummary = parseLighthouseSummary(lighthouseManifest, lhrReports);

const gitFromFiles = resolveGitMetaFromFiles();
const branchName =
  process.env.GITHUB_REF_NAME || gitFromFiles.branch || getGitValue('git rev-parse --abbrev-ref HEAD') || 'unknown-branch';
const commitSha = process.env.GITHUB_SHA || gitFromFiles.commit || getGitValue('git rev-parse HEAD') || 'unknown-commit';

const buildOk = process.env.QUALITY_BUILD_OK === 'false' ? false : true;
const typecheckOk = process.env.QUALITY_TYPECHECK_OK === 'false' ? false : true;
const hasFailedChecks = !buildOk || !typecheckOk || unitSummary.failed > 0 || e2eSummary.failed > 0;

const lighthouseScores = [
  lighthouseSummary.performance,
  lighthouseSummary.accessibility,
  lighthouseSummary.bestPractices,
  lighthouseSummary.seo,
];
const lighthouseAvailable = lighthouseScores.every((score) => score !== null);
const lighthouseHealthy = lighthouseScores.every((score) => score !== null && score >= 0.9);

let overallStatus = 'pending';
if (hasFailedChecks) {
  overallStatus = 'degraded';
} else if (lighthouseAvailable) {
  overallStatus = lighthouseHealthy ? 'healthy' : 'monitoring';
}

const runUrl =
  process.env.GITHUB_RUN_ID && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : `https://github.com/${process.env.GITHUB_REPOSITORY || 'kar1m0vf/kar1m0vf.github.io'}/actions`;

const evidence = {
  generatedAt: new Date().toISOString(),
  source: process.env.GITHUB_ACTIONS ? 'ci-generated' : 'local-generated',
  branch: branchName,
  commit: commitSha,
  runUrl,
  build: {
    ok: buildOk,
  },
  typecheck: {
    ok: typecheckOk,
  },
  unit: unitSummary,
  e2e: e2eSummary,
  lighthouse: lighthouseSummary,
  overallStatus,
};

const targetDir = resolveRepoPath('assets', 'data');
const targetFile = path.join(targetDir, 'quality-evidence.json');
mkdirSync(targetDir, { recursive: true });
writeFileSync(targetFile, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

process.stdout.write(`Generated quality evidence snapshot: ${path.relative(repoRoot, targetFile)}\n`);
