export const setupQualityEvidence = () => {
  const qualityNode = document.querySelector('[data-quality-evidence]');
  if (!qualityNode) {
    return;
  }

  const sourcePath = String(qualityNode.getAttribute('data-quality-source') || 'assets/data/quality-evidence.json').trim();
  const statusNode = qualityNode.querySelector('[data-quality-status]');
  const runLinkNode = qualityNode.querySelector('[data-quality-run-link]');

  const ui = {
    branch: qualityNode.querySelector('[data-quality-branch]'),
    commit: qualityNode.querySelector('[data-quality-commit]'),
    scope: qualityNode.querySelector('[data-quality-scope]'),
    unitSummary: qualityNode.querySelector('[data-quality-unit-summary]'),
    unitDuration: qualityNode.querySelector('[data-quality-unit-duration]'),
    unitPassed: qualityNode.querySelector('[data-quality-unit-passed]'),
    unitFailed: qualityNode.querySelector('[data-quality-unit-failed]'),
    e2eSummary: qualityNode.querySelector('[data-quality-e2e-summary]'),
    e2eDuration: qualityNode.querySelector('[data-quality-e2e-duration]'),
    e2eDesktop: qualityNode.querySelector('[data-quality-e2e-desktop]'),
    e2eMobile: qualityNode.querySelector('[data-quality-e2e-mobile]'),
    lhPerformance: qualityNode.querySelector('[data-quality-lh-performance]'),
    lhAccessibility: qualityNode.querySelector('[data-quality-lh-accessibility]'),
    lhBest: qualityNode.querySelector('[data-quality-lh-best]'),
    lhSeo: qualityNode.querySelector('[data-quality-lh-seo]'),
    build: qualityNode.querySelector('[data-quality-build]'),
    typecheck: qualityNode.querySelector('[data-quality-typecheck]'),
    overall: qualityNode.querySelector('[data-quality-overall]'),
  };

  const setText = (node, value) => {
    if (!node) {
      return;
    }
    node.textContent = value;
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatDuration = (value) => {
    const durationMs = toNumber(value);
    if (durationMs === null) {
      return '--';
    }
    if (durationMs >= 1000) {
      return `${(durationMs / 1000).toFixed(durationMs >= 10000 ? 1 : 2)}s`;
    }
    return `${Math.round(durationMs)}ms`;
  };

  const normalizeScore = (value) => {
    const score = toNumber(value);
    if (score === null) {
      return null;
    }
    return score <= 1 ? score * 100 : score;
  };

  const applyScore = (node, value) => {
    if (!node) {
      return;
    }
    const normalized = normalizeScore(value);
    node.classList.remove('score-good', 'score-warn', 'score-bad', 'score-pending');
    if (normalized === null) {
      node.textContent = '--';
      node.classList.add('score-pending');
      return;
    }
    node.textContent = `${Math.round(normalized)}`;
    if (normalized >= 90) {
      node.classList.add('score-good');
      return;
    }
    if (normalized >= 50) {
      node.classList.add('score-warn');
      return;
    }
    node.classList.add('score-bad');
  };

  const formatProjectSummary = (projectData) => {
    if (!projectData || typeof projectData !== 'object') {
      return 'pending';
    }
    const passed = Math.max(0, toNumber(projectData.passed) || 0);
    const failed = Math.max(0, toNumber(projectData.failed) || 0);
    return `${passed} pass / ${failed} fail`;
  };

  const sumProjectResults = (projectsData, key) =>
    Object.values(projectsData).reduce(
      (total, projectData) => total + Math.max(0, toNumber(projectData && projectData[key]) || 0),
      0
    );

  const applyGateStatus = (node, label, status) => {
    if (!node) {
      return;
    }
    if (status === true) {
      node.textContent = `${label}: pass`;
      return;
    }
    if (status === false) {
      node.textContent = `${label}: fail`;
      return;
    }
    if (status === 'monitor') {
      node.textContent = `${label}: monitor`;
      return;
    }
    node.textContent = `${label}: pending`;
  };

  const applyEvidence = (evidence, note) => {
    const safeEvidence = evidence && typeof evidence === 'object' ? evidence : {};
    const branchValue = safeEvidence.branch ? String(safeEvidence.branch) : 'pending';
    const commitValue = safeEvidence.commit ? String(safeEvidence.commit).slice(0, 7) : 'pending';

    const unit = safeEvidence.unit && typeof safeEvidence.unit === 'object' ? safeEvidence.unit : {};
    const unitPassed = Math.max(0, toNumber(unit.passed) || 0);
    const unitFailed = Math.max(0, toNumber(unit.failed) || 0);
    const unitTotal = unitPassed + unitFailed;

    const e2e = safeEvidence.e2e && typeof safeEvidence.e2e === 'object' ? safeEvidence.e2e : {};
    const e2ePassed = Math.max(0, toNumber(e2e.passed) || 0);
    const e2eFailed = Math.max(0, toNumber(e2e.failed) || 0);
    const projects = e2e.projects && typeof e2e.projects === 'object' ? e2e.projects : {};
    const projectPassed = sumProjectResults(projects, 'passed');
    const projectFailed = sumProjectResults(projects, 'failed');
    const hasProjectResults = projectPassed + projectFailed > 0;
    const displayedE2ePassed = hasProjectResults ? projectPassed : e2ePassed;
    const displayedE2eFailed = hasProjectResults ? projectFailed : e2eFailed;
    const e2eTotal = displayedE2ePassed + displayedE2eFailed;

    const lighthouse =
      safeEvidence.lighthouse && typeof safeEvidence.lighthouse === 'object' ? safeEvidence.lighthouse : {};
    const overallStatus =
      typeof safeEvidence.overallStatus === 'string' ? safeEvidence.overallStatus.toLowerCase() : '';
    const buildOk = safeEvidence.build && typeof safeEvidence.build === 'object' ? safeEvidence.build.ok : null;
    const typecheckOk =
      safeEvidence.typecheck && typeof safeEvidence.typecheck === 'object' ? safeEvidence.typecheck.ok : null;

    const hasFailedChecks =
      unitFailed > 0 || displayedE2eFailed > 0 || buildOk === false || typecheckOk === false;
    const scopeLabel = [unitTotal > 0 ? `${unitTotal} unit` : '', e2eTotal > 0 ? `${e2eTotal} e2e` : '']
      .filter(Boolean)
      .join(' + ');

    setText(ui.branch, branchValue);
    setText(ui.commit, commitValue);
    setText(ui.scope, scopeLabel || 'pending');

    setText(ui.unitSummary, unitTotal > 0 ? `${unitPassed}/${unitTotal} green` : 'pending');
    setText(ui.unitDuration, formatDuration(unit.durationMs));
    setText(ui.unitPassed, String(unitPassed));
    setText(ui.unitFailed, String(unitFailed));

    setText(ui.e2eSummary, e2eTotal > 0 ? `${displayedE2ePassed}/${e2eTotal} green` : 'pending');
    setText(ui.e2eDuration, formatDuration(e2e.durationMs));
    setText(ui.e2eDesktop, formatProjectSummary(projects['chromium-desktop']));
    setText(ui.e2eMobile, formatProjectSummary(projects['chromium-mobile']));

    applyScore(ui.lhPerformance, lighthouse.performance);
    applyScore(ui.lhAccessibility, lighthouse.accessibility);
    applyScore(ui.lhBest, lighthouse.bestPractices);
    applyScore(ui.lhSeo, lighthouse.seo);

    applyGateStatus(ui.build, 'Build', buildOk);
    applyGateStatus(ui.typecheck, 'Typecheck', typecheckOk);
    const overallGateState = hasFailedChecks
      ? false
      : overallStatus === 'healthy'
        ? true
        : overallStatus === 'degraded'
          ? false
          : overallStatus === 'monitoring'
            ? 'monitor'
            : null;
    applyGateStatus(ui.overall, 'Overall', overallGateState);

    if (runLinkNode && safeEvidence.runUrl) {
      const runUrl = String(safeEvidence.runUrl);
      runLinkNode.setAttribute('href', runUrl);
      const runMatch = runUrl.match(/\/runs\/(\d+)/);
      runLinkNode.textContent = runMatch ? `Open Full CI Run #${runMatch[1]}` : 'Open Full CI Run';
    }

    setText(statusNode, note);
  };

  fetch(sourcePath, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load evidence: ${response.status}`);
      }
      return response.json();
    })
    .then((evidence) => {
      applyEvidence(evidence, 'Live snapshot loaded from repository evidence JSON.');
    })
    .catch(() => {
      applyEvidence({}, 'Quality evidence JSON is unavailable. Run the quality pipeline to regenerate the snapshot.');
    });
};
