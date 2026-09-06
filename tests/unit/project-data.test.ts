import { projectWorlds } from '../../src/data/projects';

describe('portfolio project data', () => {
  it('keeps the three product loops in their approved order', () => {
    expect(projectWorlds.map((project) => project.id)).toEqual(['nar', 'trendyol', 'blaster']);
    expect(projectWorlds.map((project) => project.index)).toEqual(['01', '02', '03']);

  });

  it('provides real media, technologies, and external destinations for every project', () => {
    for (const project of projectWorlds) {
      expect(project.media.length).toBeGreaterThan(0);
      expect(project.stack.length).toBeGreaterThan(3);
      expect(project.links.length).toBeGreaterThan(0);
      expect(project.flow.length).toBeGreaterThan(4);
      expect(project.decision.length).toBeGreaterThan(40);

      for (const link of project.links) {
        expect(link.href).toMatch(/^https:\/\//);
      }
    }
  });

  it('does not expose a resume download in project content', () => {
    expect(JSON.stringify(projectWorlds).toLowerCase()).not.toContain('resume');
    expect(JSON.stringify(projectWorlds).toLowerCase()).not.toContain('.pdf');
  });
});
