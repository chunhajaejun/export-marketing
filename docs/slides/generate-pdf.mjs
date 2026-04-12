import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function generatePDF() {
  const browser = await puppeteer.launch({ headless: true });

  const slideFiles = [];
  for (let i = 1; i <= 9; i++) {
    slideFiles.push(path.join(__dirname, `slide-${String(i).padStart(2, '0')}.html`));
  }

  // Read all slide HTML files and combine into one document
  const slideContents = [];
  for (const slideFile of slideFiles) {
    let html = fs.readFileSync(slideFile, 'utf8');
    // Fix relative logo path to absolute
    html = html.replace(/\.\.\/\.\.\/public\//g, `file://${PROJECT_ROOT}/public/`);
    // Extract body inner content and style
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    if (styleMatch && bodyMatch) {
      slideContents.push({ style: styleMatch[1], body: bodyMatch[1] });
    }
  }

  // Build combined HTML - each slide in its own scoped container
  const combinedHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 1280px 720px; margin: 0; }
  html, body { margin: 0; padding: 0; width: 1280px; }
  .page-break { page-break-after: always; width: 1280px; height: 720px; overflow: hidden; position: relative; }
  .page-break:last-child { page-break-after: avoid; }
</style>
${slideContents.map((s, i) => `<style>/* slide ${i+1} */ .s${i+1} { ${s.style.replace(/@page\s*\{[^}]*\}/g, '').replace(/body\s*\{/g, '&.body-styles {')} }</style>`).join('\n')}
</head>
<body>
${slideContents.map((s, i) => `<div class="page-break">${s.body}</div>`).join('\n')}
</body>
</html>`;

  // Actually, the per-slide approach with scoped styles is complex.
  // Let's use a simpler approach: render each slide individually as a PDF page

  const outputPath = path.join(__dirname, '..', '지엔에이-대시보드-기능설명서.pdf');
  const tempPdfs = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Read and fix paths
    let html = fs.readFileSync(slideFiles[i], 'utf8');
    html = html.replace(/\.\.\/\.\.\/public\//g, `file://${PROJECT_ROOT}/public/`);

    // Write temp file with fixed paths
    const tempFile = path.join(__dirname, `_temp_${i}.html`);
    fs.writeFileSync(tempFile, html);

    await page.goto(`file://${tempFile}`, { waitUntil: 'networkidle0', timeout: 30000 });

    const tempPdf = path.join(__dirname, `_temp_${i}.pdf`);
    await page.pdf({
      path: tempPdf,
      width: '1280px',
      height: '720px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    tempPdfs.push(tempPdf);
    fs.unlinkSync(tempFile);
    await page.close();
    console.log(`  Slide ${i + 1} rendered`);
  }

  // Combine PDFs using a simple concatenation approach
  // PDF files can be combined by creating a multi-page document
  // Since puppeteer outputs single-page PDFs, we'll use a different approach:
  // Re-render all slides in one page using iframes or inline

  // Better approach: create single combined HTML with all slides inline
  const allSlides = [];
  for (const slideFile of slideFiles) {
    let html = fs.readFileSync(slideFile, 'utf8');
    html = html.replace(/\.\.\/\.\.\/public\//g, `file://${PROJECT_ROOT}/public/`);

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (bodyMatch && styleMatch) {
      allSlides.push({ body: bodyMatch[1], style: styleMatch[1] });
    }
  }

  // Generate unique class prefixes to avoid style conflicts
  const megaHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 1280px 720px; margin: 0; }
  html, body { margin: 0; padding: 0; }
  .slide-page { width: 1280px; height: 720px; overflow: hidden; page-break-after: always; position: relative; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; background: #0f172a; color: #e2e8f0; }
  .slide-page:last-child { page-break-after: avoid; }
</style>
</head>
<body>
${allSlides.map((s, i) => {
    // Wrap each slide body in a container with its own styles
    // Remove body/html selectors and @page from individual styles
    let cleanStyle = s.style
      .replace(/@page\s*\{[^}]*\}/g, '')
      .replace(/\bbody\s*\{/g, `.sp-${i} {`)
      .replace(/html\s*,\s*body\s*\{/g, `.sp-${i} {`)
      .replace(/html\s*\{[^}]*\}/g, '');

    return `<style>${cleanStyle}</style>
<div class="slide-page sp-${i}">
${s.body}
</div>`;
  }).join('\n')}
</body>
</html>`;

  const megaFile = path.join(__dirname, '_mega.html');
  fs.writeFileSync(megaFile, megaHtml);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`file://${megaFile}`, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.pdf({
    path: outputPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  // Clean up temp files
  fs.unlinkSync(megaFile);
  for (const tp of tempPdfs) {
    try { fs.unlinkSync(tp); } catch(e) {}
  }

  await browser.close();
  console.log(`PDF generated: ${outputPath}`);
}

generatePDF().catch(console.error);
