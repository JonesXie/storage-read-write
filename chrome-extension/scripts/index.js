const STATUS_DURATION = 900;

const currentWrap = document.getElementById("currentW");
const historyList = document.getElementById("historyList");
const clearAllButton = document.getElementById("clearAll");
const statusTimers = new WeakMap();

function readFrameStorage() {
  const readStorage = (storage) => {
    const data = {};

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (key !== null) {
          data[key] = storage.getItem(key);
        }
      }
    } catch (error) {
      console.warn('读取storage失败:', error);
    }

    return data;
  };

  try {
    return {
      url: location.href,
      origin: location.origin,
      title: document.title,
      isTopFrame: window === window.top,
      storageObj: {
        localObj: readStorage(localStorage),
        sessionObj: readStorage(sessionStorage),
      },
      success: true,
    };
  } catch (error) {
    return {
      url: location.href,
      origin: location.origin,
      title: document.title || '无法访问',
      isTopFrame: false,
      inaccessible: true,
      error: error.message,
      success: false,
    };
  }
}

function writeMergedStorage(storageObj) {
  const normalizeStorageObj = (data) => {
    if (Array.isArray(data?.frames) && data.frames.length) {
      return data;
    }

    const localObj = data?.localObj || {};
    const sessionObj = data?.sessionObj || {};

    return {
      localObj,
      sessionObj,
      frames: [
        {
          isTopFrame: true,
          storageObj: {
            localObj,
            sessionObj,
          },
        },
      ],
    };
  };
  const mergeStorageObj = (data) => {
    const payload = normalizeStorageObj(data);
    const availableFrames = payload.frames.filter((frame) => frame && !frame.inaccessible && frame.storageObj);
    const mergedStorageObj = {
      localObj: {},
      sessionObj: {},
    };

    availableFrames.forEach((frame) => {
      Object.assign(mergedStorageObj.localObj, frame.storageObj.localObj || {});
      Object.assign(mergedStorageObj.sessionObj, frame.storageObj.sessionObj || {});
    });

    return {
      frameCount: availableFrames.length,
      storageObj: mergedStorageObj,
    };
  };
  const writeStorage = (storage, data = {}) => {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        storage.setItem(key, value);
      }
    });
  };
  const { frameCount, storageObj: mergedStorageObj } = mergeStorageObj(storageObj);

  try {
    writeStorage(sessionStorage, mergedStorageObj.sessionObj);
    writeStorage(localStorage, mergedStorageObj.localObj);

    return {
      success: true,
      frameCount,
      url: location.href,
      origin: location.origin,
    };
  } catch (error) {
    return {
      success: false,
      frameCount,
      url: location.href,
      origin: location.origin,
    };
  }
}

async function executeInFrames(tabId, func, args = []) {
  return chrome.scripting.executeScript({
    target: { tabId: Number(tabId), allFrames: true },
    func,
    args,
  });
}

async function executeInTopFrame(tabId, func, args = []) {
  const [executionResult] = await chrome.scripting.executeScript({
    target: { tabId: Number(tabId) },
    func,
    args,
  });

  return executionResult?.result;
}

function normalizeStorageObj(storageObj) {
  if (Array.isArray(storageObj?.frames) && storageObj.frames.length) {
    return storageObj;
  }

  const localObj = storageObj?.localObj || {};
  const sessionObj = storageObj?.sessionObj || {};

  return {
    localObj,
    sessionObj,
    frames: [
      {
        frameId: 0,
        url: "",
        origin: "",
        title: "",
        isTopFrame: true,
        storageObj: {
          localObj,
          sessionObj,
        },
      },
    ],
  };
}

function getFrameSummary(storageObj) {
  const frames = normalizeStorageObj(storageObj).frames.filter((frame) => !frame.inaccessible);
  const allFrames = normalizeStorageObj(storageObj).frames;
  const inaccessibleCount = allFrames.length - frames.length;

  if (allFrames.length <= 1) {
    return "";
  }

  if (inaccessibleCount > 0) {
    return ` · 含${frames.length}个frame（${inaccessibleCount}个跨域）`;
  }

  return ` · 含${frames.length}个frame`;
}

