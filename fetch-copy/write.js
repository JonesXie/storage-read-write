(function writeFn(str) {
  // let storageObj = { sessionObj:{}, localObj:{} };

  if (!str) {
    return;
  }
  const { sessionObj = {}, localObj = {} } = str;
  if (sessionObj) {
    console.log("%c ------开始写入sessionStorage数据------", "color:orange");
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
});
