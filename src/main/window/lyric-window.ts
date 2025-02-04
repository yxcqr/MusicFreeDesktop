import { BrowserWindow, app, screen, nativeImage } from "electron";
import { getResPath } from "../util";
import injectGlobalData from "./common/inject-global-data";
import makeWindowFullyDraggable from "./common/make-window-fully-draggable";
import {
  getAppConfig,
  getAppConfigPath,
  setAppConfigPath,
} from "@/common/app-config/main";
import { registerExtension, unregisterExtension } from "../core/extensions";
import { ipcMainOn, ipcMainSend } from "@/common/ipc-util/main";
import { currentMusicInfoStore } from "../store/current-music";
import debounce from "lodash.debounce";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const LRC_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

/** 歌词窗口创建 */
let lyricWindow: BrowserWindow | null = null;

/** 更新位置配置 */
const dSetLyricWindowConfig = debounce(
  (point: ICommon.IPoint) => {
    setAppConfigPath("private.lyricWindowPosition", point);
  },
  300,
  {
    leading: false,
    trailing: true,
  }
);

export const createLyricWindow = (): BrowserWindow => {
  // Create the browser window.
  const width = 920;
  const height = 160;
  lyricWindow = new BrowserWindow({
    height,
    width,
    transparent: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      webSecurity: false,
      sandbox: false,
    },
    resizable: false,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: nativeImage.createFromPath(getResPath("logo.png")),
  });

  // and load the index.html of the app.
  lyricWindow.loadURL(LRC_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    // Open the DevTools.
    lyricWindow.webContents.openDevTools();
  }

  lyricWindow.webContents.on("did-finish-load", () => {
    // 注入全局变量
    injectGlobalData(lyricWindow);
  });
  if (process.platform === "win32") {
    // windows系统移动桌面歌词
    makeWindowFullyDraggable(lyricWindow, {
      width,
      height,
      onMouseUp(position) {
        if (position) {
          setAppConfigPath("private.lyricWindowPosition", {
            x: position.x,
            y: position.y,
          });
        }
      },
    });
  } else {
    // 其他系统通过ipc移动桌面歌词
    ipcMainOn("set-lyric-window-pos", (pos) => {
      if (lyricWindow) {
        lyricWindow.setBounds({
          x: pos.x,
          y: pos.y,
          height: height,
          width: width,
        });
        dSetLyricWindowConfig(pos);
      }
    });
  }

  // 初始化设置
  lyricWindow.once("ready-to-show", async () => {
    const position = await getAppConfigPath("private.lyricWindowPosition");
    if (position) {
      const currentDisplayBounds = screen.getDisplayNearestPoint(position).bounds;
      // 如果完全在是窗外，重置位置
      const [left, top, right, bottom] = [position.x, position.y, position.x + width, position.y + height];
      let needMakeup = false;
      if(left > currentDisplayBounds.x + currentDisplayBounds.width) {
        position.x = currentDisplayBounds.x + currentDisplayBounds.width - width;
        needMakeup = true;
      } else if(right < currentDisplayBounds.x) {
        position.x = currentDisplayBounds.x;
        needMakeup = true;
      }
      if(top > currentDisplayBounds.y + currentDisplayBounds.height) {
        position.y = currentDisplayBounds.y + currentDisplayBounds.height - height;
        needMakeup = true;
      }else if(bottom < currentDisplayBounds.y) {
        position.y = currentDisplayBounds.y;
        needMakeup = true;
      }
      lyricWindow.setPosition(position.x, position.y, false);
      if(needMakeup) {
        await setAppConfigPath('private.lyricWindowPosition', position);
      }
    }
    const lockState = await getAppConfigPath("lyric.lockLyric");

    if (lockState) {
      lyricWindow.setIgnoreMouseEvents(true, {
        forward: true,
      });
    }
  });

  //   lyricWindow.setIgnoreMouseEvents(true, {
  //     forward: true
  //   })
  registerExtension(lyricWindow);
  return lyricWindow;
};

export const closeLyricWindow = () => {
  unregisterExtension(lyricWindow);
  lyricWindow?.close();
  lyricWindow = null;
};

export const getLyricWindow = () => lyricWindow;
