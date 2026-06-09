// Content script - 注入到所有页面和frame中
// 用于更好地处理跨域iframe的storage读取

(function () {
  'use strict';

  // 避免重复注入
  if (window.__STORAGE_RW_CONTENT_INJECTED__) {
    return;
  }
  window.__STORAGE_RW_CONTENT_INJECTED__ = true;

  console.log('[Storage R/W] Content script 已加载:', location.href);

  // 读取当前frame的storage
  function readCurrentFrameStorage() {
    const readStorage = (storage) => {
      const data = {};
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key !== null) {
            data[key] = storage.getItem(key);
          }
        }
      } catch (error) {
        console.warn('[Storage R/W] 读取storage失败:', error);
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
        timestamp: Date.now(),
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
        timestamp: Date.now(),
      };
    }
  }

  // 监听来自扩展的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'readStorage') {
      console.log('[Storage R/W] 收到读取请求');
      const result = readCurrentFrameStorage();
      console.log('[Storage R/W] 读取结果:', result);
      sendResponse(result);
      return true; // 保持消息通道开启
    }

    if (request.action === 'writeStorage') {
      console.log('[Storage R/W] 收到写入请求');
      try {
        const { localObj = {}, sessionObj = {} } = request.data || {};

        // 写入 sessionStorage
        if (sessionObj && Object.keys(sessionObj).length > 0) {
          Object.entries(sessionObj).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              sessionStorage.setItem(key, value);
            }
          });
        }

        // 写入 localStorage
        if (localObj && Object.keys(localObj).length > 0) {
          Object.entries(localObj).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              localStorage.setItem(key, value);
            }
          });
        }

        console.log('[Storage R/W] 写入成功');
        sendResponse({ success: true });
      } catch (error) {
        console.warn('[Storage R/W] 写入失败:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  });

  // 向父窗口报告自己的存在（用于跨域iframe检测）
  if (window !== window.top) {
    try {
      window.parent.postMessage(
        {
          type: '__STORAGE_RW_FRAME_READY__',
          origin: location.origin,
          url: location.href,
        },
        '*'
      );
    } catch (error) {
      console.warn('[Storage R/W] 无法向父窗口发送消息:', error);
    }
  }
})();
