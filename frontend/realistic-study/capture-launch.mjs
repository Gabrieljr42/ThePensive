import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { basin, books, clearColor, materials } from "./manifest.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const scratch =
  process.env.SCRATCH ||
  "C:\\Users\\gabri\\AppData\\Local\\Temp\\grok-goal-027c3ab92664\\implementer";

fs.mkdirSync(scratch, { recursive: true });

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
};

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const decoded = decodeURIComponent(url.pathname);
    let relative = decoded === "/" ? "/realistic-study/index.html" : decoded;
    if (relative.endsWith("/")) relative += "index.html";
    const filePath = path.normalize(path.join(frontendRoot, relative));
    if (!filePath.startsWith(frontendRoot)) {
      response.writeHead(403);
      response.end();
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function hexChannels(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome", headless: true });
  } catch (chromeError) {
    try {
      return await chromium.launch({ headless: true });
    } catch (bundledError) {
      const reason = `chrome: ${chromeError.message}\nbundled: ${bundledError.message}`;
      fs.writeFileSync(path.join(scratch, "launch-unavailable.txt"), reason);
      throw new Error(reason);
    }
  }
}

async function readScene(page) {
  const clear = hexChannels(clearColor);
  return page.evaluate(async (clearRgb) => {
    const study = window.__STUDY;
    const scene = study.scene;
    const canvas = study.renderer.domElement;
    const counts = { basin: 0, books: 0, window: 0, candle: 0 };
    const renderedBooks = [];
    let basinParts = [];
    scene.traverse((object) => {
      const role = object.userData && object.userData.role;
      if (role === "book") {
        counts.books += 1;
        const boards = object.getObjectByName("boards");
        renderedBooks.push({
          id: object.name,
          height: object.userData.height,
          color: boards ? `#${boards.material.color.getHexString()}` : null,
          parts: ["boards", "spine", "pages"].filter((name) => object.getObjectByName(name)),
        });
      } else if (role === "basin") counts.basin += 1;
      else if (role === "window") counts.window += 1;
      else if (role === "candle") counts.candle += 1;
    });
    const penseira = scene.getObjectByName("penseira");
    if (penseira) {
      basinParts = ["pedestal", "rim", "liquid"].filter((name) => penseira.getObjectByName(name));
    }
    const liquid = penseira && penseira.getObjectByName("liquid");
    const deskTop = scene.getObjectByName("desk-top");
    const sample = document.createElement("canvas");
    sample.width = canvas.width;
    sample.height = canvas.height;
    const context = sample.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let painted = 0;
    let minX = sample.width;
    let minY = sample.height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < sample.height; y += 1) {
      for (let x = 0; x < sample.width; x += 1) {
        const index = (y * sample.width + x) * 4;
        const delta =
          Math.abs(pixels[index] - clearRgb[0]) +
          Math.abs(pixels[index + 1] - clearRgb[1]) +
          Math.abs(pixels[index + 2] - clearRgb[2]);
        if (delta > 24) {
          painted += 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const area = sample.width * sample.height;
    return {
      canvas: { width: canvas.width, height: canvas.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      paintedFraction: painted / area,
      bboxCoverage: {
        x: area ? (maxX - minX) / sample.width : 0,
        y: area ? (maxY - minY) / sample.height : 0,
      },
      environment: scene.environment != null,
      shadowMapEnabled: study.renderer.shadowMap.enabled,
      keyLightCastShadow: study.keyLight.castShadow === true,
      counts,
      basinParts,
      renderedBooks,
      liquid: liquid
        ? { roughness: liquid.material.roughness, metalness: liquid.material.metalness }
        : null,
      deskRoughness: deskTop ? deskTop.material.roughness : null,
    };
  }, clear);
}

async function runOnce(browser, url, index) {
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  try {
    await page.waitForFunction(() => window.__STUDY_READY === true, null, { timeout: 30000 });
  } catch (error) {
    const boot = await page.evaluate(() => document.getElementById("boot")?.textContent || "");
    throw new Error(`${error.message}\nboot: ${boot}\nerrors: ${errors.join("\n")}`);
  }
  await page.waitForTimeout(350);
  const live = await readScene(page);
  const shot = path.join(scratch, `launch-${index}.png`);
  await page.screenshot({ path: shot, type: "png" });
  const report = {
    pageErrors: errors,
    canvas: live.canvas,
    viewport: live.viewport,
    matchesViewport:
      live.canvas.width === live.viewport.width && live.canvas.height === live.viewport.height,
    notDefaultCanvas: !(live.canvas.width === 300 && live.canvas.height === 150),
    paintedFraction: live.paintedFraction,
    bboxCoverage: live.bboxCoverage,
    environment: live.environment,
    shadowMapEnabled: live.shadowMapEnabled,
    keyLightCastShadow: live.keyLightCastShadow,
    counts: live.counts,
    basinParts: live.basinParts,
    liquid: live.liquid,
    deskRoughness: live.deskRoughness,
    renderedBooks: live.renderedBooks,
  };
  fs.writeFileSync(path.join(scratch, `launch-${index}.json`), JSON.stringify(report, null, 2));
  await context.close();
  return report;
}

function assertRun(report, index) {
  const problems = [];
  if (report.pageErrors.length) problems.push(`page errors: ${report.pageErrors.join(" | ")}`);
  if (!report.matchesViewport || !report.notDefaultCanvas) problems.push("canvas is not the viewport");
  if (!(report.paintedFraction > 0.5)) problems.push(`painted fraction ${report.paintedFraction}`);
  if (!(report.bboxCoverage.x > 0.5 && report.bboxCoverage.y > 0.5)) {
    problems.push(`bbox ${JSON.stringify(report.bboxCoverage)}`);
  }
  if (!report.environment) problems.push("missing environment");
  if (!report.shadowMapEnabled) problems.push("shadow map off");
  if (!report.keyLightCastShadow) problems.push("key light does not cast");
  if (report.counts.basin < 1) problems.push("no basin");
  if (report.counts.books < 6) problems.push("fewer than 6 books");
  if (report.counts.window < 1) problems.push("no window");
  if (report.counts.candle < 1) problems.push("no candle");
  if (report.basinParts.join(",") !== "pedestal,rim,liquid") problems.push("basin parts missing");
  if (!report.liquid) problems.push("liquid mesh missing");
  else {
    if (Math.abs(report.liquid.roughness - materials.liquid.roughness) > 1e-6) {
      problems.push("liquid roughness is not the shipped spec");
    }
    if (Math.abs(report.liquid.metalness - materials.liquid.metalness) > 1e-6) {
      problems.push("liquid metalness is not the shipped spec");
    }
  }
  if (Math.abs(report.deskRoughness - materials.wood.roughness) > 1e-6) {
    problems.push("desk wood roughness is not the shipped spec");
  }
  if (report.renderedBooks.length !== books.length) problems.push("book count differs from manifest");
  for (const book of books) {
    const rendered = report.renderedBooks.find((entry) => entry.id === book.id);
    if (!rendered) {
      problems.push(`missing rendered ${book.id}`);
      continue;
    }
    if (rendered.color !== book.color) problems.push(`${book.id} color ${rendered.color}`);
    if (Math.abs(rendered.height - book.height) > 1e-6) problems.push(`${book.id} height`);
    for (const part of ["boards", "spine", "pages"]) {
      if (!rendered.parts.includes(part)) problems.push(`${book.id} missing ${part}`);
    }
  }
  if (problems.length) {
    throw new Error(`launch ${index} failed\n${problems.join("\n")}`);
  }
}

const { server, port } = await startServer();
const url = `http://127.0.0.1:${port}/realistic-study/`;
let browser;
try {
  browser = await launchBrowser();
  const first = await runOnce(browser, url, 1);
  const second = await runOnce(browser, url, 2);
  assertRun(first, 1);
  assertRun(second, 2);
  const sameObjects =
    first.counts.basin === second.counts.basin &&
    first.counts.books === second.counts.books &&
    first.counts.window === second.counts.window &&
    first.counts.candle === second.counts.candle;
  if (!sameObjects) throw new Error("object counts differ between launches");
  if (first.counts.books !== books.length || first.counts.basin < 1) {
    throw new Error("manifest objects were not all drawn");
  }
  console.log(
    JSON.stringify(
      {
        url,
        books: books.length,
        basin: basin.id,
        launch1: {
          paintedFraction: first.paintedFraction,
          bboxCoverage: first.bboxCoverage,
          counts: first.counts,
        },
        launch2: {
          paintedFraction: second.paintedFraction,
          bboxCoverage: second.bboxCoverage,
          counts: second.counts,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
