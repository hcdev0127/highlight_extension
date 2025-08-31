
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const DB_NAME = "bebee-job-downloader";
const STORE_NAME = "handles";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);

  });

}

async function saveDirectoryHandle(handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    const store = transaction.objectStore(STORE_NAME);
    store.put(handle, "directory");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);

  });

}

async function refreshStatus() {
  const result = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  statusEl.textContent = result?.message || "Idle";

}

startBtn.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab?.url || !/^https:\/\/(www\.)?bebee\.com\/gb\/jobs/.test(tab.url)) {
      statusEl.textContent = "Open https://bebee.com/gb/jobs first.";
      return;
    }

    // IMPORTANT: 
    //// showDirectoryPicker() must be called directly 
    // from the user's click. 

    const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });

    // Store the actual FileSystemDirectoryHandle. 
    // Do NOT send it through chrome.runtime.sendMessage(). 

    await saveDirectoryHandle(dirHandle);

    // Send only normal serializable values. 

    const result = await chrome.runtime.sendMessage({ type: "START", tabId: tab.id });
    statusEl.textContent = result?.message || "Started.";

  } catch (err) {
    if (err?.name === "AbortError") {
      statusEl.textContent = "Folder selection cancelled.";
      return;

    } statusEl.textContent = `Error: ${err.message || err}`;

  }
});


stopBtn.addEventListener("click", async () => {
  const result = await chrome.runtime.sendMessage({ type: "STOP" });
  statusEl.textContent = result?.message || "Stopped.";

});

refreshStatus();
setInterval(refreshStatus, 1000);
