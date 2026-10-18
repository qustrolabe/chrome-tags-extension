# bookmark-tags

<img width="1920" height="912" alt="preview" src="https://github.com/user-attachments/assets/550551d0-d9c9-40ce-b42a-a984a84ec13a" />

Chrome extension that allows you to add tags to bookmarks and filter them. Tags
are part of the bookmark title so they sync with your bookmarks.

⚠️ **Warning:** This extension is still in development and may corrupt your
bookmarks. **Backup your bookmarks** before using it.

## Build

Clone with submodules, then build:

```bash
git clone --recurse-submodules https://github.com/qustrolabe/bookmark-tags.git
cd bookmark-tags
bun install
bun run build
```

Unpacked extension will be built in the `.output` directory.

