// A simple logging function that sends messages to the native side
const glimmerLog = (message) => {
    if (window.GlimmerNative && window.GlimmerNative.log) {
        window.GlimmerNative.log(message);
    } else {
        console.log("GlimmerJS (fallback):", message);
    }
};

const Glimmer = {
    settings: {}, // Store settings loaded from native

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
        start: function() {
            if (!this.isAttached && window.game && window.game.player) {
                glimmerLog("Attaching IdleNotifier...");
                this.isAttached = true;
                setInterval(() => {
                    if (!this.settings.glimmer_idleAlert) return;

                    const playerAnimation = window.game.player.animation ? window.game.player.animation.id : -1;
                    
                    if (playerAnimation !== -1 && this.lastAnimation === -1) {
                        clearTimeout(this.idleTimer);
                        this.idleTimer = null;
                    } else if (playerAnimation === -1 && this.lastAnimation !== -1 && !this.idleTimer) {
                        this.idleTimer = setTimeout(() => {
                            Glimmer.notify("Glimmer: AFK Alert!", "Your character has been idle for 10 seconds.");
                        }, 10000);
                    }
                    this.lastAnimation = playerAnimation;
                }, 500); // Check every 500ms
            }
        },
        isAttached: false
    },

    // --- Module for Private Message Detection ---
    PMNotifier: {
        originalAddMessage: null,
        start: function() {
            if (!this.originalAddMessage && window.game && window.game.chat && typeof window.game.chat.addMessage === 'function') {
                glimmerLog("Attaching PMNotifier...");
                this.originalAddMessage = window.game.chat.addMessage;
                window.game.chat.addMessage = (message, type, sender) => {
                    if (this.settings.glimmer_pmAlert && type === 2 && sender) {
                        Glimmer.notify("New Private Message!", `From: ${sender}`);
                    }
                    return this.originalAddMessage.call(window.game.chat, message, type, sender);
                };
            }
        }
    },

    // --- Module for Health Monitoring ---
    HealthNotifier: {
        lastHealthPercent: 100,
        start: function() {
            if (!this.isAttached && window.game && window.game.skills) {
                glimmerLog("Attaching HealthNotifier...");
                this.isAttached = true;
                setInterval(() => {
                    if (!this.settings.glimmer_healthAlert) return;

                    const currentHp = window.game.skills.get('hitpoints')?.level;
                    const maxHp = window.game.skills.get('hitpoints')?.maxLevel;

                    if (currentHp !== undefined && maxHp !== undefined) {
                        const healthPercent = (currentHp / maxHp) * 100;
                        if (healthPercent < 20 && this.lastHealthPercent >= 20) {
                            Glimmer.notify("Low Health Warning!", `Your health is below 20%!`);
                        }
                        this.lastHealthPercent = healthPercent;
                    }
                }, 1000); // Check every second
            }
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
                this.settings = { glimmer_idleAlert: true, glimmer_pmAlert: true, glimmer_healthAlert: true };
            }
        } else {
            glimmerLog("GlimmerNative not found. Using default settings.");
            // Set default settings if the bridge isn't available
            this.settings = { glimmer_idleAlert: true, glimmer_pmAlert: true, glimmer_healthAlert: true };
        }

        // Now, set up an interval to check for the game object.
        const checkGameInterval = setInterval(() => {
            if (window.game && window.game.isReady) {
                glimmerLog("Game object found. Initializing modules.");
                clearInterval(checkGameInterval); // Stop checking once found.
                
                // Initialize modules now that the game is ready.
                this.IdleNotifier.settings = this.settings;
                this.PMNotifier.settings = this.settings;
                this.HealthNotifier.settings = this.settings;

                this.IdleNotifier.start();
                this.PMNotifier.start();
                this.HealthNotifier.start();

                glimmerLog("Glimmer client fully initialized.");
            } else {
                glimmerLog("Waiting for game to initialize...");
            }
        }, 1000); // Check every second
    }
};

// Start the initialization process
Glimmer.initialize();