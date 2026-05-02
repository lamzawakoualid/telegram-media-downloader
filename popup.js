const els = {
  pageStatus: document.querySelector("#pageStatus"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  message: document.querySelector("#message"),
  found: document.querySelector("#found"),
  downloaded: document.querySelector("#downloaded"),
  failed: document.querySelector("#failed"),
  images: document.querySelector("#images"),
  videos: document.querySelector("#videos"),
  audio: document.querySelector("#audio"),
  documents: document.querySelector("#documents"),
  maxFiles: document.querySelector("#maxFiles"),
  delayMs: document.querySelector("#delayMs")
};

let activeTab;
let statusTimer;

init();

async function init() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.url?.startsWith("https://web.telegram.org/")) {
    els.pageStatus.textContent = "Go to web.telegram.org first.";
    els.startButton.disabled = true;
    return;
  }

  let isReady = await pingContentScript();
  if (!isReady) {
    await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ["content.js"]
    });
    isReady = await pingContentScript();
  }

  els.pageStatus.textContent = isReady ? "Ready in this Telegram tab." : "Refresh Telegram Web, then try again.";
  els.startButton.disabled = !isReady;

  await refreshStatus();
  statusTimer = setInterval(refreshStatus, 700);
}

els.startButton.addEventListener("click", async () => {
  els.message.textContent = "";
  await chrome.tabs.sendMessage(activeTab.id, {
    type: "START_TELEGRAM_DOWNLOAD",
    options: readOptions()
  });
  await refreshStatus();
});

els.stopButton.addEventListener("click", async () => {
  await chrome.tabs.sendMessage(activeTab.id, { type: "STOP_TELEGRAM_DOWNLOAD" });
  await refreshStatus();
});

window.addEventListener("unload", () => {
  if (statusTimer) clearInterval(statusTimer);
});

async function refreshStatus() {
  if (!activeTab?.id) return;

  try {
    const status = await chrome.tabs.sendMessage(activeTab.id, {
      type: "GET_TELEGRAM_DOWNLOAD_STATUS"
    });

    els.found.textContent = status.found || 0;
    els.downloaded.textContent = status.downloaded || 0;
    els.failed.textContent = status.failed || 0;
    els.startButton.disabled = Boolean(status.running);
    els.stopButton.disabled = !status.running;

    if (status.running) {
      els.message.textContent = "Downloading media from the current Telegram view...";
    } else if (status.lastError) {
      els.message.textContent = status.lastError;
    } else if (status.downloaded > 0) {
      els.message.textContent = "Finished. Files are in your Downloads folder.";
    }
  } catch (error) {
    els.message.textContent = error.message;
  }
}

async function pingContentScript() {
  try {
    const response = await chrome.tabs.sendMessage(activeTab.id, {
      type: "PING_TELEGRAM_DOWNLOADER"
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

function readOptions() {
  return {
    images: els.images.checked,
    videos: els.videos.checked,
    audio: els.audio.checked,
    documents: els.documents.checked,
    maxFiles: Number(els.maxFiles.value) || 300,
    delayMs: Number(els.delayMs.value) || 450
  };
}
