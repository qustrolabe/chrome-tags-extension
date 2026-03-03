export default defineBackground(() => {
  if (import.meta.env.MANIFEST_VERSION === 3) {
    browser.action.onClicked.addListener(() => {
      browser.tabs.create({ url: browser.runtime.getURL("/mainpage.html") });
    });
  } else {
    (browser as any).browserAction.onClicked.addListener(() => {
      browser.tabs.create({ url: browser.runtime.getURL("/mainpage.html") });
    });
  }
});
