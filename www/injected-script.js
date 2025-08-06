const Glimmer = {
    log: (message) => {
        if (window.GlimmerNative && window.GlimmerNative.log) {
            window.GlimmerNative.log(message);
        } else {
            // Fallback to console.log if the native bridge isn't available
            console.log("GlimmerJS (fallback):", message);
        }
    },
    notify: (title, body) => {
        if (window.GlimmerNative && window.GlimmerNative.notify) {
            window.GlimmerNative.notify(title, body);
        } else {
            console.error("Glimmer: Native bridge is not available.");
        }
    },

    SettingsManager: {
        settings: {},
        load(settingsJson) {
            try {
                this.settings = JSON.parse(settingsJson);
            } catch (e) {
                console.error("Glimmer: Failed to parse settings.", e);
            }
        },
        get(key, defaultValue) {
            const value = this.settings[key];
            if (value === 'true') return true;
            if (value === 'false') return false;
            return defaultValue;
        }
    },

    TickManager: {
        originalTick: null,
        subscribers: [],
        start() {
            const targetFunction = window.game?.tick;
            if (targetFunction && !this.originalTick) {
                this.originalTick = targetFunction;
                window.game.tick = (...args) => {
                    const result = this.originalTick.apply(window.game, args);
                    for (const subscriber of this.subscribers) {
                        try {
                            subscriber();
                        } catch (e) {
                            console.error("Glimmer: Tick subscriber failed", e);
                        }
                    }
                    return result;
                };
            }
        },
        subscribe(callback) {
            this.subscribers.push(callback);
        }
    },

    IdleNotifier: {
        idleTimer: null,
        lastAnimation: 0,
        start() {
            Glimmer.TickManager.subscribe(() => {
                const playerAnimation = window.game?.player?.animation?.id ?? -1;
                if (playerAnimation !== -1 && this.lastAnimation === -1) {
                    clearTimeout(this.idleTimer);
                    this.idleTimer = null;
                } else if (playerAnimation === -1 && this.lastAnimation !== -1 && !this.idleTimer) {
                    this.idleTimer = setTimeout(() => {
                        // Use the new logging function
                        Glimmer.log("Idle timer triggered!"); 
                        Glimmer.notify("Glimmer: AFK Alert!", "Your character is idle.");
                    }, 10000);
                }
                this.lastAnimation = playerAnimation;
            });
        },
    },

    PMNotifier: {
        originalAddMessage: null,
        start() {
            const targetFunction = window.game?.chat?.addMessage;
            if (targetFunction && !this.originalAddMessage) {
                this.originalAddMessage = targetFunction;
                window.game.chat.addMessage = (message, type, sender) => {
                    // Use the new logging function
                    Glimmer.log(`New message: type=${type}, sender=${sender}`);
                    if (type === 2 && sender) {
                        Glimmer.notify("New Private Message!", `From: ${sender}`);
                    }
                    return this.originalAddMessage.call(window.game.chat, message, type, sender);
                };
            }
        }
    },

    HealthNotifier: {
        lastHealthPercent: 100,
        start() {
            Glimmer.TickManager.subscribe(() => {
                const currentHp = window.game?.skills?.get('hitpoints')?.level ?? 10;
                const maxHp = window.game?.skills?.get('hitpoints')?.maxLevel ?? 10;
                const healthPercent = (currentHp / maxHp) * 100;
                
                // Use the new logging function for debugging
                Glimmer.log("Current HP: " + currentHp + ", Max HP: " + maxHp + ", Health %: " + healthPercent);

                if (healthPercent < 20 && this.lastHealthPercent >= 20) {
                    Glimmer.log("Low health condition met!"); // More logging
                    Glimmer.notify("Low Health Warning!", `Your health is below 20%!`);
                }
                this.lastHealthPercent = healthPercent;
            });
        }
    },

    initialize() {
        // We wait a moment for the game to fully load before we do anything.
        setTimeout(() => {
            if (window.GlimmerNative && window.GlimmerNative.getSettings) {
                // Use the new logging function
                Glimmer.log("Glimmer: Native bridge found! Initializing hooks...");
                const settingsJson = window.GlimmerNative.getSettings();
                this.SettingsManager.load(settingsJson);

                this.TickManager.start();
                Glimmer.log("TickManager started.");

                if (this.SettingsManager.get('glimmer_idleAlert', true)) {
                    this.IdleNotifier.start();
                    Glimmer.log("IdleNotifier started.");
                }
                if (this.SettingsManager.get('glimmer_pmAlert', true)) {
                    this.PMNotifier.start();
                    Glimmer.log("PMNotifier started.");
                }
                if (this.SettingsManager.get('glimmer_healthAlert', true)) {
                    this.HealthNotifier.start();
                    Glimmer.log("HealthNotifier started.");
                }
                Glimmer.log("Glimmer: All enabled hooks initialized!");
            } else {
                // Use the new logging function here too
                Glimmer.log("Glimmer: Could not find native bridge. Features will be disabled.");
            }
        }, 8000);
    }
};

Glimmer.initialize();