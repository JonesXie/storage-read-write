# storage-read-write

浏览器不同的标签页之前传递本地数据。有浏览器插件和本地 js

## 浏览器插件

在谷歌浏览器插件商店搜索 `Storage Read Write` 或者打开 👉 [商店地址](https://chromewebstore.google.com/detail/iibfhknjnehpbnmglhhkpklcpedjgdgh)

## 本地控制台

1. 本地打开需要复制 storage 的标签页的控制台，解决跨域的问题后（可通过插件解决）。复制以下的代码，在控制台中执行。

```js
fetch(
  `https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy/read.js`
)
  .then((res) => res.text())
  .then((js) => eval(js)());
```

执行后会自动在系统的剪贴板上复制一段代码

2. 在需要读取 storage 的页面中，粘贴复制的代码，执行即可。

如果不想解决跨域问题，可以将 `fetch-copy` 文件夹内的文件下载到本地，本地开启一个 web 服务。

1. 本地打开需要复制 storage 的标签页的控制台。修改以下的代码，在控制台中执行。

```js
const url = "your local server url";
fetch(`${url}/read.js`)
  .then((res) => res.text())
  .then((js) => {
    const readFn = eval(js);
    readFn(`${url}/write.js`);
  });

// 示例

const url = "http://localhost:8080";
fetch(`${url}/read.js`)
  .then((res) => res.text())
  .then((js) => {
    const readFn = eval(js);
    readFn(`${url}/write.js`);
  });
```
