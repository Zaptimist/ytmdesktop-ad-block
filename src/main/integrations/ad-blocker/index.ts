import { BrowserView, ipcMain } from "electron";
import { FiltersEngine, Request } from "@ghostery/adblocker";
import fetch from "cross-fetch";
import log from "electron-log";

import IIntegration from "../integration";

// EasyList + EasyPrivacy filter list URLs (same lists used by uBlock Origin / Brave)
const FILTER_LISTS = [
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",
  "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext"
];

// CSS to hide ad-related UI elements in YouTube Music
const AD_HIDE_CSS = `
  /* Hide ad overlays in the video player */
  .ytp-ad-overlay-container,
  .ytp-ad-message-container,
  .ytp-ad-overlay-slot,
  .ytp-paid-content-overlay,
  .ytp-ad-skip-button-slot,
  .ytp-ad-module {
    display: none !important;
  }

  /* Hide promotional banners and upsell prompts */
  ytmusic-promoted-sparkles-web-renderer,
  ytmusic-promoted-sparkles-text-search-renderer,
  ytmusic-statement-banner-renderer,
  .ytmusic-mealbar-promo-renderer,
  ytmusic-you-there-renderer,
  tp-yt-paper-dialog:has(.ytmusic-mealbar-promo-renderer),
  tp-yt-paper-dialog:has(ytmusic-you-there-renderer) {
    display: none !important;
  }
`;

// Script injected into YTM's main world to instantly skip video ads.
// Hooks directly into YTM's internal Redux store for real-time ad detection,
// then mutes + seeks to end of the ad video.
const AD_SKIP_SCRIPT = `
(function() {
  'use strict';

  if (window.__YTMD_AD_SKIP_ACTIVE__) return;
  window.__YTMD_AD_SKIP_ACTIVE__ = true;

  var savedVolume = -1;
  var adActive = false;

  function killAd() {
    var video = document.querySelector('video');
    if (!video) return;

    // Mute immediately so user hears nothing
    if (!adActive) {
      savedVolume = video.volume;
      adActive = true;
    }
    video.volume = 0;

    // Speed up to max so ad ends ASAP
    try { video.playbackRate = 16; } catch(e) {}

    // Seek to end
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
    }

    // Click any skip button
    var skip = document.querySelector(
      '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, ' +
      '.ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button'
    );
    if (skip) skip.click();

    // Close overlay ads
    document.querySelectorAll(
      '.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container'
    ).forEach(function(btn) { btn.click(); });
  }

  function restoreAfterAd() {
    if (!adActive) return;
    adActive = false;

    var video = document.querySelector('video');
    if (video) {
      video.volume = savedVolume >= 0 ? savedVolume : 1;
      try { video.playbackRate = 1; } catch(e) {}
    }
    savedVolume = -1;
  }

  // PRIMARY: Subscribe to YTM's internal store for instant adPlaying detection
  // This fires the moment YouTube flags an ad — zero delay.
  if (window.__YTMD_HOOK__ && window.__YTMD_HOOK__.ytmStore) {
    var store = window.__YTMD_HOOK__.ytmStore;
    var wasAdPlaying = false;

    store.subscribe(function() {
      var state = store.getState();
      var isAd = state.player && state.player.adPlaying;

      if (isAd && !wasAdPlaying) {
        killAd();
        // Keep hammering in case seek/skip doesn't work first try
        var hammer = setInterval(function() {
          var s = store.getState();
          if (s.player && s.player.adPlaying) {
            killAd();
          } else {
            clearInterval(hammer);
            restoreAfterAd();
          }
        }, 50);
      }
      wasAdPlaying = isAd;
    });
  }

  // SECONDARY: Fast interval as fallback for ads the store might miss
  setInterval(function() {
    // Check via DOM: .ad-showing class on the player
    var player = document.querySelector('#movie_player');
    var isAd = player && player.classList.contains('ad-showing');

    if (isAd) {
      killAd();
    } else if (adActive) {
      // Also check store if available
      var storeAd = false;
      if (window.__YTMD_HOOK__ && window.__YTMD_HOOK__.ytmStore) {
        var state = window.__YTMD_HOOK__.ytmStore.getState();
        storeAd = state.player && state.player.adPlaying;
      }
      if (!storeAd) {
        restoreAfterAd();
      }
    }
  }, 100);
})
`;

