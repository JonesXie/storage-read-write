# storage-read-write

浏览器不同的标签页之前传递本地数据。有浏览器插件和本地 js

## 浏览器插件

在谷歌浏览器插件商店搜索 `Storage Read Write` 或者打开 👉 [商店地址](https://chromewebstore.google.com/detail/iibfhknjnehpbnmglhhkpklcpedjgdgh)

插件会读取当前标签页及其 iframe 中可访问域名的 `localStorage` 和 `sessionStorage`。写入时不会区分数据来自顶层页面还是 iframe，会把复制到的所有可访问 storage 合并后写入目标标签页当前域名下。

## 本地控制台

控制台脚本会自动读取当前页面及同源 iframe 的 `localStorage` 和 `sessionStorage`，写入时会把复制到的所有可访问 storage 合并后写入当前执行上下文的域名下。跨域 iframe 受浏览器同源策略限制，无法从顶层页面控制台直接访问；如需读取跨域 iframe，请使用浏览器插件，或在 DevTools 中切换到对应 iframe 的执行上下文后运行读取脚本。

1. 本地打开需要复制 storage 的标签页的控制台，解决跨域的问题后（可通过插件解决）。复制以下的代码，在控制台中执行。

```js
fetch(`https://raw.githubusercontent.com/JonesXie/storage-read-write/main/fetch-copy/read.js`)
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
