# YouTube Music Desktop App (Ad-Free Fork)

A fork of [ytmdesktop](https://github.com/ytmdesktop/ytmdesktop) with **built-in ad blocking**. Listen to YouTube Music without interruptions.

![YouTube Music Desktop App](.github/images/readme_main_app.png)

## Ad Blocking

This fork includes a four-layer ad blocking system that runs automatically — no configuration needed:

| Layer                 | How it works                                                                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API interception**  | Patches `fetch` and `XMLHttpRequest` before page JS executes to strip `adPlacements`, `playerAds`, `adSlots` and tracking fields from YouTube's `/youtubei/v1/player` and `/next` API responses.                                              |
| **Network blocking**  | Blocks ad-serving requests (Google Ads, DoubleClick, tracking endpoints) using [EasyList](https://easylist.to/) + [EasyPrivacy](https://easylist.to/) filter lists via the [Ghostery adblocker engine](https://github.com/nicedoc/adblocker). |
| **Cosmetic hiding**   | CSS injection that hides ad overlays, promotional banners, and premium upsell prompts.                                                                                                                                                        |
| **Video ad skipping** | Fallback layer: if an ad somehow slips through, it is instantly muted, sped up to 16x, and seeked to the end.                                                                                                                                 |

## Download

**[Download the latest release](https://github.com/Zaptimist/ytmdesktop-ad-block/releases/latest)** (Windows `.exe` installer)

> Looking for the original (without ad blocking)? See [ytmdesktop/ytmdesktop](https://github.com/ytmdesktop/ytmdesktop/releases).

## Building from source

Requires [Git](https://git-scm.com) and [Node.js v20+](https://nodejs.org/).

```sh
git clone https://github.com/Zaptimist/ytmdesktop-ad-block.git
cd ytmdesktop-ad-block
npm install --legacy-peer-deps
npm run make
```

The installer will be at `out/make/squirrel.windows/x64/`. Run the Setup `.exe` to install.

For development mode (with hot-reload):

```sh
npm start
```

## Startup verification

Before changing startup/player integration code, reproduce the problem with the real app. Before handing off a change, run:

```sh
npm ci --include=dev --legacy-peer-deps
npm run test:startup
```

This runs TypeScript checking, builds the desktop application, and launches its production bundles in Electron without a development server. The check uses a fresh temporary profile, software rendering and English consent UI. It rejects optional cookies if asked; it never signs in or reuses your installed app's settings. OS protocol/login registrations and automatic updates are excluded from this test.

A pass requires the actual music preload to finish (a consent page alone is not success), the music view to be attached to a visible window, the search box and player to be ready, and a desktop volume command to reach the player. The original volume is then restored. The check exits nonzero on failure or a 60-second startup timeout.

Each run prints an `out/startup-*` directory containing `result.json`, `electron.log`, and screenshots when capture is possible. `shell.png` is the app's host renderer; `page.png` is the separate YouTube Music view. Inspect the page screenshot before reporting visual verification. Temporary profiles are removed when the test process exits; evidence remains under the Git-ignored `out/` directory.

An internet connection and a working graphical session are required. Network/consent failures are failures, not skipped tests. This checks anonymous startup and volume control, not signed-in playback, installer behavior, updates, or hardware acceleration. Run it on Windows for Windows-specific assurance; a Linux pass does not prove the Windows build works.

## Original Project Contributors

This fork builds on the work of the [ytmdesktop](https://github.com/ytmdesktop/ytmdesktop) contributors:

[<img alt="adlerluiz" src="https://avatars.githubusercontent.com/u/2112638?v=4&s=240" width="120" height="120">](https://github.com/adlerluiz)
[<img alt="NovusTheory" src="https://avatars.githubusercontent.com/u/3434404?v=4&s=240" width="120" height="120">](https://github.com/NovusTheory)
[<img alt="mingjun97" src="https://avatars.githubusercontent.com/u/15214491?v=4&s=240" width="120" height="120">](https://github.com/mingjun97)
[<img alt="rickpalmeira" src="https://avatars.githubusercontent.com/u/4140033?v=4&s=240" width="120" height="120">](https://github.com/rickpalmeira)
[<img alt="Alipoodle" src="https://avatars.githubusercontent.com/u/17199186?v=4&s=240" width="120" height="120">](https://github.com/Alipoodle)
[<img alt="flleeppyy" src="https://avatars.githubusercontent.com/u/18307183?v=4&s=240" width="120" height="120">](https://github.com/flleeppyy)
[<img alt="zagoruev" src="https://avatars.githubusercontent.com/u/986243?v=4&s=240" width="120" height="120">](https://github.com/zagoruev)
[<img alt="Venipa" src="https://avatars.githubusercontent.com/u/17952364?v=4&s=240" width="120" height="120">](https://github.com/Venipa)
[<img alt="serjan-nasredin" src="https://avatars.githubusercontent.com/u/67647968?v=4&s=240" width="120" height="120">](https://github.com/serjan-nasredin)
[<img alt="TotalChris" src="https://avatars.githubusercontent.com/u/41809916?v=4&s=240" width="120" height="120">](https://github.com/TotalChris)
[<img alt="ArnyminerZ" src="https://avatars.githubusercontent.com/u/12086466?v=4&s=240" width="120" height="120">](https://github.com/ArnyminerZ)
[<img alt="TotallyNotInUse" src="https://avatars.githubusercontent.com/u/56458705?v=4&s=240" width="120" height="120">](https://github.com/TotallyNotInUse)
[<img alt="ddarkr" src="https://avatars.githubusercontent.com/u/6638675?v=4&s=240" width="120" height="120">](https://github.com/ddarkr)
[<img alt="pinkiesky" src="https://avatars.githubusercontent.com/u/7098424?v=4&s=240" width="120" height="120">](https://github.com/pinkiesky)
[<img alt="NNowakowski" src="https://avatars.githubusercontent.com/u/16933892?v=4&s=240" width="120" height="120">](https://github.com/NNowakowski)
[<img alt="dm3ch" src="https://avatars.githubusercontent.com/u/5025313?v=4&s=240" width="120" height="120">](https://github.com/dm3ch)
[<img alt="Vistaus" src="https://avatars.githubusercontent.com/u/1716229?v=4&s=240" width="120" height="120">](https://github.com/Vistaus)
[<img alt="smarquespt" src="https://avatars.githubusercontent.com/u/1302668?v=4&s=240" width="120" height="120">](https://github.com/smarquespt)
[<img alt="peter9811" src="https://avatars.githubusercontent.com/u/22783445?v=4&s=240" width="120" height="120">](https://github.com/peter9811)
[<img alt="KageRyo" src="https://avatars.githubusercontent.com/u/36478298?v=4&s=240" width="120" height="120">](https://github.com/KageRyo)
[<img alt="andrew000" src="https://avatars.githubusercontent.com/u/11490628?v=4&s=240" width="120" height="120">](https://github.com/andrew000)
[<img alt="danparidae" src="https://avatars.githubusercontent.com/u/7272087?v=4&s=240" width="120" height="120">](https://github.com/danparidae)
[<img alt="tbvjaos510" src="https://avatars.githubusercontent.com/u/32216112?v=4&s=240" width="120" height="120">](https://github.com/tbvjaos510)
[<img alt="andia89" src="https://avatars.githubusercontent.com/u/6475757?v=4&s=240" width="120" height="120">](https://github.com/andia89)
[<img alt="nils-kt" src="https://avatars.githubusercontent.com/u/34674720?v=4&s=240" width="120" height="120">](https://github.com/nils-kt)
[<img alt="Nerogar" src="https://avatars.githubusercontent.com/u/3390934?v=4&s=240" width="120" height="120">](https://github.com/Nerogar)
[<img alt="nattadasu" src="https://avatars.githubusercontent.com/u/49780229?v=4&s=240" width="120" height="120">](https://github.com/nattadasu)
[<img alt="mkotb" src="https://avatars.githubusercontent.com/u/6364146?v=4&s=240" width="120" height="120">](https://github.com/mkotb)
[<img alt="chaoky" src="https://avatars.githubusercontent.com/u/9826702?v=4&s=240" width="120" height="120">](https://github.com/chaoky)
[<img alt="ElectricalBoy" src="https://avatars.githubusercontent.com/u/15651807?v=4&s=240" width="120" height="120">](https://github.com/ElectricalBoy)

[discord-img]: https://img.shields.io/badge/Discord-JOIN-GREEN.svg?style=for-the-badge&logo=discord
[discord-url]: https://discord.gg/88P2n2a
[gitmoji-img]: https://img.shields.io/badge/Gitmoji-STANDARD-FFDD67.svg?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1wcmVmaXg9ImZhcyIgZGF0YS1pY29uPSJncmluLXRvbmd1ZS13aW5rIiBjbGFzcz0ic3ZnLWlubGluZS0tZmEgZmEtZ3Jpbi10b25ndWUtd2luayBmYS13LTE2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OTYgNTEyIj48cGF0aCBmaWxsPSIjRkZERDY3IiBkPSJNMzQ0IDE4NGEyNCAyNCAwIDEwMCA0OCAyNCAyNCAwIDEwMC00OHpNMjQ4IDhhMjQ4IDI0OCAwIDAwLTg3IDQ4MGMtNi0xMi05LTI2LTktNDB2LTQ1Yy0yNS0xNy00My0zOS00OC02NC0yLTEyIDEwLTIyIDIxLTE4IDMwIDEwIDc1IDE1IDEyMyAxNXM5My01IDEyMy0xNWMxMi00IDIzIDYgMjEgMTgtNCAyNS0yMyA0Ny00OCA2M3Y0NmMwIDE0LTMgMjgtOSA0MEEyNDggMjQ4IDAgMDAyNDggOHptLTU2IDIyNWwtOS04Yy0xNS0xNC00Ny0xNC02MSAwbC0xMCA4Yy04IDctMjIgMC0yMC0xMSA0LTI1IDM0LTQyIDYwLTQyczU2IDE3IDYwIDQyYzIgMTEtMTIgMTgtMjAgMTF6bTE1MiAzOWE2NCA2NCAwIDExMC0xMjggNjQgNjQgMCAwMTAgMTI4em0tNTEgMTAzYy0xNC03LTMxIDItMzQgMTdsLTIgOGMtMiA5LTE2IDktMTggMGwtMS04Yy00LTE1LTIxLTI0LTM1LTE3bC0xOSA5djYzYzAgMzUgMjggNjUgNjMgNjUgMzYgMCA2NS0yOSA2NS02NHYtNjRsLTE5LTl6Ii8+PC9zdmc+
[gitmoji-url]: https://gitmoji.carloscuesta.me
[license-img]: https://img.shields.io/github/license/ytmdesktop/ytmdesktop.svg?style=for-the-badge&logo=librarything
[license-url]: https://github.com/ytmdesktop/ytmdesktop/blob/master/LICENSE
[release-img]: https://img.shields.io/github/release/ytmdesktop/ytmdesktop.svg?style=for-the-badge&logo=flattr
[release-url]: https://GitHub.com/ytmdesktop/ytmdesktop/releases/
[download-img]: https://img.shields.io/github/downloads/ytmdesktop/ytmdesktop/total.svg?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1wcmVmaXg9ImZhcyIgZGF0YS1pY29uPSJjbG91ZC1kb3dubG9hZC1hbHQiIGNsYXNzPSJzdmctaW5saW5lLS1mYSBmYS1jbG91ZC1kb3dubG9hZC1hbHQgZmEtdy0yMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNjQwIDUxMiI+PHBhdGggZmlsbD0iI0ZGRiIgZD0iTTUzOCAyMjdjNC0xMSA2LTIzIDYtMzVhOTYgOTYgMCAwMC0xNDktODAgMTYwIDE2MCAwIDAwLTI5OSA4OCAxNDQgMTQ0IDAgMDA0OCAyODBoMzY4YTEyOCAxMjggMCAwMDI2LTI1M3ptLTEzMyA4OEwyOTkgNDIxYy02IDYtMTYgNi0yMiAwTDE3MSAzMTVjLTEwLTEwLTMtMjcgMTItMjdoNjVWMTc2YzAtOSA3LTE2IDE2LTE2aDQ4YzkgMCAxNiA3IDE2IDE2djExMmg2NWMxNSAwIDIyIDE3IDEyIDI3eiIvPjwvc3ZnPg==
[download-url]: https://github.com/ytmdesktop/ytmdesktop/releases/
[more]: https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/