export default class AdBlocker implements IIntegration {
  private ytmView: BrowserView;
  private engine: FiltersEngine | null = null;
  private isEnabled = false;
  private cssKey: string | null = null;
  private ipcListener: (() => void) | null = null;
  private cosmeticsInjected = false;

  public provide(ytmView: BrowserView): void {
    const ytmViewChanged = ytmView !== this.ytmView;
    this.ytmView = ytmView;

    if (this.isEnabled && ytmViewChanged) {
      this.cosmeticsInjected = false;
      this.cssKey = null;
      this.applyToSession();
      this.setupLoadListener();
    }
  }

  public async enable(): Promise<void> {
    this.isEnabled = true;
    log.info("Ad Blocker: Initializing...");

    try {
      // Download and parse filter lists into a network-only blocking engine.
      // We skip cosmetic filters entirely — CSS hiding and ad-skip are handled
      // by our own injection to avoid conflicts with YTM's Polymer framework.
      const lists = await Promise.all(
        FILTER_LISTS.map(url =>
          fetch(url)
            .then(r => r.text())
            .catch(e => {
              log.warn(`Ad Blocker: Failed to fetch ${url}`, e);
              return "";
            })
        )
      );

      this.engine = FiltersEngine.parse(lists.join("\n"), {
        loadCosmeticFilters: false,
        loadNetworkFilters: true
      });

      this.applyToSession();
      this.setupLoadListener();

      log.info("Ad Blocker: Fully initialized and active");
    } catch (error) {
      log.error("Ad Blocker: Failed to initialize", error);
    }
  }

  public disable(): void {
    this.isEnabled = false;

    if (this.ytmView) {
      // Remove the onBeforeRequest handler by setting it to null
      this.ytmView.webContents.session.webRequest.onBeforeRequest(null);
    }

    if (this.cssKey && this.ytmView) {
      this.ytmView.webContents.removeInsertedCSS(this.cssKey).catch(() => {});
      this.cssKey = null;
    }

    if (this.ipcListener) {
      ipcMain.removeListener("ytmView:loaded", this.ipcListener);
      this.ipcListener = null;
    }

    this.cosmeticsInjected = false;
    this.engine = null;
    log.info("Ad Blocker: Disabled");
  }

  public getYTMScripts(): { name: string; script: string }[] {
    return [
      {
        name: "adSkip",
        script: AD_SKIP_SCRIPT
      }
    ];
  }

  // --------------------------------------------------

  private applyToSession(): void {
    if (!this.engine || !this.ytmView) return;

    const engine = this.engine;
    this.ytmView.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const { match } = engine.match(
        Request.fromRawDetails({
          url: details.url,
          sourceUrl: details.referrer || details.url,
          type: details.resourceType
        })
      );

      if (match) {
        log.debug(`Ad Blocker: Blocked ${details.url.substring(0, 80)}`);
      }
      callback({ cancel: match });
    });

    log.info("Ad Blocker: Network-level blocking enabled on ytmview session");
  }

  private setupLoadListener(): void {
    if (this.ipcListener) {
      ipcMain.removeListener("ytmView:loaded", this.ipcListener);
    }

    this.ipcListener = () => {
      if (!this.cosmeticsInjected) {
        this.cosmeticsInjected = true;
        this.injectCosmetics();
      }
    };
    ipcMain.on("ytmView:loaded", this.ipcListener);
  }

  private async injectCosmetics(): Promise<void> {
    if (!this.ytmView || !this.isEnabled) return;

    try {
      if (this.cssKey) {
        await this.ytmView.webContents.removeInsertedCSS(this.cssKey);
      }
      this.cssKey = await this.ytmView.webContents.insertCSS(AD_HIDE_CSS);
      log.info("Ad Blocker: Cosmetic CSS injected");
    } catch (error) {
      log.error("Ad Blocker: Failed to inject cosmetic CSS", error);
    }
  }
}
