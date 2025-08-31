# BeBee Job Downloader — Chrome Extension

## What it does

1. Open a BeBee jobs search page, for example:
   `https://bebee.com/gb/jobs`
2. Click the extension icon.
3. Click **Choose Folder & Start**.
4. Select the directory where the TXT file should be created.
5. The extension creates a file named with the local current date:
   `YYYY-MM-DD.txt`
6. It extracts from each job card:
   - Role
   - Company
   - Salary
7. It saves one line per job:
   `Role | Company | Salary`
8. It clicks **Next**, waits for the next page, and continues.
9. Click **Stop** in the extension popup to stop.

## Install

1. Extract this folder.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select this extension folder.
6. Open BeBee and run the extension.

## Important

The folder picker must be triggered by a user click, which is why the directory is selected from the extension popup rather than automatically by the content script.

The extension is intentionally based on the HTML structure supplied in the request:
- job cards are `<article>`
- role is in `h3 a`
- company is the text next to the logo
- salary is the element with `title="Salary estimated by BeBee: ..."`
- Next is an `<a>` containing the right-chevron SVG and a `page=` URL

If BeBee changes its HTML, the selectors in `content.js` may need adjustment.
