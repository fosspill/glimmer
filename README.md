# Glimmer: Highspell Mobile Client

Welcome Glimmer✨. This is a mobile client trying to be a "Highlite Lite" for us Android plebs. 

The main goal of this project is to make the game run in the background, but also provide in-game alerts much like Highlite. 


## Core Features

*   **Custom Game Launcher:** Select a server and toggle various client settings before starting the game.
    
*   **Keep Screen On:** An option to prevent the device from sleeping while the game is active.
    
*   **In-Game Event Notifiers:** The client can send Android system notifications for important events:
    
    *   **AFK Alert:** Notifies you when your character has been idle for a set period.
        
    *   **Low Health Alert:** A warning when your character's health drops below 20%.
        
*   **Background Service:** A foreground service keeps the game connection alive and notifies you that the game is running when the app is in the background.
    


## How It Works: The Magic Behind Glimmer


The project uses a hybrid approach, combining a native Android with https://highspell.com. It's built on the **Capacitor** framework, which allows us to bridge web code and native Android features seamlessly.

Here's a step-by-step look at the architecture:

### 1\. The Launcher (`index.html`)



This is the first screen you see. It's a simple HTML page styled with CSS to create the "Glimmer" theme. It uses Capacitor plugins to save your settings (like which alerts are on) and to keep the screen awake. When you press "Play Now," it calls our custom native plugin to start the game.

### 2\. Loading the Game (`GlimmerPlugin.java`)



This is our own custom Capacitor plugin, created to handle the specific way Highspell loads its game. It receives the selected server from the launcher, makes a request to the game's server to get the game's HTML, and then passes that HTML to our main Android activity.

### 3\. The Main Hub (`MainActivity.java`)



This is the heart of our Android app. It contains the `WebView` that will run the game. Its most important job is **script injection**. Before loading the game's HTML, it inserts our own custom JavaScript file (`injected-script.js`) into it. It also manages the background service and sets up the "native bridge" for communication.

### 4\. The Injected Script (`injected-script.js`)


This script is our "agent" inside the game. It listens (read-only) to the web traffic and sockets used by highspell  By watching and analysing the received data, it can detect when you go idle or have low health.

### 5\. The Native Bridge (`GlimmerNativeBridge.java`)


This class acts as the translator between our JavaScript and native Android worlds. When the injected script detects an event (like low health), it calls a function on this bridge. 

### 6\. Background Service (`ForegroundService.java`)


To make sure the game connection is not terminated when you switch apps, we use a `ForegroundService`. When you minimize the app, this service starts and displays a persistent notification that Glimmer is running. This tells the Android operating system to keep our app alive.



## ✨ Acknowledgements & Community



This project stands on the shoulders of giants and wouldn't exist without the brilliant work of others in the Highspell community. A huge, heartfelt thank you goes out to:

*   **Highl1te / KKonaOG**: For the incredible [HighliteDesktop](https://github.com/Highl1te/HighliteDesktop/) and [Plugins](https://github.com/Highl1te/Plugins) repositories. Your work was the primary inspiration and provided a clear blueprint for how a custom client could be built.
*   **CodyBrunson**: For the clever [Idle-Alert](https://github.com/CodyBrunson/Idle-Alert) plugin. This project was the direct spark for Glimmer's notification features, AFK Alert and general plugin design.

Your code and methods were an invaluable learning resource. Thank you for paving the way!


## Project Status & To-Do List



This section gives a clear picture of what's working and what needs to be done next.

### What's Working:



*   **UI & Settings:** The launcher is fully functional. Settings are correctly saved and loaded.
    
*   **Game Loading:** The plugin successfully fetches and loads the game HTML.
    
*   **Script Injection:** `MainActivity` correctly injects the script into the WebView.
    
*   **JS to Native Communication:** The JavaScript code correctly calls the native bridge when alerts are triggered.
    
*   **Foreground Service:** The service starts and stops correctly with the app's lifecycle. currently under development
    
### To Do:
* Fix foreground service (make sure app is not battery optimized?)
* Make app fullscreen
* Make game performance mode by default? Set useragent to mobile, maybe?
