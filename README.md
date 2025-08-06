# Glimmer: Highspell Mobile Client

Welcome to the Glimmer project. This is a custom mobile client for Android, designed to enhance the experience of playing the web-based game "Highspell" for us mobile blebs.

The main goal of this project is to provide a more integrated mobile experience, offering features like persistent settings and convenient in-game alerts that are not available in a standard web browser.


## Core Features

*   **Custom Game Launcher:** Select a server and toggle various client settings before starting the game.
    
*   **Keep Screen On:** An option to prevent the device from sleeping while the game is active.
    
*   **In-Game Event Notifiers:** The client can send Android system notifications for important events:
    
    *   **AFK Alert:** Notifies you when your character has been idle for a set period.
        
    *   **Private Message Alert:** Get an instant notification when you receive a new private message.
        
    *   **Low Health Alert:** A warning when your character's health drops below 20%.
        
*   **Background Service:** A foreground service keeps the game connection alive and notifies you that the game is running when the app is in the background.
    


## How It Works: The Magic Behind Glimmer



The project uses a hybrid approach, combining a native Android shell with a web-based game. It's built on the **Capacitor** framework, which allows us to bridge web code and native Android features seamlessly.

Here's a step-by-step look at the architecture:

### 1\. The Launcher (`index.html`)



This is the first screen you see. It's a simple HTML page styled with CSS to create the "Glimmer" theme. It uses Capacitor plugins to save your settings (like which alerts are on) and to keep the screen awake. When you press "Play Now," it calls our custom native plugin to start the game.

### 2\. Loading the Game (`GlimmerPlugin.java`)



This is our own custom Capacitor plugin, created to handle the specific way Highspell loads its game. It receives the selected server from the launcher, makes a request to the game's server to get the game's HTML, and then passes that HTML to our main Android activity.

### 3\. The Main Hub (`MainActivity.java`)



This is the heart of our Android app. It contains the `WebView` that will run the game. Its most important job is **script injection**. Before loading the game's HTML, it inserts our own custom JavaScript file (`injected-script.js`) into it. It also manages the background service and sets up the "native bridge" for communication.

### 4\. The Injected Script (`injected-script.js`)



This script is our "agent" inside the game. It runs within the game's WebView and has access to all of the game's own variables and functions. It waits for the game to load, then it **hooks** into core game functions, like the main update loop (`game.tick`) and the chat system. By watching these, it can detect when you go idle, get a PM, or have low health.

### 5\. The Native Bridge (`GlimmerNativeBridge.java`)



This class acts as the translator between our JavaScript and native Android worlds. When the injected script detects an event (like low health), it calls a function on this bridge. The bridge's `notify` method is responsible for creating and displaying a real Android system notification. The bridge also provides a `getSettings` method so the script knows which alerts you've enabled.

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
    
*   **Game Hooks:** The script successfully hooks into the game's core functions.
    
*   **JS to Native Communication:** The JavaScript code correctly calls the native bridge when alerts are triggered.
    
*   **Foreground Service:** The service starts and stops correctly with the app's lifecycle.
    

### What's To-Do: The Next Big Step!



*   **Implement System Notifications in `GlimmerNativeBridge.java`**
    
    *   This is the **highest priority**. Currently, the `notify` method only logs to the console.
        
    *   We need to add the Android code here to build and display an actual system notification using `NotificationCompat.Builder`. This will make the alerts visible to you outside the app.
