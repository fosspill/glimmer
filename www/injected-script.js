// A simple logging function that sends messages to the native side
const glimmerLog = (message) => {
    if (window.GlimmerNative && window.GlimmerNative.log) {
        window.GlimmerNative.log(message);
    } else {
        console.log("GlimmerJS (fallback):", message);
    }
};

const Glimmer = {
    // --- State Properties ---
    myEntityId: null,
    myCurrentHealth: null,
    myMaxHealth: null,
    idleTimer: null,
    isLowHealth: false, // Spam prevention flag
    settings: {},

    // Send a notification using the native bridge
    notify: (title, body) => {
        if (window.GlimmerNative && window.GlimmerNative.notify) {
            window.GlimmerNative.notify(title, body);
        } else {
            glimmerLog(`Notification suppressed: ${title} - ${body}`);
        }
    },

    // --- NEW: Health Alert Logic ---
    checkHealthAlert: function() {
        if (!this.settings.glimmer_healthAlert || this.myMaxHealth === null || this.myCurrentHealth === null) {
            return;
        }

        const healthPercent = (this.myCurrentHealth / this.myMaxHealth) * 100;

        if (healthPercent < 20 && !this.isLowHealth) {
            this.notify("Low Health Warning!", `Your health is below 20% (${this.myCurrentHealth}/${this.myMaxHealth})`);
            this.isLowHealth = true; // Set flag to avoid spam
        } else if (healthPercent >= 20 && this.isLowHealth) {
            this.isLowHealth = false; // Reset flag when health is restored
        }
    },

    // --- Central Packet Handler ---
    handlePacket: function(actionId, payload) {
        // Any real action from our player should cancel the idle timer.
        if (payload && payload[0] === this.myEntityId && actionId !== 13) {
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
                glimmerLog('Player activity detected, idle timer cleared.');
            }
        }

        switch (actionId) {
            case 8: // ShowDamage: [SenderEntityID, ReceiverEntityID, DamageAmount]
                if (payload[1] === this.myEntityId) {
                    const damage = payload[2];
                    this.myCurrentHealth -= damage;
                    glimmerLog(`Took ${damage} damage. Current health: ${this.myCurrentHealth}`);
                    this.checkHealthAlert();
                }
                break;

            case 13: // EnteredIdleState: [EntityID, EntityType]
                if (this.settings.glimmer_idleAlert && payload[0] === this.myEntityId) {
                    glimmerLog('Player entered idle state. Starting 30-second timer...');
                    if (!this.idleTimer) {
                        this.idleTimer = setTimeout(() => {
                            this.notify("Glimmer: AFK Alert!", "You have been idle for 30 seconds.");
                            this.idleTimer = null;
                        }, 30000);
                    }
                }
                break;
            
            case 91: // HealthRestored: [EntityType, EntityID, CurrentHealth]
                if (payload[1] === this.myEntityId) {
                    this.myCurrentHealth = payload[2];
                    glimmerLog(`Health restored. Current health: ${this.myCurrentHealth}`);
                    this.checkHealthAlert();
                }
                break;
        }
    },

    // --- Network Monitoring Module ---
    NetworkMonitor: {
        start: function() {
            if (this.isIntercepted) return;
            glimmerLog("[NetworkMonitor] Injecting network interceptors...");

            // --- XHR Interceptor (for polling and login) ---
            const OriginalXHR = window.XMLHttpRequest;
            window.XMLHttpRequest = function() {
                const xhr = new OriginalXHR(arguments);
                xhr.addEventListener('load', function () {
                    if (this.responseURL && this.responseURL.includes('socket.io') && typeof this.responseText === 'string') {
                        glimmerLog('[XHRMonitor] Captured response from: ' + this.responseURL);
                        
                        if (this.responseText.includes('42["16"')) {
                            glimmerLog('>>>>>>>>>> LOGGEDIN PACKET CAPTURED VIA XHR! <<<<<<<<<<');
                            try {
                                const data = JSON.parse(this.responseText.substring(2));
                                const loginPayload = data[1];
                                
                                // Set Entity ID
                                Glimmer.myEntityId = loginPayload[0];
                                glimmerLog('Success! Your EntityID is now set to: ' + Glimmer.myEntityId);

                                // Set Initial Health from HitpointsCurrLvl (index 27)
                                const initialHp = loginPayload[27];
                                Glimmer.myMaxHealth = initialHp;
                                Glimmer.myCurrentHealth = initialHp;
                                glimmerLog(`Health initialized. Max: ${Glimmer.myMaxHealth}, Current: ${Glimmer.myCurrentHealth}`);
                                
                                Glimmer.notify("Glimmer Connected", "Now monitoring your session.");
                            } catch (e) {
                                glimmerLog('Error parsing LoggedIn packet: ' + e);
                            }
                        }
                    }
                });
                return xhr;
            };

            // --- WebSocket Interceptor (for live game events) ---
            const OriginalWebSocket = window.WebSocket;
            window.WebSocket = new Proxy(OriginalWebSocket, {
                construct: (target, args) => {
                    const wsInstance = Reflect.construct(target, args);
                    glimmerLog('[WSMonitor] Connection initiated: ' + wsInstance.url);
                    wsInstance.addEventListener('message', (event) => Glimmer.NetworkMonitor.handleMessage(event));
                    wsInstance.addEventListener('open', () => glimmerLog('[WSMonitor] Connection opened'));
                    wsInstance.addEventListener('close', (e) => glimmerLog(`[WSMonitor] Connection closed. Code: ${e.code}, Reason: ${e.reason}`));
                    const originalSend = wsInstance.send;
                    wsInstance.send = function(data) {
                        glimmerLog('[WSMonitor] Sent: ' + (typeof data === 'string' ? data : '[Binary Data]'));
                        return originalSend.apply(this, arguments);
                    };
                    return wsInstance;
                }
            });

            this.isIntercepted = true; 
            glimmerLog('[NetworkMonitor] Network interceptors injected successfully.');
        },

        handleMessage: function(event) {
            const data = typeof event.data === 'string' ? event.data : '[Binary Data]';
            glimmerLog('[WSMonitor] Received Raw: ' + data);
            
            try {
                if (typeof data === 'string' && data.startsWith('42')) {
                    const messageContent = JSON.parse(data.substring(2));
                    const actionIdString = messageContent[0];
                    const payload = messageContent[1];

                    // Handle batched updates (ID "0")
                    if (actionIdString === "0" && Array.isArray(payload)) {
                        payload.forEach(update => {
                            Glimmer.handlePacket(update[0], update[1]);
                        });
                    } else {
                        // Handle single events
                        Glimmer.handlePacket(parseInt(actionIdString, 10), payload);
                    }
                }
            } catch (e) {
                // Ignore parsing errors, we already logged the raw data
            }
        },
        isIntercepted: false,
    },

    // --- Main Initialization ---
    initialize: function() {
        this.NetworkMonitor.start();

        // Load settings from native
        if (window.GlimmerNative && window.GlimmerNative.getSettings) {
            try {
                const settingsJson = window.GlimmerNative.getSettings();
                this.settings = JSON.parse(settingsJson);
                glimmerLog("Settings loaded: " + settingsJson);
            } catch (e) {
                glimmerLog("Error parsing settings: " + e.toString());
            }
        }
    }
};

Glimmer.initialize();