function showStatus(target, type, onDone) {
  if (!target) {
    if (onDone) {
      onDone();
    }
    return;
  }

  const prevTimer = statusTimers.get(target);

  if (prevTimer) {
    clearTimeout(prevTimer);
  }

  target.classList.remove("success", "failed");

  requestAnimationFrame(() => {
    target.classList.add(type);
  });

  const timer = setTimeout(() => {
    target.classList.remove(type);
    statusTimers.delete(target);

    if (onDone) {
      onDone();
    }
  }, STATUS_DURATION);

  statusTimers.set(target, timer);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function createTextLine(text) {
  const line = document.createElement("div");
  const value = text || "";

  line.className = "cwcContent ell";
  line.textContent = value;
  line.title = value;

  return line;
}

function createActionButton(action, id, icon, label) {
  const button = document.createElement("button");
  const image = document.createElement("img");

  button.type = "button";
  button.className = "cwoItem";
  button.dataset.action = action;
  button.dataset.id = String(id);
  button.title = label;
  button.setAttribute("aria-label", label);

  image.src = icon;
  image.alt = label;

  button.appendChild(image);
  return button;
}

function createStorageRow({ id, title, url }, rowType) {
  const row = document.createElement("div");
  const content = document.createElement("div");
  const options = document.createElement("div");

  row.className = `currentWindow${rowType === "c" ? " currentRow" : ""}`;
  row.id = `${rowType}-${id}`;

  content.className = `cwContainer${rowType === "c" ? " current" : ""}`;
  content.appendChild(createTextLine(title));
  content.appendChild(createTextLine(url));

  options.className = "cwOptions";

  if (rowType === "c") {
    options.appendChild(createActionButton("copy", id, "images/copy.png", "存储"));
  } else {
    options.appendChild(createActionButton("save", id, "images/download.png", "保存到当前标签"));
    options.appendChild(createActionButton("remove", id, "images/delete.png", "从Storage删除"));
  }

  row.appendChild(content);
  row.appendChild(options);

  return row;
}

function createEmptyState() {
  const emptyWrap = document.createElement("div");
  const image = document.createElement("img");
  const text = document.createElement("div");

  emptyWrap.className = "emptyWrap";
  image.className = "empty";
  image.src = "images/page-empty.png";
  image.alt = "";
  text.textContent = "暂无数据";

  emptyWrap.appendChild(image);
  emptyWrap.appendChild(text);

  return emptyWrap;
}

function renderSingleRow(container, row) {
  container.replaceChildren(row || createEmptyState());
}

function renderHistoryRows(rows) {
  if (!rows.length) {
    renderSingleRow(historyList, null);
    return;
  }

  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    fragment.appendChild(row);
  });

  historyList.replaceChildren(fragment);
}

async function readFn(tab, statusTarget) {
  console.log("%c ------开始执行复制------", "color:red");

  try {
    if (!tab?.id) {
      throw new Error("缺少当前标签页");
    }

    // 策略1: 尝试通过 content script 的消息通信读取（更好的跨域支持）
    console.log("%c 策略1: 尝试通过 content script 读取...", "color:blue");
    let frames = [];
    let useContentScript = false;

    try {
      // 获取所有 frames
      const allFrames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      console.log(`找到 ${allFrames?.length || 0} 个 frames`);

      if (allFrames && allFrames.length > 0) {
        const framePromises = allFrames.map(async (frame) => {
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'readStorage' }, { frameId: frame.frameId });
            if (result && result.success) {
              return {
                frameId: frame.frameId,
                ...result,
              };
            }
            return {
              frameId: frame.frameId,
              inaccessible: true,
              error: 'content script 未响应',
              success: false,
            };
          } catch (error) {
            console.warn(`Frame ${frame.frameId} content script 读取失败:`, error.message);
            return {
              frameId: frame.frameId,
              inaccessible: true,
              error: error.message,
              success: false,
            };
          }
        });

        const frameResults = await Promise.all(framePromises);
        const successCount = frameResults.filter((f) => f.success).length;

        if (successCount > 0) {
          frames = frameResults;
          useContentScript = true;
          console.log(`%c 策略1 成功: ${successCount} 个 frame 通过 content script 读取`, "color:green");
        }
      }
    } catch (error) {
      console.warn("策略1 失败:", error.message);
    }

    // 策略2: 回退到 executeScript（兼容性方案）
    if (!useContentScript || frames.length === 0) {
      console.log("%c 策略2: 回退到 executeScript...", "color:blue");
      const frameResults = await executeInFrames(tab.id, readFrameStorage);
      console.log(`%c ------尝试读取${frameResults.length}个frame------`, "color:blue");

      frames = frameResults
        .map(({ frameId, result, error }) => {
          if (!result) {
            console.warn(`Frame ${frameId} 执行失败:`, error);
            return {
              frameId,
              inaccessible: true,
              error: error?.message || '执行脚本失败',
              success: false,
            };
          }

          if (result.inaccessible) {
            console.warn(`Frame ${frameId} (${result.origin}) 无法访问:`, result.error);
            return {
              frameId,
              ...result,
            };
          }

          console.log(`%c Frame ${frameId} (${result.origin}) 读取成功`, "color:green", result);
          return {
            frameId,
            ...result,
          };
        })
        .filter(Boolean);
    }

    // 统计读取结果
    const accessibleFrames = frames.filter((frame) => frame.success && !frame.inaccessible);
    const inaccessibleFrames = frames.filter((frame) => frame.inaccessible || !frame.success);

    console.log(
      `%c ------读取完成: ${accessibleFrames.length}个成功, ${inaccessibleFrames.length}个失败------`,
      "color:orange"
    );

    if (inaccessibleFrames.length > 0) {
      console.warn("以下frame无法访问（可能是跨域限制）:");
      inaccessibleFrames.forEach((frame) => {
        console.warn(`  - Frame ${frame.frameId}: ${frame.origin || frame.url || '未知'} - ${frame.error || '未知错误'}`);
      });
    }

    const topFrame = accessibleFrames.find((frame) => frame.isTopFrame || frame.frameId === 0) || accessibleFrames[0];

    if (!topFrame?.storageObj) {
      throw new Error(`未读取到Storage数据。共尝试${frames.length}个frame，${accessibleFrames.length}个可访问。可能所有frame都被跨域限制阻止。`);
    }

    const storageObj = {
      localObj: topFrame.storageObj.localObj,
      sessionObj: topFrame.storageObj.sessionObj,
      frames,
    };

    await chrome.storage.local.set({
      [tab.id]: {
        id: String(tab.id),
        url: tab.url || "",
        title: tab.title || "",
        storageObj,
      },
    });

    console.log(`%c ------复制成功，共读取${accessibleFrames.length}个frame（跳过${inaccessibleFrames.length}个跨域frame）------`, "color:green");
    showStatus(statusTarget, "success", getHistory);
  } catch (error) {
    console.warn("Storage复制失败", error);
    showStatus(statusTarget, "failed", getHistory);
  }
}

