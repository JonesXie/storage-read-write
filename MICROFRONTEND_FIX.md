# 微前端场景下 Storage 复制功能修复说明

## 问题描述

在 React + qiankun 微前端嵌入 Vue 应用，Vue 中使用 wujie 微前端嵌入多页面应用的复杂嵌套场景下，点击复制按钮无法获取数据。

## 根本原因

1. **跨域 iframe 访问限制**：微前端子应用通常运行在不同域名，Chrome 安全策略限制了对跨域 iframe 的 localStorage/sessionStorage 访问
2. **executeScript 的局限性**：即使使用 `allFrames: true`，跨域 iframe 可能无法注入脚本
3. **错误处理不完善**：原代码在读取失败时只是过滤掉，没有明确的错误提示
4. **Wujie 沙箱机制**：wujie 使用特殊的 Web Components + iframe 实现，可能对 storage 做了代理

## 解决方案

### 1. 添加 Content Script（核心改进）

**文件**: `scripts/content.js`

- 在所有页面和 frame 中注入 content script
- 使用 `run_at: "document_start"` 确保尽早加载
- 使用 `all_frames: true` 覆盖所有 iframe
- 使用 `match_about_blank: true` 支持 about:blank iframe
- 通过消息传递（message passing）实现跨域通信

**优势**:
- Content script 可以访问页面的 localStorage/sessionStorage，即使在跨域 iframe 中
- 比 executeScript 有更好的兼容性和权限

### 2. 混合读取策略

**文件**: `scripts/index.js` - `readFn` 函数

实现了双重策略：

**策略1（优先）**: 使用 content script 的消息通信
- 通过 `chrome.webNavigation.getAllFrames()` 获取所有 frame
- 使用 `chrome.tabs.sendMessage()` 与每个 frame 的 content script 通信
- 更好的跨域支持

**策略2（回退）**: 使用 executeScript
- 当策略1失败时自动回退
- 保持向后兼容性

### 3. 增强错误处理和日志

- 捕获每个 frame 的读取结果（成功/失败/原因）
- 详细的控制台日志输出
- 统计可访问和不可访问的 frame 数量
- 在界面上显示跨域 frame 的数量

### 4. 改进的数据结构

为每个 frame 添加了更多元数据：
```javascript
{
  frameId: number,
  url: string,
  origin: string,
  title: string,
  isTopFrame: boolean,
  success: boolean,        // 新增：是否读取成功
  inaccessible: boolean,   // 新增：是否因跨域而不可访问
  error: string,           // 新增：错误信息
  storageObj: {...}
}
```

## 修改文件清单

1. **manifest.json**
   - 版本更新至 2.1.0
   - 添加 `webNavigation` 权限
   - 添加 `content_scripts` 配置

2. **scripts/content.js** (新文件)
   - 注入到所有页面和 frame 的 content script
   - 处理 storage 读取和写入请求

3. **scripts/index.js**
   - 改进 `readFrameStorage()` - 添加错误捕获
   - 重写 `readFn()` - 实现混合读取策略
   - 改进 `getFrameSummary()` - 显示跨域 frame 数量

## 安装和测试步骤

### 1. 重新加载扩展

```bash
# 在 Chrome 中访问
chrome://extensions/

# 找到 "Storage Read Write" 扩展
# 点击"重新加载"按钮
```

### 2. 测试页面

访问测试 URL:
```
https://deepzero16-int.ipinyou.com/ma-app/userTouch/contentManagement/sms_pg?isTouchpoint=true&currentAccount=1&application_id=MA&current_product=CDP
```

### 3. 打开调试工具

1. 点击扩展图标打开弹窗
2. 在弹窗上右键 -> "检查"
3. 在目标页面按 F12 打开开发者工具
4. 切换到 Console 标签

### 4. 执行复制操作

1. 点击扩展弹窗中的"存储"按钮
2. 查看控制台输出

**期望看到的日志**:
```
------开始执行复制------
策略1: 尝试通过 content script 读取...
找到 X 个 frames
策略1 成功: Y 个 frame 通过 content script 读取
------读取完成: Y个成功, Z个失败------
------复制成功，共读取Y个frame（跳过Z个跨域frame）------
```

### 5. 查看详细信息

如果有跨域 frame，你会看到：
```
以下frame无法访问（可能是跨域限制）:
  - Frame 1: https://example.com - DOMException: ...
  - Frame 2: https://another.com - content script 未响应
```

在历史记录中会显示：
```
页面标题
https://... · 含3个frame（2个跨域）
```

## 预期效果

### 成功场景
- ✅ 至少能读取到主 frame 的 storage
- ✅ 能读取到同域 iframe 的 storage
- ✅ 通过 content script 能读取部分跨域 iframe 的 storage（如果有权限）
- ✅ 详细的日志显示每个 frame 的读取状态
- ✅ 界面上显示成功和失败的 frame 数量

### 预期限制
- ⚠️ 某些严格跨域的 iframe 可能仍然无法访问（这是浏览器安全限制）
- ⚠️ 如果所有 frame 都是跨域且无法访问，会显示明确的错误信息

## 调试技巧

### 查看 Content Script 是否加载

在目标页面的控制台中查找：
```
[Storage R/W] Content script 已加载: https://...
```

如果看到多条，说明 content script 已注入到多个 frame。

### 手动测试 Content Script

在页面控制台执行：
```javascript
chrome.runtime.sendMessage({action: 'readStorage'}, (response) => {
  console.log('Storage 读取结果:', response);
});
```

### 查看所有 Frames

```javascript
chrome.webNavigation.getAllFrames({tabId: <tab_id>}, (frames) => {
  console.log('所有 frames:', frames);
});
```

## 进一步优化建议

如果仍然遇到问题，可以考虑：

1. **在目标应用中配置**：在 wujie 配置中允许父页面访问 iframe
2. **使用 postMessage**：在目标应用中添加 postMessage 监听器
3. **服务端中转**：如果跨域限制无法突破，考虑通过服务端 API 同步 storage
4. **Proxy Storage**：在微前端框架层面代理 storage 操作

## 技术细节

### Content Script 的优势

1. **更早注入**：`document_start` 确保在页面脚本之前运行
2. **持久存在**：不像 executeScript 是一次性的
3. **消息通信**：通过 chrome.runtime.onMessage 可靠通信
4. **跨域支持**：在 iframe 中独立运行，有自己的执行上下文

### 为什么需要双重策略

- Content script 需要页面完全加载后才能响应
- executeScript 可以立即执行
- 某些场景下一种方式可能失败，另一种可以成功
- 提供最大的兼容性和成功率

## 联系和反馈

如果修复后仍有问题，请提供：
1. 浏览器控制台的完整日志
2. chrome://extensions 中扩展的错误信息
3. 目标页面的 iframe 结构（在控制台执行 `window.frames.length`）
