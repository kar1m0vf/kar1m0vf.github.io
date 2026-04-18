import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const iconsDir = path.join(repoRoot, 'assets', 'icons');
const accent = {
  strong: '#7ea6ff',
  soft: '#9bbcff',
  edge: 'rgba(155, 188, 255, 0.3)',
  glow: 'rgba(126, 166, 255, 0.22)',
  textSoft: '#c8d5ff',
};

const browserCandidates = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

const resolveBrowserExecutable = async () => {
  for (const candidate of browserCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error('No supported local browser executable found.');
};

const writeIco = async (outputPath, pngEntries) => {
  const count = pngEntries.length;
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = header.length;
  pngEntries.forEach(({ size, buffer }, index) => {
    const base = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, base + 0);
    header.writeUInt8(size >= 256 ? 0 : size, base + 1);
    header.writeUInt8(0, base + 2);
    header.writeUInt8(0, base + 3);
    header.writeUInt16LE(1, base + 4);
    header.writeUInt16LE(32, base + 6);
    header.writeUInt32LE(buffer.length, base + 8);
    header.writeUInt32LE(offset, base + 12);
    offset += buffer.length;
  });

  const payload = Buffer.concat([header, ...pngEntries.map((entry) => entry.buffer)]);
  await fs.writeFile(outputPath, payload);
};

const renderSvg = async (page, { svgContent, width, height, outputPath }) => {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
          }

          body {
            display: grid;
            place-items: center;
          }

          svg {
            width: ${width}px;
            height: ${height}px;
            display: block;
          }
        </style>
      </head>
      <body>${svgContent}</body>
    </html>`,
    { waitUntil: 'load' }
  );

  return page.screenshot({ path: outputPath, omitBackground: true });
};

const generateOgImage = async (page, { outputPath, iconSvgMarkup }) => {
  const width = 1200;
  const height = 630;
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          :root {
            color-scheme: dark;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background:
              radial-gradient(circle at 14% 18%, rgba(126, 166, 255, 0.09), transparent 30%),
              radial-gradient(circle at 84% 14%, rgba(155, 188, 255, 0.07), transparent 26%),
              linear-gradient(180deg, #050a0d, #03070a);
            color: #eff4ff;
            font-family: 'Segoe UI', 'Inter', sans-serif;
          }

          body::before,
          body::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(155, 188, 255, 0.08);
          }

          body::before {
            top: 140px;
          }

          body::after {
            bottom: 140px;
          }

          .frame {
            position: relative;
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            padding: 70px;
          }

          .card {
            width: 1060px;
            height: 460px;
            border-radius: 30px;
            border: 2px solid ${accent.edge};
            background:
              linear-gradient(156deg, rgba(126, 166, 255, 0.05), rgba(126, 166, 255, 0.012) 44%, rgba(0, 0, 0, 0) 68%),
              linear-gradient(180deg, rgba(7, 12, 16, 0.98), rgba(4, 8, 11, 0.96));
            box-shadow:
              0 30px 80px rgba(0, 0, 0, 0.46),
              inset 0 1px 0 rgba(255, 255, 255, 0.04);
            display: grid;
            grid-template-columns: 210px 1fr;
            gap: 50px;
            align-items: center;
            padding: 52px;
          }

          .icon-shell {
            width: 205px;
            height: 205px;
            border-radius: 34px;
            border: 2px solid rgba(155, 188, 255, 0.18);
            background:
              linear-gradient(152deg, rgba(126, 166, 255, 0.04), rgba(126, 166, 255, 0) 60%),
              linear-gradient(180deg, #0d161d, #091116);
            display: grid;
            place-items: center;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          }

          .icon-shell svg {
            width: 158px;
            height: 158px;
            display: block;
          }

          .copy {
            display: grid;
            gap: 16px;
          }

          h1 {
            margin: 0;
            font-size: 64px;
            line-height: 0.98;
            font-weight: 700;
            letter-spacing: -0.035em;
          }

          .role {
            margin: 0;
            font-size: 32px;
            line-height: 1.15;
            color: ${accent.textSoft};
            letter-spacing: -0.02em;
          }

          .meta {
            margin: 6px 0 0;
            padding-top: 18px;
            border-top: 2px solid rgba(155, 188, 255, 0.26);
            font-size: 24px;
            line-height: 1.3;
            color: rgba(210, 222, 255, 0.82);
          }

          .meta strong {
            color: ${accent.soft};
            font-weight: 600;
          }

          .glow {
            position: absolute;
            inset: auto auto 42px 42px;
            width: 260px;
            height: 260px;
            border-radius: 50%;
            background: ${accent.glow};
            filter: blur(55px);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="frame">
          <div class="glow"></div>
          <section class="card">
            <div class="icon-shell">${iconSvgMarkup}</div>
            <div class="copy">
              <h1>Kamil Kerimov</h1>
              <p class="role">Full-Stack Developer</p>
              <p class="meta"><strong>Portfolio:</strong> web, Python, automation, Telegram bots</p>
            </div>
          </section>
        </div>
      </body>
    </html>`,
    { waitUntil: 'load' }
  );

  await page.screenshot({ path: outputPath, type: 'png' });
};

const main = async () => {
  const executablePath = await resolveBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const faviconSvg = await fs.readFile(path.join(iconsDir, 'favicon.svg'), 'utf8');
    const pwa192Svg = await fs.readFile(path.join(iconsDir, 'pwa-192.svg'), 'utf8');
    const pwa512Svg = await fs.readFile(path.join(iconsDir, 'pwa-512.svg'), 'utf8');

    const faviconRenders = [
      { size: 16, outputPath: path.join(iconsDir, 'favicon-16x16.png') },
      { size: 32, outputPath: path.join(iconsDir, 'favicon-32x32.png') },
      { size: 48 },
      { size: 64 },
    ];
    const faviconBuffers = new Map();

    for (const render of faviconRenders) {
      const buffer = await renderSvg(page, {
        svgContent: faviconSvg,
        width: render.size,
        height: render.size,
        outputPath: render.outputPath,
      });
      faviconBuffers.set(render.size, buffer);
    }

    await renderSvg(page, {
      svgContent: pwa192Svg,
      width: 192,
      height: 192,
      outputPath: path.join(iconsDir, 'pwa-192.png'),
    });

    await renderSvg(page, {
      svgContent: pwa512Svg,
      width: 512,
      height: 512,
      outputPath: path.join(iconsDir, 'pwa-512.png'),
    });

    await renderSvg(page, {
      svgContent: pwa512Svg,
      width: 180,
      height: 180,
      outputPath: path.join(iconsDir, 'apple-touch-icon.png'),
    });

    const icoEntries = [16, 32, 48, 64].map((size) => ({
      size,
      buffer: faviconBuffers.get(size),
    }));
    await writeIco(path.join(iconsDir, 'favicon.ico'), icoEntries);

    const ogIconMarkup = pwa512Svg
      .replace(/<svg([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">')
      .replace(/width="512"/, '')
      .replace(/height="512"/, '');
    await generateOgImage(page, {
      outputPath: path.join(iconsDir, 'og-image.png'),
      iconSvgMarkup: ogIconMarkup,
    });
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
