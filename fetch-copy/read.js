(function readFn(url) {
  console.log("%c ------开始执行复制------", "color:red");
  const writeUrl = url || "https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy/write.js";

  const readStorage = function (storage) {
    const data = {};

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key !== null) {
        data[key] = storage.getItem(key);
      }
    }

    return data;
  };

  const getOrigin = function (frameUrl) {
    try {
      return frameUrl ? new URL(frameUrl, location.href).origin : "";
    } catch (error) {
      return "";
    }
  };

  const isTopFrame = function (targetWindow) {
    try {
      return targetWindow === targetWindow.top;
    } catch (error) {
      return targetWindow === window;
    }
  };

  const readWindowStorage = function (targetWindow, framePath) {
    return {
      framePath,
      url: targetWindow.location.href,
      origin: targetWindow.location.origin,
      title: targetWindow.document.title,
      isTopFrame: isTopFrame(targetWindow),
      storageObj: {
        sessionObj: readStorage(targetWindow.sessionStorage),
        localObj: readStorage(targetWindow.localStorage),
      },
    };
  };

  const collectFrames = function (targetWindow, framePath, frames) {
    frames.push(readWindowStorage(targetWindow, framePath));

    const frameElements = Array.from(targetWindow.document.querySelectorAll("iframe, frame"));

    for (let index = 0; index < targetWindow.frames.length; index += 1) {
      const childWindow = targetWindow.frames[index];
      const childPath = framePath.concat(index);
      const frameElement = frameElements[index];

      try {
        childWindow.location.href;
        collectFrames(childWindow, childPath, frames);
      } catch (error) {
        const frameUrl = frameElement?.src || "";

        frames.push({
          framePath: childPath,
          url: frameUrl,
          origin: getOrigin(frameUrl),
          title: frameElement?.title || "",
          isTopFrame: false,
          inaccessible: true,
          reason: "cross-origin",
        });
      }
    }

    return frames;
  };

  const frames = collectFrames(window, [], []);
  const availableFrames = frames.filter(function (frame) {
    return !frame.inaccessible;
  });
  const topFrame =
    availableFrames.find(function (frame) {
      return frame.isTopFrame;
    }) || availableFrames[0];
  const storageObj = {
    sessionObj: topFrame?.storageObj?.sessionObj || {},
    localObj: topFrame?.storageObj?.localObj || {},
    frames,
  };
  const inaccessibleCount = frames.length - availableFrames.length;

  const copyText = function (button, content, success) {
    if (!button) {
      return;
    }

    if (typeof content == "function") {
      success = content;
      content = null;
    }

    success = success || function () {};

    // 是否降级使用
    var isFallback = !navigator.clipboard;

    if (typeof button == "string" && !content) {
      if (content === false) {
        isFallback = true;
      }
      content = button;
      button = null;
    }

    var eleTextarea = document.querySelector("#tempTextarea");
    if (!eleTextarea && isFallback) {
      eleTextarea = document.createElement("textarea");
      eleTextarea.style.width = 0;
      eleTextarea.style.position = "fixed";
      eleTextarea.style.left = "-999px";
      eleTextarea.style.top = "10px";
      eleTextarea.setAttribute("readonly", "readonly");
      document.body.appendChild(eleTextarea);
    }

    var funCopy = function (text, callback) {
      callback = callback || function () {};

      if (!isFallback) {
        navigator.clipboard.writeText(text).then(
          function () {
            callback();
            // 成功回调
            success(text);
          },
          function () {
            // 禁止写入剪切板后使用兜底方法
            copyText(text, false);
            callback();
            // 成功回调
            success(text);
          },
        );

        return;
      }

      eleTextarea.value = text;
      eleTextarea.select();
      document.execCommand("copy", true);

      callback();
      // 成功回调
      success(text);
    };

    // 提示复制成功的方法
    // 对外可访问
    copyText.tips = function (event) {
      if (!event) {
        return;
      }
      // 复制成功提示
      var eleTips = document.createElement("span");
      eleTips.className = "text-popup";
      eleTips.innerHTML = "复制成功";
      document.body.appendChild(eleTips);
      // 事件
      eleTips.addEventListener("animationend", function () {
        eleTips.parentNode.removeChild(eleTips);
      });
      // For IE9
      if (!history.pushState) {
        setTimeout(function () {
          eleTips.parentNode.removeChild(eleTips);
        }, 1000);
      }

      eleTips.style.left = event.pageX - eleTips.clientWidth / 2 + "px";
      eleTips.style.top = event.pageY - eleTips.clientHeight + "px";
    };

    var strStyle =
      ".text-popup { animation: textPopup 1s both; -ms-transform: translateY(-20px); color: #01cf97; user-select: none; white-space: nowrap; position: absolute; z-index: 99; }@keyframes textPopup {0%, 100% { opacity: 0; } 5% { opacity: 1; } 100% { transform: translateY(-50px); }}";

    var eleStyle = document.querySelector("#popupStyle");
    if (!eleStyle) {
      eleStyle = document.createElement("style");
      eleStyle.id = "popupStyle";
      eleStyle.innerHTML = strStyle;
      document.head.appendChild(eleStyle);
    }

    if (!button) {
      funCopy(content);
      return;
    }

    // 事件绑定
    button.addEventListener("click", function (event) {
      var strCopy = content;
      if (content && content.tagName) {
        strCopy = content.textContent || content.value;
      }
      // 复制的文字内容
      if (!strCopy) {
        return;
      }

      funCopy(strCopy, function () {
        copyText.tips(event);
      });
    });
  };

  if (inaccessibleCount) {
    console.warn(
      `%c ------发现${inaccessibleCount}个跨域iframe，控制台脚本无法自动读取，请使用Chrome插件或切换到对应iframe上下文执行------`,
      "color:orange",
    );
  }

  const copyContent = JSON.stringify(storageObj);

  const copyJSStr = `fetch(${JSON.stringify(writeUrl)}).then((res)=>res.text()).then((js)=>{const writeFn=eval(js);writeFn(${copyContent});})`;
  // const copyJSStr = `fetch("https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy/write.js").then((res) => res.text()).then((js) => {const writeFn = eval(js);writeFn(${copyContent});})`;

  copyText(copyJSStr, function () {
    console.log(`%c ------复制成功，共读取${availableFrames.length}个frame------`, "color:green");
  });

  // const url='https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy';fetch(`${url}/read.js`).then((res)=>res.text()).then((js)=>{const readFn=eval(js);readFn(`${url}/write.js`);})

  // fetch(`https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy/read.js`).then((res)=>res.text()).then((js)=>eval(js)())
});
