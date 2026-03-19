import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SCRIPT_PATH = path.join(ROOT, "script.js");
const OUTPUT_DIR = path.join(ROOT, "assets", "artworks");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const USER_AGENT = "PainterverseArtworkCache/1.0 (local asset builder)";
const PREVIEW_SIZE = 720;
const FULL_SIZE = 1600;
const CONCURRENCY = 6;

const source = await fs.readFile(SCRIPT_PATH, "utf8");
const supplementalSeeds = evaluateLiteral(
  extractBetween(source, "const SUPPLEMENTAL_PAINTER_SEEDS = ", ";\n\nfunction buildSupplementalPainters")
);
const basePainters = evaluateLiteral(
  `[${extractBetween(source, "const PAINTERS = [\n", "  ...buildSupplementalPainters(),\n];")}]`
);

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const painters = [...basePainters, ...buildSupplementalPainters(supplementalSeeds)];
const works = painters.flatMap((painter) =>
  painter.works.map((work, index) => ({
    painterId: painter.id,
    painterName: painter.name,
    lookupTitle: work.pageTitle || work.title,
    artworkTitle: work.title,
    explicitPageTitle: work.pageTitle,
    fileStem: `${String(index + 1).padStart(2, "0")}-${slugify(work.title) || `work-${index + 1}`}`,
  }))
);

const manifest = {};
let completed = 0;
let cached = 0;
let skipped = 0;
let failed = 0;

await runPool(works, CONCURRENCY, async (work) => {
  const cacheKey = `${work.painterId}:${work.lookupTitle}`;
  try {
    const asset = await fetchWikiAsset(work.lookupTitle, work.explicitPageTitle, work.artworkTitle);
    if (!asset) {
      skipped += 1;
      logProgress(work, "skip");
      return;
    }

    const painterDir = path.join(OUTPUT_DIR, work.painterId);
    await fs.mkdir(painterDir, { recursive: true });

    const previewPath = await downloadImage(asset.previewUrl, path.join(painterDir, `${work.fileStem}-preview`));
    const fullPath = asset.fullImageUrl
      ? await downloadImage(asset.fullImageUrl, path.join(painterDir, `${work.fileStem}-full`))
      : previewPath;

    manifest[cacheKey] = {
      previewUrl: toWebPath(previewPath),
      fullImageUrl: toWebPath(fullPath),
      pageUrl: asset.pageUrl,
      pageTitle: asset.pageTitle,
    };

    cached += 1;
    logProgress(work, "cached");
  } catch (error) {
    failed += 1;
    console.error(`[failed] ${work.painterName} / ${work.artworkTitle}: ${error.message}`);
  } finally {
    completed += 1;
  }
});

await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log("");
console.log(`Done. cached=${cached} skipped=${skipped} failed=${failed} total=${works.length}`);
console.log(`Manifest: ${MANIFEST_PATH}`);

function extractBetween(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    throw new Error(`Start marker not found: ${startMarker}`);
  }
  const fromIndex = startIndex + startMarker.length;
  const endIndex = text.indexOf(endMarker, fromIndex);
  if (endIndex === -1) {
    throw new Error(`End marker not found: ${endMarker}`);
  }
  return text.slice(fromIndex, endIndex).trim();
}

function evaluateLiteral(literalSource) {
  return Function(`"use strict"; return (${literalSource});`)();
}

function buildSupplementalPainters(seedsByEra) {
  return Object.values(seedsByEra).flatMap((seeds) =>
    seeds.map((seed) => ({
      id: slugify(seed.latin || seed.name),
      name: seed.name,
      works: (seed.works || []).slice(0, 2).map((work) =>
        typeof work === "string"
          ? { title: work }
          : {
              title: work.title,
              pageTitle: work.pageTitle,
            }
      ),
    }))
  );
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchWikiAsset(query, explicitPageTitle, artworkTitle) {
  for (const language of ["en", "zh"]) {
    try {
      const previewMeta = await fetchWikiMetadata(query, language, PREVIEW_SIZE);
      const matches = explicitPageTitle || isArtworkPageMatch(previewMeta.pageTitle, artworkTitle);
      if (!matches) {
        continue;
      }

      const fullMeta =
        (await fetchWikiMetadata(query, language, FULL_SIZE).catch(() => null)) || previewMeta;

      return {
        previewUrl: previewMeta.thumbnailUrl || previewMeta.originalUrl,
        fullImageUrl:
          fullMeta.thumbnailUrl ||
          fullMeta.originalUrl ||
          previewMeta.originalUrl ||
          previewMeta.thumbnailUrl,
        pageUrl: previewMeta.pageUrl,
        pageTitle: previewMeta.pageTitle,
      };
    } catch {
      // Try next language.
    }
  }

  return null;
}

async function fetchWikiMetadata(pageTitle, language, size) {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    prop: "pageimages|info",
    piprop: "thumbnail|original",
    pithumbsize: String(size),
    titles: pageTitle,
    inprop: "url",
    redirects: "1",
    format: "json",
    origin: "*",
  }).toString();

  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`wiki request failed (${response.status})`);
  }

  const payload = await response.json();
  const page = Object.values(payload.query?.pages || {})[0];
  if (!page || page.missing) {
    throw new Error("wiki page missing");
  }

  const thumbnailUrl = page.thumbnail?.source;
  const originalUrl = page.original?.source;
  if (!thumbnailUrl && !originalUrl) {
    throw new Error("wiki image missing");
  }

  return {
    pageTitle: page.title || pageTitle,
    pageUrl:
      page.fullurl ||
      `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pageTitle).replace(/%20/g, "_")}`,
    thumbnailUrl,
    originalUrl,
  };
}

function isArtworkPageMatch(pageTitle, artworkTitle) {
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf]+/g, "");

  const normalizedPage = normalize(pageTitle);
  const normalizedArtwork = normalize(artworkTitle);
  return Boolean(normalizedArtwork) && normalizedPage.includes(normalizedArtwork);
}

async function downloadImage(url, targetBasePath) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`image download failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  const ext = detectExtension(contentType, url);
  const filePath = `${targetBasePath}.${ext}`;
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return filePath;
}

function detectExtension(contentType, url) {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  if (contentType.includes("gif")) {
    return "gif";
  }

  const extFromUrl = path.extname(new URL(url).pathname).replace(".", "").toLowerCase();
  return extFromUrl || "jpg";
}

function toWebPath(filePath) {
  const relativePath = path.relative(ROOT, filePath).split(path.sep).join("/");
  return `./${relativePath}`;
}

async function runPool(items, concurrency, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) {
        return;
      }
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function logProgress(work, status) {
  console.log(`[${status}] ${work.painterName} / ${work.artworkTitle}`);
}
