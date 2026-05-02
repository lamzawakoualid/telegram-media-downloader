(() => {
if (globalThis.__telegramMediaDownloaderLoaded) return;
globalThis.__telegramMediaDownloaderLoaded = true;

const MEDIA_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "mp3",
  "m4a",
  "ogg",
  "wav",
  "flac",
  "pdf",
  "zip",
  "rar",
  "7z",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt"
]);

let activeJob = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING_TELEGRAM_DOWNLOADER") {
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "START_TELEGRAM_DOWNLOAD") {
    startDownload(message.options || {});
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "STOP_TELEGRAM_DOWNLOAD") {
    if (activeJob) activeJob.stopped = true;
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "GET_TELEGRAM_DOWNLOAD_STATUS") {
    sendResponse(getStatus());
    return true;
  }

  return false;
});

async function startDownload(options) {
  if (activeJob?.running) return;

  activeJob = {
    running: true,
    stopped: false,
    found: 0,
    queued: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    lastError: ""
  };

  try {
    const candidates = collectMedia(options);
    activeJob.found = candidates.length;

    for (const candidate of candidates) {
      if (activeJob.stopped) break;

      activeJob.queued += 1;
      const result = await downloadCandidate(candidate);

      if (result.ok) activeJob.downloaded += 1;
      else {
        activeJob.failed += 1;
        activeJob.lastError = result.error || "Download failed";
      }

      await sleep(Number(options.delayMs) || 450);
    }
  } finally {
    activeJob.running = false;
  }
}

function collectMedia(options) {
  const includeImages = options.images !== false;
  const includeVideos = options.videos !== false;
  const includeAudio = options.audio !== false;
  const includeDocuments = options.documents !== false;
  const seen = new Set();
  const items = [];

  const add = (url, type, nameHint) => {
    const absoluteUrl = normalizeUrl(url);
    if (!absoluteUrl || seen.has(absoluteUrl)) return;
    if (absoluteUrl.startsWith("chrome-extension:")) return;
    if (!typeAllowed(type, { includeImages, includeVideos, includeAudio, includeDocuments })) return;

    seen.add(absoluteUrl);
    items.push({
      url: absoluteUrl,
      type,
      filename: buildFilename(absoluteUrl, type, nameHint),
      extension: extensionFor(absoluteUrl, type)
    });
  };

  document.querySelectorAll("img[src]").forEach((node) => {
    if (!isUsableElement(node)) return;
    add(node.currentSrc || node.src, "image", node.alt);
  });

  document.querySelectorAll("video, video source").forEach((node) => {
    const url = node.currentSrc || node.src;
    if (!isUsableElement(node.closest("video") || node)) return;
    add(url, "video", node.title || node.getAttribute("aria-label"));
  });

  document.querySelectorAll("audio, audio source").forEach((node) => {
    const url = node.currentSrc || node.src;
    if (!isUsableElement(node.closest("audio") || node)) return;
    add(url, "audio", node.title || node.getAttribute("aria-label"));
  });

  document.querySelectorAll("a[href]").forEach((node) => {
    if (!isUsableElement(node)) return;
    const url = node.href;
    const extension = extensionFor(url, "document");
    if (MEDIA_EXTENSIONS.has(extension)) {
      add(url, mediaTypeFromExtension(extension), node.textContent);
    }
  });

  document.querySelectorAll("[style]").forEach((node) => {
    if (!isUsableElement(node)) return;
    const match = node.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
    if (match) add(match[1], "image", node.getAttribute("aria-label"));
  });

  return items.slice(0, Math.max(1, Number(options.maxFiles) || 300));
}

async function downloadCandidate(candidate) {
  if (candidate.url.startsWith("blob:") || candidate.url.startsWith("data:")) {
    return downloadInsidePage(candidate);
  }

  return chrome.runtime.sendMessage({
    type: "DOWNLOAD_URL",
    payload: candidate
  });
}

async function downloadInsidePage(candidate) {
  try {
    const link = document.createElement("a");
    link.href = candidate.url;
    link.download = candidate.filename.split("/").pop();
    link.style.display = "none";
    document.documentElement.append(link);
    link.click();
    link.remove();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function getStatus() {
  return activeJob || {
    running: false,
    stopped: false,
    found: 0,
    queued: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    lastError: ""
  };
}

function typeAllowed(type, options) {
  return (
    (type === "image" && options.includeImages) ||
    (type === "video" && options.includeVideos) ||
    (type === "audio" && options.includeAudio) ||
    (type === "document" && options.includeDocuments)
  );
}

function isUsableElement(node) {
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  const visible = rect.width > 12 && rect.height > 12;
  const notHidden = getComputedStyle(node).visibility !== "hidden";
  return visible && notHidden;
}

function buildFilename(url, type, nameHint) {
  const extension = extensionFor(url, type);
  const safeName = (nameHint || "telegram-media")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/gi, "")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `Telegram Media/${safeName || "telegram-media"}-${stamp}.${extension}`;
}

function extensionFor(url, type) {
  try {
    const pathname = new URL(url, location.href).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match) return match[1].toLowerCase();
  } catch {
    // Fall through to type defaults.
  }

  if (url.startsWith("data:")) {
    const mime = url.slice(5, url.indexOf(";"));
    const fromMime = extensionFromMime(mime);
    if (fromMime) return fromMime;
  }

  return {
    image: "jpg",
    video: "mp4",
    audio: "mp3",
    document: "bin"
  }[type] || "bin";
}

function extensionFromMime(mime) {
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "application/pdf": "pdf"
  };
  return map[mime] || "";
}

function mediaTypeFromExtension(extension) {
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extension)) return "image";
  if (["mp4", "webm", "mov", "mkv", "avi"].includes(extension)) return "video";
  if (["mp3", "m4a", "ogg", "wav", "flac"].includes(extension)) return "audio";
  return "document";
}

function normalizeUrl(url) {
  try {
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    return new URL(url, location.href).href;
  } catch {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
})();