async function writeFn(storageId, statusTarget) {
  try {
    const tab = await getActiveTab();
    const data = await chrome.storage.local.get(storageId);
    const storageItem = data[storageId];

    if (!tab?.id || !storageItem?.storageObj) {
      throw new Error("缺少可写入的Storage数据");
    }

    const result = await executeInTopFrame(tab.id, writeMergedStorage, [normalizeStorageObj(storageItem.storageObj)]);

    if (!result?.success) {
      throw new Error("写入当前域名失败");
    }

    console.log(`%c ------写入完成，共合并${result.frameCount}个frame到当前域名------`, "color:green");

    showStatus(statusTarget, "success");
  } catch (error) {
    console.warn("Storage写入失败", error);
    showStatus(statusTarget, "failed", getHistory);
  }
}

async function removeFn(storageId, statusTarget) {
  try {
    await chrome.storage.local.remove(storageId);
    showStatus(statusTarget, "success", getHistory);
  } catch (error) {
    console.warn("Storage删除失败", error);
    showStatus(statusTarget, "failed", getHistory);
  }
}

async function clearAll() {
  try {
    await chrome.storage.local.clear();
    getHistory();
  } catch (error) {
    console.warn("Storage清空失败", error);
  }
}

async function getCurrentInfo() {
  const tab = await getActiveTab();

  if (!tab?.id) {
    renderSingleRow(currentWrap, null);
    return;
  }

  renderSingleRow(
    currentWrap,
    createStorageRow(
      {
        id: tab.id,
        title: tab.title || "未命名标签",
        url: tab.url || "",
      },
      "c",
    ),
  );
}

async function getHistory() {
  const historyObj = await chrome.storage.local.get();
  const rows = Object.values(historyObj).map((value) =>
    createStorageRow(
      {
        id: value.id,
        title: value.title || "未命名标签",
        url: `${value.url || ""}${getFrameSummary(value.storageObj)}`,
      },
      "h",
    ),
  );

  renderHistoryRows(rows);
}

currentWrap.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="copy"]');

  if (!button || !currentWrap.contains(button)) {
    return;
  }

  const tab = await getActiveTab();
  readFn(tab, button.closest(".currentWindow"));
});

historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button || !historyList.contains(button)) {
    return;
  }

  const { action, id } = button.dataset;
  const statusTarget = button.closest(".currentWindow");

  if (action === "save") {
    writeFn(id, statusTarget);
  } else if (action === "remove") {
    removeFn(id, statusTarget);
  }
});

clearAllButton.addEventListener("click", clearAll);

getCurrentInfo();
getHistory();
