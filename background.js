const DB_NAME = "bebee-job-downloader";
const STORE_NAME = "handles";
let state = { running: false, tabId: null, count: 0, message: "Idle", filename: null };


function todayFilename() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}.txt`;
}

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

async function getDirectoryHandle() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("directory");
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function verifyDirectoryPermission(dir) {
  if (!dir) {
    throw new Error("No output directory selected.");
  } // Now dir is the real FileSystemDirectoryHandle, // because we retrieved it from IndexedDB. 
  const permission = await dir.queryPermission({ mode: "readwrite" });
  if (permission === "granted") {
    return true;
  } const requested = await dir.requestPermission({ mode: "readwrite" });
  if (requested !== "granted") {
    throw new Error("Write permission to the selected folder was denied.");
  } return true;
}

async function getWritableFile() {
  const dir = await getDirectoryHandle();
  await verifyDirectoryPermission(dir);
  const fileHandle = await dir.getFileHandle(state.filename, { create: true });
  return fileHandle;
}

async function clearOutputFile() {
  const fileHandle = await getWritableFile();
  const writable = await fileHandle.createWritable();
  await writable.write("");
  await writable.close();
}

async function appendText(text) {
  const fileHandle = await getWritableFile();
  const file = await fileHandle.getFile();
  const oldText = await file.text();
  const writable = await fileHandle.createWritable();
  await writable.write(oldText + text);
  await writable.close();
}

async function sendToTab(message) {
  if (state.tabId == null) {
    throw new Error("No active BeBee tab.");
  } return chrome.tabs.sendMessage(state.tabId, message);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    console.log(msg);
    // ========================================= // START // ========================================= 
    if (msg.type === "START") {
      const dir = await getDirectoryHandle();
      if (!dir) {
        throw new Error("No output folder selected.");
      } 
      
      state.running = true;
      state.tabId = msg.tabId;
      state.count = 0;
      state.filename = todayFilename();
      state.message = "Preparing output file...";
      // Verify that IndexedDB returned the // actual FileSystemDirectoryHandle. await verifyDirectoryPermission(dir);
      // Create/reset today's file. await clearOutputFile();
      state.message = `Collecting jobs → ${state.filename}`;
      await sendToTab({ type: "COLLECT_CURRENT" });
      sendResponse({ ok: true, message: `Started. Writing to ${state.filename}` });
      return;
    }

    // ========================================= // JOB // ========================================= 

    if (msg.type === "JOB") {
      if (!state.running) {
        sendResponse({ ok: false, message: "Stopped." });
        return;
      } const job = msg.job;
      const line = `${job.role} | ${job.company} | ${job.salary}\n`;
      await appendText(line);
      state.count++;
      state.message = `Saved ${state.count}: ` + `${job.role} — ${job.company}`;
      sendResponse({ ok: true });
      // Wait briefly before clicking Next. 
      setTimeout(async () => {
        if (!state.running) {
          return;
        } try {
          await sendToTab({ type: "CLICK_NEXT" });
        } catch (err) {
          state.message = `Error: ${err.message || err}`;
          state.running = false;
        }
      }, 500);
      return;
    }

    // ========================================= // PAGE DONE // ========================================= 

    if (msg.type === "PAGE_DONE") {
      state.message = msg.message || "Page processed.";
      sendResponse({ ok: true });
      return;
    }

    // ========================================= // STOP // ========================================= 
    if (msg.type === "STOP") {
      state.running = false;
      state.message = `Stopped. ${state.count} job(s) saved.`;
      sendResponse({ ok: true, message: state.message });
      return;
    }
    // ========================================= // STATUS // ========================================= 
    if (msg.type === "GET_STATUS") {
      sendResponse({ running: state.running, count: state.count, filename: state.filename, message: state.message });
      return;
    } sendResponse({ ok: false, message: "Unknown message." });
  })().catch(err => {
    console.error("BeBee Downloader:", err);
    state.message = `Error: ${err.message || err}`;
    state.running = false;
    sendResponse({ ok: false, message: state.message });
  });
  return true;
});
