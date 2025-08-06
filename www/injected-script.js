(function() {
    'use strict';

    // A simple logging function that sends messages to the native side
    const glimmerLog = (message) => {
        if (window.GlimmerNative && window.GlimmerNative.log) {
            window.GlimmerNative.log(`GlimmerJS: ${message}`);
        } else {
            console.log(`GlimmerJS (fallback):`, message);
        }
    };

    const Glimmer = {
        settings: {},
        gameInstance: null,

        // Send a notification using the native bridge
        notify: (title, body) => {
            if (window.GlimmerNative && window.GlimmerNative.notify) {
                window.GlimmerNative.notify(title, body);
            } else {
                glimmerLog(`Notification suppressed: ${title} - ${body}`);
            }
        },

        // --- Module for Idle Detection ---
        IdleNotifier: {
            idleTimer: null,
            lastAnimation: 0,
            isAttached: false,
            init: function(game) {
                if (this.isAttached || !game || !game.player) return;
                glimmerLog("Attaching IdleNotifier...");
                this.isAttached = true;
                
                setInterval(() => {
                    if (!Glimmer.settings.glimmer_idleAlert || !game.player) return;

                    const playerAnimation = game.player.animation ? game.player.animation.id : -1;
                    
                    if (playerAnimation !== -1 && this.lastAnimation === -1) {
                        clearTimeout(this.idleTimer);
                        this.idleTimer = null;
                    } else if (playerAnimation === -1 && this.lastAnimation !== -1 && !this.idleTimer) {
                        this.idleTimer = setTimeout(() => {
                            Glimmer.notify("Glimmer: AFK Alert!", "Your character has been idle for 10 seconds.");
                        }, 10000); // 10 seconds
                    }
                    this.lastAnimation = playerAnimation;
                }, 500); // Check every 500ms
            }
        },

        // --- Module for Private Message Detection ---
        PMNotifier: {
            originalAddMessage: null,
            isAttached: false,
            init: function(game) {
                if (this.isAttached || !game || !game.chat || typeof game.chat.addMessage !== 'function') return;
                
                glimmerLog("Attaching PMNotifier...");
                this.isAttached = true;
                this.originalAddMessage = window.game.chat.addMessage;

                // Override the game's addMessage function to intercept messages
                window.game.chat.addMessage = (message, type, sender) => {
                    // Check if the PM alert setting is enabled and if it's a private message (type 2)
                    if (Glimmer.settings.glimmer_pmAlert === "true" && type === 2 && sender) {
                        Glimmer.notify("New Private Message!", `From: ${sender}`);
                    }
                    // Call the original function to ensure the game works as expected
                    return this.originalAddMessage.apply(window.game.chat, arguments);
                };
            }
        },

        // --- Module for Health Monitoring ---
        HealthNotifier: {
            lastHealthPercent: 100,
            isAttached: false,
            init: function(game) {
                if (this.isAttached || !game || !game.skills) return;
                glimmerLog("Attaching HealthNotifier...");
                this.isAttached = true;

                setInterval(() => {
                    if (!Glimmer.settings.glimmer_healthAlert) return;

                    const currentHp = game.skills.get('hitpoints')?.level;
                    const maxHp = game.skills.get('hitpoints')?.maxLevel;

                    if (currentHp !== undefined && maxHp !== undefined && maxHp > 0) {
                        const healthPercent = (currentHp / maxHp) * 100;
                        if (healthPercent < 20 && this.lastHealthPercent >= 20) {
                            Glimmer.notify("Low Health Warning!", `Your health is below 20%!`);
                        }
                        this.lastHealthPercent = healthPercent;
                    }
                }, 1000); // Check every second
            }
        },
        
        // --- Main Initialization Logic ---
        initialize: function() {
            // First, load the settings from the native side.
            if (window.GlimmerNative && window.GlimmerNative.getSettings) {
                try {
                    const settingsJson = window.GlimmerNative.getSettings();
                    this.settings = JSON.parse(settingsJson);
                    glimmerLog("Settings loaded: " + settingsJson);
                } catch (e) {
                    glimmerLog("Error parsing settings: " + e.toString());
                    // Set default settings if parsing fails
                    this.settings = { glimmer_idleAlert: "true", glimmer_pmAlert: "true", glimmer_healthAlert: "true" };
                }
            } else {
                glimmerLog("GlimmerNative not found. Using default settings.");
                // Set default settings if the bridge isn't available
                this.settings = { glimmer_idleAlert: "true", glimmer_pmAlert: "true", glimmer_healthAlert: "true" };
            }
            
            // Now, hook into the game
            this.hookIntoGame();
        },
        
        hookIntoGame: function() {
            // This regex looks for a script tag with a source like '.../client.NUMBER.js'
            const gameScriptRegex = /client\.\d+\.js$/;
            
            const findAndHookGame = () => {
                if (window.game && window.game.isReady) {
                    glimmerLog("Game object is ready. Initializing modules.");
                    this.gameInstance = window.game;
                    this.initModules(this.gameInstance);
                    return true;
                }
                return false;
            };
            
            // Use MutationObserver to wait for the script to be added to the DOM
            const observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.tagName === 'SCRIPT' && node.src && gameScriptRegex.test(node.src)) {
                                glimmerLog("Game script detected: " + node.src);
                                // The script is added, now we need to wait for it to execute and create the 'game' object.
                                const checkInterval = setInterval(() => {
                                    if (findAndHookGame()) {
                                        clearInterval(checkInterval);
                                    }
                                }, 100);
                                observer.disconnect();
                                return;
                            }
                        }
                    }
                }
            });

            observer.observe(document.head, { childList: true, subtree: true });
            observer.observe(document.body, { childList: true, subtree: true });

            glimmerLog("Glimmer is waiting for the game to load...");
        }
    };

    // Start the initialization process
    Glimmer.initialize();

})();