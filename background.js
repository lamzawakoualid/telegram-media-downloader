const state = {
  downloaded: 0,
  failed: 0
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "DOWNLOAD_URL") {
    downloadUrl(message.payload)
      .then((downloadId) => sendResponse({ ok: true, downloadId }))
      .catch((error) => {
        state.failed += 1;
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (message?.type === "GET_BACKGROUND_STATS") {
    sendResponse({ ...state });
  }

  return false;
});

async function downloadUrl(payload) {
  const filename = cleanPath(payload.filename || buildFilename(payload));

  const downloadId = await chrome.downloads.download({
    url: payload.url,
    filename,
    conflictAction: "uniquify",
    saveAs: false
  });

  state.downloaded += 1;
  return downloadId;
}

function buildFilename(payload) {
  const folder = "Telegram Media";
  const extension = payload.extension || extensionFromUrl(payload.url) || "bin";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${folder}/telegram-${stamp}.${extension}`;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match?.[1]?.toLowerCase();
  } catch {
    return "";
  }
}

function cleanPath(path) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[<>:"|?*\u0000-\u001f]/g, "_").trim() || "file")
    .join("/")
    .replace(/^\/+/, "");
}
