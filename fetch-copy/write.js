(function writeFn(str) {
  if (!str) {
    return;
  }

  const sourceData = typeof str === "string" ? JSON.parse(str) : str;

  const normalizeStorageObj = function (data) {
    if (Array.isArray(data?.frames) && data.frames.length) {
      return data;
    }

    const sessionObj = data?.sessionObj || {};
    const localObj = data?.localObj || {};

    return {
      sessionObj,
      localObj,
      frames: [
        {
          isTopFrame: true,
          storageObj: {
            sessionObj,
            localObj,
          },
        },
      ],
    };
  };

  const writeStorage = function (storage, data = {}) {
    Object.keys(data).forEach((key) => {
      const value = data[key];

      if (value !== undefined && value !== null) {
        storage.setItem(key, value);
      }
    });
  };

  const mergeStorageObj = function (payload) {
    const availableFrames = payload.frames.filter(function (frame) {
      return frame && !frame.inaccessible && frame.storageObj;
    });
    const mergedStorageObj = {
      sessionObj: {},
      localObj: {},
    };

    availableFrames.forEach(function (frame) {
      Object.assign(mergedStorageObj.sessionObj, frame.storageObj.sessionObj || {});
      Object.assign(mergedStorageObj.localObj, frame.storageObj.localObj || {});
    });

    return {
      frameCount: availableFrames.length,
      storageObj: mergedStorageObj,
    };
  };

  const payload = normalizeStorageObj(sourceData);
  const mergedResult = mergeStorageObj(payload);

  try {
    console.log("%c ------开始写入sessionStorage数据------", "color:orange");
    writeStorage(sessionStorage, mergedResult.storageObj.sessionObj);
    console.log("%c ------写入sessionStorage成功------", "color:green");

    console.log("%c ------开始写入localStorage数据------", "color:blue");
    writeStorage(localStorage, mergedResult.storageObj.localObj);
    console.log("%c ------写入localStorage成功------", "color:green");
  } catch (error) {
    console.warn("%c ------写入当前域名失败------", "color:red", error);
    return;
  }

  console.log(`%c ------写入完成，共合并${mergedResult.frameCount}个frame到当前域名------`, "color:green");
});
