// 常驻于所有的标签页
// 接收来自页面的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.subject == "getStorage") {
    sendResponse({
      data: {
        localObj: localStorage,
        sessionObj: sessionStorage,
      },
    });
  }
  if (request.subject == "setStorage") {
    let success = true;
    const { localObj = {}, sessionObj = {} } = request.data;
    try {
      if (sessionObj) {
        console.log(
          "%c ------开始写入sessionStorage数据------",
          "color:orange"
        );
        Object.keys(sessionObj).forEach((key) => {
          sessionStorage.setItem(key, sessionObj[key]);
        });
        console.log("%c ------写入sessionStorage成功------", "color:green");
      }
      if (localObj) {
        console.log("%c ------开始写入localStorage数据------", "color:blue");
        Object.keys(localObj).forEach((key) => {
          localStorage.setItem(key, localObj[key]);
        });
        console.log("%c ------写入localStorage成功------", "color:green");
      }
    } catch (error) {
      success = false;
    }

    sendResponse({
      success,
    });
  }
});
