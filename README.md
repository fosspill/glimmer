# Glimmer ✨

Hello! Welcome to Glimmer. This is a lightweight mobile client for Highspell, designed to be a "Highlite Lite" for Android.

Its main purpose is to keep the game running in the background and provide helpful in-game alerts, similar to Highlite.

## What's Inside?

*   **Custom Launcher:** Pick your server and tweak settings before you hop in.
    
*   **Always Awake:** A toggle to keep your screen on while you play.
    
*   **Helpful Alerts:** Get notifications for important events, like being **idle** for too long or having **low health**.
    
*   **World Map:** A handy map overlay to see where you are. 🗺️
    
*   **Runs in the Background:** Keeps your game alive, even when you switch apps.


## 📱 Installation

### Direct APK Download (Recommended)

Download the latest APK directly from GitHub Releases:

[![Download APK](https://img.shields.io/github/v/release/fosspill/glimmer?label=Download%20Latest%20APK&style=for-the-badge&logo=android&logoColor=white&color=3DDC84)](https://github.com/fosspill/glimmer/releases/latest)

<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://github.com/fosspill/glimmer/releases/latest" alt="QR Code for GitHub Releases" />
</p>

**Installation Steps:**
1. Download the latest release APK from the link above
2. Enable "Install from unknown sources" in Android settings
3. Install the APK file
4. The app will check for updates automatically on launch

### Alternative: F-Droid

Glimmer may be added to F-Droid in the future. For now, direct APK installation is the recommended method.
    

## How the Magic Happens 🪄

Glimmer uses  **Capacitor** to wrap the Highspell web game in a native Android shell.

The flow is pretty simple:

1.  It all starts in the **Launcher**, a simple web page. Hitting "Play" tells the native Android app to start the game.
    
2.  The app fetches the game's HTML from the Highspell server.
    
3.  Before loading the game, it injects a special **script**.
    
4.  This script watches the game's network traffic from the inside to detect events like low health or being idle.
    
5.  When an event happens, the script uses a **native bridge** to tell the Android app to send a notification.
    
6.  If you switch apps, a **Foreground Service** keeps the game connected.
    

## ✨ Shoutouts & Thank Yous

Glimmer is heavily inspired by the amazing work of others in the Highspell community. A huge thank you to:

*   **Highl1te / KKonaOG**: For the incredible [HighliteDesktop](https://github.com/Highl1te/HighliteDesktop/) and  [Plugins](https://github.com/Highl1te/Plugins) repositories. As well as the world map at [highlite.dev](https://highlite.dev). This is main inspiration and blueprint for Glimmer, the functionality and directly feeds the worldmap.
    
*   **CodyBrunson**: For the clever [Idle-Alert](https://github.com/CodyBrunson/Idle-Alert) plugin, which sparked the idea for Glimmer's notification features.
    
Thank you all for sharing your work and paving the way!


## Project Status

Here's a quick look at what's currently working:

*   The launcher and its settings are fully functional.
    
*   The helper script is injected into the game correctly.
    
*   The script communicates with native notifications as intended.
    
*   The background service correctly keeps the app alive.

