let activeDom;

const readFn = async (id, title, url) => {
  console.log("%c ------开始执行复制------", "color:red");

  chrome.tabs.sendMessage(
    Number(id),
    { from: "popup", subject: "getStorage" },
    (response) => {
      const storageObj = response?.data;
      if (!storageObj) {
        activeDom.classList.add("failed");
        setTimeout(() => {
          activeDom.classList.remove("failed");
          activeDom = null;
        }, 1010);
        return;
      }
      chrome.storage.local
        .set({
          [id]: {
            id: id,
            url: url,
            title: title,
            storageObj: storageObj,
          },
        })
        .then(() => {
          console.log("%c ------复制成功------", "color:green", activeDom);
          if (activeDom) {
            activeDom.classList.add("success");
            setTimeout(() => {
              activeDom.classList.remove("success");
              activeDom = null;
              getHistory();
            }, 1010);
          }
        });
    }
  );
};

const writeFn = async (storageId) => {
  const { id } = await getActiveTab();
  const data = await chrome.storage.local.get(storageId);
  if (data) {
    chrome.tabs.sendMessage(
      Number(id),
      {
        from: "popup",
        subject: "setStorage",
        data: data[storageId].storageObj,
      },
      (response) => {
        let type = "failed";
        if (response.success) {
          type = "success";
        }

        if (activeDom) {
          activeDom.classList.add(type);
          setTimeout(() => {
            activeDom.classList.remove(type);
            activeDom = null;
          }, 1010);
        }
      }
    );
  }
};

const removeFn = async (storageId) => {
  chrome.storage.local
    .remove(storageId)
    .then(() => {
      if (activeDom) {
        activeDom.classList.add("success");
        setTimeout(() => {
          activeDom.classList.remove("success");
          activeDom = null;
          getHistory();
        }, 1010);
      }
    })
    .catch(() => {
      if (activeDom) {
        activeDom.classList.add("failed");
        setTimeout(() => {
          activeDom.classList.remove("failed");
          activeDom = null;
          getHistory();
        }, 1010);
      }
    });
};

const clearAll = () => {
  chrome.storage.local
    .clear()
    .then(() => {
      getHistory();
    })
    .catch(() => {});
};

async function getActiveTab() {
  const queryOptions = { active: true, currentWindow: true };
  const tabs = await chrome.tabs.query(queryOptions);
  return tabs[0];
}

// document.getElementById("copy").addEventListener("click", () => {
//   readFn();
// });

const getCurrentInfo = async () => {
  const { title, id, url } = await getActiveTab();
  const cHtml = `
  <div class="currentWindow" id="c-${id}">
    <div class="cwContainer current">
      <div class="cwcContent ell">${title}</div>
      <div class="cwcContent ell">${url}</div>
    </div>
    <div class="cwOptions">
      <img src="images/copy.png" data-id="${id}" data-title="${title}" data-url="${url}" class="cwCopy cwoItem" alt="存储"></img>
    </div>
  </div>
`;
  document.getElementById("currentW").innerHTML = cHtml;
};

// 获取当前的标签页信息
getCurrentInfo();

const getHistory = async () => {
  const historyObj = await chrome.storage.local.get();
  let historyHtml = "";

  for (const [key, value] of Object.entries(historyObj)) {
    historyHtml += `
    <div class="currentWindow" id="h-${value.id}">
      <div class="cwContainer">
        <div class="cwcContent ell">${value.title}</div>
        <div class="cwcContent ell">${value.url}</div>
      </div>
      <div class="cwOptions">
        <img src="images/download.png" class="cwSave cwoItem" alt="保存到本地" data-id="${value.id}"></img>
        <img src="images/delete.png" class="cwRemove cwoItem" alt="从Storage删除" data-id="${value.id}"></img>
      </div>
    </div>
    `;
  }
  if (historyHtml) {
    document.getElementById("historyList").innerHTML = historyHtml;
  } else {
    document.getElementById("historyList").innerHTML = `
    <div class="emptyWrap">
      <img class="empty" src="images/page-empty.png" alt="" />
      <div>暂无数据</div>
    </div>
    `;
  }
};

// 获取历史存储
getHistory();

// 点击当前页存储
document.getElementById("currentW").addEventListener("click", (e) => {
  const { classList, dataset } = e.target;
  if (classList.contains("cwCopy")) {
    const { id, title, url } = dataset;
    activeDom = document.getElementById(`c-${id}`);
    readFn(id, title, url);
  }
});

// 点击历史列表
document.getElementById("historyList").addEventListener("click", (e) => {
  const { classList, dataset } = e.target;
  if (classList.contains("cwSave")) {
    const { id } = dataset;
    activeDom = document.getElementById(`h-${id}`);
    writeFn(id);
  } else if (classList.contains("cwRemove")) {
    const { id } = dataset;
    activeDom = document.getElementById(`h-${id}`);
    removeFn(id);
  }
});

// 清除所有历史
document.getElementById("clearAll").addEventListener("click", () => {
  clearAll();
});
