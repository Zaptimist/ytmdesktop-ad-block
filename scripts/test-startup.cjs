const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

if (!process.versions.electron) {
  const { spawn } = require("node:child_process");
  const os = require("node:os");
  fs.mkdirSync(path.join(root, "out"), { recursive: true });
  const output = fs.mkdtempSync(path.join(root, "out", "startup-"));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ytmd-startup-"));
  const log = fs.createWriteStream(path.join(output, "electron.log"));
  const env = { ...process.env, NODE_ENV: "production", YTMD_TEST_OUTPUT: output, YTMD_TEST_PROFILE: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(require("electron"), [__filename], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log, { end: false });
  child.stderr.pipe(log, { end: false });
  const watchdog = setTimeout(() => child.kill("SIGKILL"), 90_000);
  child.on("error", error => {
    console.error(error);
    process.exitCode = 1;
  });
  child.on("close", code => {
    clearTimeout(watchdog);
    log.end();
    fs.rmSync(profile, { recursive: true, force: true });
    const resultPath = path.join(output, "result.json");
    if (!fs.existsSync(resultPath)) {
      fs.writeFileSync(resultPath, JSON.stringify({ passed: false, detail: `Electron exited before completing the check (code ${code})` }, null, 2));
    }
    const passed = code === 0 && JSON.parse(fs.readFileSync(resultPath, "utf8")).passed === true;
    console.log(`Startup ${passed ? "PASS" : "FAIL"}: ${output}`);
    process.exitCode = passed ? 0 : 1;
  });
} else {
  const { app, BrowserWindow, ipcMain, webContents } = require("electron");
  const output = process.env.YTMD_TEST_OUTPUT;
  const profile = process.env.YTMD_TEST_PROFILE;
  if (!output || !profile) throw new Error("Run with node scripts/test-startup.cjs");
  app.setPath("userData", profile);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("lang", "en-US");
  // Exercise the production bundles without changing OS protocol/login registrations or updating an installed app.
  app.isDefaultProtocolClient = () => true;
  app.setLoginItemSettings = () => {};
  app.setAppPath(root);
  Object.defineProperty(process, "resourcesPath", { value: path.join(root, "src/assets/icons") });

  let finishing = false;
  const errors = [];
  const initialized = new Set();
  ipcMain.on("ytmView:loaded", event => {
    if (event.sender.getURL().startsWith("https://music.youtube.com/")) initialized.add(event.sender.id);
  });
  app.on("web-contents-created", (_event, contents) => {
    contents.on("did-start-navigation", (_event, _url, inPlace, mainFrame) => {
      if (mainFrame && !inPlace) initialized.delete(contents.id);
    });
    contents.on("preload-error", (_event, _preload, error) => errors.push(String(error)));
    contents.on("render-process-gone", (_event, details) => errors.push(`Renderer: ${details.reason}`));
    contents.on("console-message", event => {
      if (event.level === "error") errors.push(event.message);
    });
    contents.on("did-fail-load", (_event, code, description, _url, mainFrame) => {
      if (mainFrame) errors.push(`Navigation: ${description} (${code})`);
    });
  });

  async function finish(passed, detail) {
    if (finishing) return;
    finishing = true;
    const report = { passed, detail, errors };
    const save = () => fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(report, null, 2));
    const bounded = promise => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("Inspection timed out")), 3000))]);
    save();
    const main = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes("windows/main/index.html"));
    const ytm = webContents.getAllWebContents().find(contents => /^https:\/\/(music|consent)\.youtube\.com\//.test(contents.getURL()));
    report.window = main && { visible: main.isVisible(), bounds: main.getBounds(), views: main.getBrowserViews().map(view => view.getBounds()) };
    try {
      if (main) report.ui = await bounded(main.webContents.executeJavaScript(`({ ready: document.readyState, text: document.body.innerText })`));
      if (ytm)
        report.page = await bounded(
          ytm.executeJavaScript(`({ url: location.origin + location.pathname, title: document.title,
        hook: !!window.__YTMD_HOOK__,
        playerReady: document.querySelector('ytmusic-player-bar')?.polymerController?.playerApi?.isReady() ?? false })`)
        );
    } catch (error) {
      errors.push(String(error));
      report.passed = false;
    }
    save();
    // Electron captures the host renderer and BrowserView separately, not a composited desktop image.
    for (const [name, contents] of [
      ["shell", main?.webContents],
      ["page", ytm]
    ]) {
      if (!contents) continue;
      try {
        const image = await bounded(contents.capturePage(undefined, { stayHidden: false, stayAwake: true }));
        if (image.isEmpty()) throw new Error("Screenshot is empty");
        fs.writeFileSync(path.join(output, `${name}.png`), image.toPNG());
      } catch (error) {
        errors.push(`${name}: ${error}`);
        report.passed = false;
      }
    }
    save();
    app.exit(report.passed ? 0 : 1);
  }

  setTimeout(() => finish(false, "YouTube Music did not become visible and ready within 60 seconds"), 60_000);
  app
    .whenReady()
    .then(async () => {
      while (!finishing) {
        const consent = webContents.getAllWebContents().find(contents => contents.getURL().startsWith("https://consent.youtube.com/"));
        if (consent && !consent.isLoading()) {
          await consent.executeJavaScript(
            `[...document.querySelectorAll('button')].find(button => button.innerText === 'Reject all' && button.getClientRects().length)?.click()`
          );
        }
        const main = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes("windows/main/index.html"));
        const view = main?.getBrowserViews().find(view => view.webContents.getURL().startsWith("https://music.youtube.com/"));
        if (main?.isVisible() && view && initialized.has(view.webContents.id)) {
          try {
            const ready = await view.webContents.executeJavaScript(`!!document.querySelector('ytmusic-search-box') &&
            !!document.querySelector('ytmusic-player-bar')?.polymerController?.playerApi?.isReady()`);
            if (ready) {
              const contents = view.webContents;
              const readVolume = () => contents.executeJavaScript(`document.querySelector('ytmusic-player-bar').polymerController.playerApi.getVolume()`);
              const originalVolume = await readVolume();
              const testVolume = originalVolume === 37 ? 63 : 37;
              contents.send("remoteControl:execute", "setVolume", testVolume);
              await new Promise(resolve => setTimeout(resolve, 500));
              const actualVolume = await readVolume();
              contents.send("remoteControl:execute", "setVolume", originalVolume);
              if (actualVolume !== testVolume) return finish(false, "Desktop volume control did not reach the player");
              return finish(true, "Music initialization complete; view visible, search and player ready, desktop volume control working");
            }
          } catch (error) {
            errors.push(String(error));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    })
    .catch(error => finish(false, String(error)));
  require(path.join(root, ".vite/main/index.js"));
}
