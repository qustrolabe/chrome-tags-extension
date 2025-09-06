export default defineBackground(() => {
  // console.log("Hello background!", { id: browser.runtime.id });
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
      url: chrome.runtime.getURL("mainpage.html"),
    });
  });
});
