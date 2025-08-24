const glimmerLog = (message) => {
    if (window.GlimmerNative && window.GlimmerNative.log) {
        window.GlimmerNative.log(message);
    } else {
        console.log("GlimmerJS (fallback):", message);
    }
};

const Glimmer = {
    myEntityId: null,
    myCurrentHealth: null,
    myMaxHealth: null,
    myMapLevel: 1,
    myX: null,
    myY: null,
    idleTimer: null,
    isLowHealth: false,
    settings: {},

    notify: (title, body) => {
        if (window.GlimmerNative && window.GlimmerNative.notify) {
            window.GlimmerNative.notify(title, body);
        } else {
            glimmerLog(`Notification suppressed: ${title} - ${body}`);
        }
    },

    checkHealthAlert: function() {
        const healthAlertEnabled = this.settings && (this.settings.glimmer_healthAlert === "true" || this.settings.glimmer_healthAlert === true);
        
        if (!healthAlertEnabled || this.myMaxHealth === null || this.myCurrentHealth === null) {
            return;
        }

        const healthPercent = (this.myCurrentHealth / this.myMaxHealth) * 100;

        if (healthPercent < 20 && !this.isLowHealth) {
            this.notify("Low Health Warning!", `Your health is below 20% (${this.myCurrentHealth}/${this.myMaxHealth})`);
            this.isLowHealth = true;
            glimmerLog(`Low health alert sent. Health: ${this.myCurrentHealth}/${this.myMaxHealth} (${healthPercent.toFixed(1)}%)`);
        } else if (healthPercent >= 20 && this.isLowHealth) {
            this.isLowHealth = false;
            glimmerLog(`Health recovered above 20%. Health: ${this.myCurrentHealth}/${this.myMaxHealth} (${healthPercent.toFixed(1)}%)`);
        }
    },

    updateMyLocation: function(mapLevel, x, y) {
        let changed = false;
        if (mapLevel !== undefined && mapLevel !== null && this.myMapLevel !== mapLevel) {
            this.myMapLevel = mapLevel;
            changed = true;
            glimmerLog(`MapLevel changed to: ${this.myMapLevel}`);
        }
        if (x !== undefined && x !== null && this.myX !== x) {
            this.myX = x;
            changed = true;
        }
        if (y !== undefined && y !== null && this.myY !== y) {
            this.myY = y;
            changed = true;
        }

        if (changed) {
            glimmerLog(`Position updated: MapLevel=${this.myMapLevel}, X=${this.myX}, Y=${this.myY}`);
            this.WorldMap.updatePosition();
        }
    },

    PacketHandlers: {
        1: function(payload) {
            const actionType = payload[0];
            const actionData = payload[1];
            
            if (actionType === 10) {
                const [x, y] = actionData;
                this.updateMyLocation(null, x, y);
                glimmerLog(`Movement action: X=${x}, Y=${y}`);
            } else if (actionType === 16) {
                const entityId = actionData[0];
                glimmerLog(`Idle action detected for entity ${entityId}, myEntityId: ${this.myEntityId}`);
                if (entityId === this.myEntityId) {
                    const idleAlertEnabled = this.settings && (this.settings.glimmer_idleAlert === "true" || this.settings.glimmer_idleAlert === true);
                    glimmerLog(`Idle alert enabled: ${idleAlertEnabled}`);
                    
                    if (idleAlertEnabled) {
                        glimmerLog('Player entered idle state. Starting 30-second timer...');
                        if (!this.idleTimer) {
                            this.idleTimer = setTimeout(() => {
                                this.notify("Glimmer: AFK Alert!", "You have been idle for 30 seconds.");
                                this.idleTimer = null;
                                glimmerLog('Idle alert notification sent.');
                            }, 30000);
                            glimmerLog('Idle timer started (30 seconds).');
                        } else {
                            glimmerLog('Idle timer already running, not starting new one.');
                        }
                    }
                }
            }
        },

        3: function(payload) {
            if (payload[0] === this.myEntityId) {
                const mapLevel = payload[7];
                const x = payload[8];
                const y = payload[9];
                const maxHitpoints = payload[5];
                const currentHitpoints = payload[6];
                
                this.updateMyLocation(mapLevel, x, y);
                
                if (maxHitpoints !== undefined && maxHitpoints !== null) {
                    this.myMaxHealth = maxHitpoints;
                }
                if (currentHitpoints !== undefined && currentHitpoints !== null) {
                    this.myCurrentHealth = currentHitpoints;
                    this.checkHealthAlert();
                }
            }
        },

        8: function(payload) {
            if (payload[1] === this.myEntityId) {
                const damage = payload[2];
                this.myCurrentHealth -= damage;
                glimmerLog(`Took ${damage} damage. Current health: ${this.myCurrentHealth}`);
                this.checkHealthAlert();
            }
        },


        91: function(payload) {
            if (payload[1] === this.myEntityId) {
                this.myCurrentHealth = payload[2];
                glimmerLog(`Health restored. Current health: ${this.myCurrentHealth}`);
                this.checkHealthAlert();
            }
        }
    },

    handlePacket: function(actionId, payload) {
        if (payload && payload[0] === this.myEntityId && actionId !== 13) {
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
                glimmerLog('Player activity detected, idle timer cleared.');
            }
        }

        const handler = this.PacketHandlers[actionId];
        if (handler) {
            handler.call(this, payload);
        }
    },

    WorldMap: {
        mapWindow: null,
        mapEmbed: null,

        init: function() {
            if (!Glimmer.settings.glimmer_mapEnabled || Glimmer.settings.glimmer_mapEnabled !== "true") {
                return;
            }

            if (typeof interact === 'undefined') {
                glimmerLog("[WorldMap] Error: interact.js not loaded. Map functionality disabled.");
                return;
            }

            this.setupInteractOverlay();
            this.setupInteractListeners();
            this.createToggleButton();
            glimmerLog("[WorldMap] Initialized.");
        },

        setupInteractOverlay: function() {
            const overlay = document.createElement('div');
            overlay.id = 'interact-iframe-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.zIndex = '9999';
            overlay.style.cursor = 'default';
            overlay.style.display = 'none';
            document.body.appendChild(overlay);
        },

        setupInteractListeners: function() {
            interact('.highlite-map')
                .draggable({
                    allowFrom: '.map-title-bar',
                    listeners: {
                        start(event) {
                            document.getElementById('interact-iframe-overlay').style.display = 'block';
                        },
                        move(event) {
                            const target = event.target;
                            const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                            const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                            target.style.transform = `translate(${x}px, ${y}px)`;
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);
                        },
                        end(event) {
                            document.getElementById('interact-iframe-overlay').style.display = 'none';
                        },
                    },
                })
                .resizable({
                    edges: { left: true, right: true, bottom: true, top: true },
                    listeners: {
                        start(event) {
                            document.getElementById('interact-iframe-overlay').style.display = 'block';
                        },
                        move(event) {
                            const target = event.target;

                            let x = parseFloat(target.getAttribute('data-x')) || 0;
                            let y = parseFloat(target.getAttribute('data-y')) || 0;

                            target.style.width = `${event.rect.width}px`;
                            target.style.height = `${event.rect.height}px`;

                            x += event.deltaRect.left;
                            y += event.deltaRect.top;

                            target.style.transform = `translate(${x}px, ${y}px)`;
                            target.setAttribute('data-x', x);
                            target.setAttribute('data-y', y);
                        },
                        end(event) {
                            document.getElementById('interact-iframe-overlay').style.display = 'none';
                        },
                    },
                });

            document.addEventListener('mouseup', () => {
                if (typeof interact !== 'undefined') interact.stop();
            });

            document.addEventListener('touchend', () => {
                if (typeof interact !== 'undefined') interact.stop();
            });
        },

        createToggleButton: function() {
            const button = document.createElement('button');
            button.textContent = '🗺️';
            button.style.position = 'fixed';
            
            button.style.top = '50%';
            button.style.left = '20px';
            button.style.transform = 'translateY(-50%)';

            button.style.zIndex = '1001';
            button.style.fontSize = '24px';
            button.style.width = '50px';
            button.style.height = '50px';
            button.style.padding = '0';
            button.style.backgroundColor = 'rgba(30, 30, 30, 0.8)';
            button.style.border = '1px solid #555';
            button.style.borderRadius = '50%';
            button.style.cursor = 'pointer';
            button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';

            button.onclick = () => {
                this.toggleMap();
            };
            document.body.appendChild(button);
        },

        toggleMap: function() {
            if (this.mapWindow) {
                if (this.mapWindow.style.visibility == 'hidden') {
                    this.mapWindow.style.visibility = 'visible';
                    this.updatePosition();
                } else {
                    this.mapWindow.style.visibility = 'hidden';
                }
                return;
            }

            this.createMapWindow();
        },

        createMapWindow: function() {
            this.mapWindow = document.createElement('div');
            this.mapWindow.classList.add('highlite-map');
            this.mapWindow.style.position = 'fixed';
            this.mapWindow.style.top = 'calc(50vh - 200px)';
            this.mapWindow.style.left = 'calc(50vw - 200px)';
            this.mapWindow.style.width = '400px';
            this.mapWindow.style.height = '400px';
            this.mapWindow.style.zIndex = '1000';
            this.mapWindow.style.display = 'flex';
            this.mapWindow.style.flexDirection = 'column';
            this.mapWindow.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            this.mapWindow.style.visibility = 'visible';
            this.mapWindow.style.borderRadius = '10px';
            this.mapWindow.style.background = 'rgba(16, 16, 16, 0.8)';
            this.mapWindow.style.backdropFilter = 'blur(5px)';
            this.mapWindow.style.resize = 'none';
            this.mapWindow.style.overflow = 'hidden';
            this.mapWindow.style.userSelect = 'none';
            this.mapWindow.style.touchAction = 'none';

            document.body.appendChild(this.mapWindow);

            const titleDiv = document.createElement('div');
            titleDiv.classList.add('map-title-bar');
            titleDiv.style.display = 'flex';
            titleDiv.style.width = '100%';
            titleDiv.style.padding = '10px';
            titleDiv.style.justifyContent = 'space-between';
            titleDiv.style.alignItems = 'center';
            titleDiv.style.cursor = 'move';
            titleDiv.style.boxSizing = 'border-box';
            this.mapWindow.appendChild(titleDiv);

            const titleText = document.createElement('span');
            titleText.textContent = 'World Map';
            titleText.style.fontFamily = 'Inter, sans-serif';
            titleText.style.color = 'white';
            titleDiv.appendChild(titleText);

            const closeButton = document.createElement('div');
            closeButton.style.background = 'red';
            closeButton.style.color = 'white';
            closeButton.style.height = '20px';
            closeButton.style.width = '20px';
            closeButton.style.display = 'flex';
            closeButton.style.alignItems = 'center';
            closeButton.style.justifyContent = 'center';
            closeButton.style.borderRadius = '5px';
            closeButton.style.cursor = 'pointer';
            closeButton.textContent = '✕';
            closeButton.onclick = (e) => {
                e.stopPropagation();
                if (this.mapWindow) {
                     this.mapWindow.style.visibility = 'hidden';
                }
            };
            titleDiv.appendChild(closeButton);

            const embed = document.createElement('iframe');
            embed.src = `https://www.highlite.dev/map?hide_decor=true&highliteMapPlugin=true`;
            embed.style.width = '100%';
            embed.style.height = '100%';
            embed.style.border = 'none';
            embed.style.borderRadius = '0 0 10px 10px';
            embed.style.flexGrow = '1';
            this.mapWindow.appendChild(embed);
            this.mapEmbed = embed;

            embed.onload = () => {
                this.updatePosition();
            };
        },

        updatePosition: function() {
            if (!this.mapEmbed || !this.mapEmbed.contentWindow || Glimmer.myX === null || Glimmer.myY === null) {
                return;
            }

            const mapLevelText = Glimmer.myMapLevel == 1 ? 'Overworld' : Glimmer.myMapLevel == 0 ? 'Underworld' : 'Sky';

            this.mapEmbed.contentWindow.postMessage(
                {
                    X: Glimmer.myX + 512,
                    Y: Glimmer.myY + 512,
                    lvl: mapLevelText,
                },
                'https://www.highlite.dev'
            );
        }
    },

    NetworkMonitor: {        
        start: function() {
            if (this.isIntercepted) return;
            
            // Set up Socket.IO interception with multiple strategies
            let ioIntercepted = false;
            
            // Socket.IO interception strategies (kept for potential future use)
            // The WebSocket interception above handles the actual connections

            const OriginalXHR = window.XMLHttpRequest;
            window.XMLHttpRequest = function() {
                const xhr = new OriginalXHR(arguments);
                xhr.addEventListener('load', function () {
                    if (this.responseURL && this.responseURL.includes('socket.io') && typeof this.responseText === 'string') {
                        
                        // Log all Socket.IO polling responses for debugging
                        if (this.responseText.includes('42[')) {
                            glimmerLog('[XHR] Socket.IO polling response: ' + this.responseText.substring(0, 200));
                        }

                        // Process all game packets via unified message router
                        try {
                            const messages = this.responseText.split('\n');
                            for (const message of messages) {
                                if (message.startsWith('42[')) {
                                    glimmerLog('[XHR] Processing packet via polling: ' + message.substring(0, 50));
                                    
                                    // Extract just the JSON part for processing
                                    const jsonPart = message.substring(2); // Remove "42" prefix
                                    try {
                                        const messageContent = JSON.parse(jsonPart);
                                        const actionIdString = messageContent[0];
                                        const payload = messageContent[1];

                                        if (actionIdString === "15") {
                                            glimmerLog(`>>>>>>>>>> LOGGEDIN PACKET (15) CAPTURED VIA XHR! <<<<<<<<<<`);
                                            Glimmer.NetworkMonitor.processLogin(payload, "XHR");
                                        } else if (actionIdString === "pm") {
                                            Glimmer.NetworkMonitor.handlePM(payload);
                                        } else if (actionIdString === "0" && Array.isArray(payload)) {
                                            payload.forEach(update => {
                                                Glimmer.handlePacket(update[0], update[1]);
                                            });
                                        } else {
                                            Glimmer.handlePacket(parseInt(actionIdString, 10), payload);
                                        }
                                    } catch (parseError) {
                                        // Ignore parsing errors for non-game messages
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore parsing errors for non-game messages
                        }
                    }
                });
                return xhr;
            };


            this.isIntercepted = true;
        },



        handlePM: function(pmData) {
            // Check if PM alerts are enabled
            const pmAlertEnabled = Glimmer.settings && (Glimmer.settings.glimmer_pmAlert === "true" || Glimmer.settings.glimmer_pmAlert === true);
            
            if (!pmAlertEnabled) {
                return;
            }

            try {
                // PM format: {"type":0,"from":"username","msg":"message"}
                if (pmData && pmData.from && pmData.msg) {
                    const fromUser = pmData.from;
                    const message = pmData.msg;
                    
                    // Truncate long messages for notification
                    const truncatedMsg = message.length > 50 ? message.substring(0, 50) + "..." : message;
                    
                    Glimmer.notify(`PM from ${fromUser}`, truncatedMsg);
                    glimmerLog(`PM received from ${fromUser}: ${message}`);
                }
            } catch (e) {
                glimmerLog('Error processing PM: ' + e.toString());
            }
        },

        processLogin: function(loginPayload, source) {
            Glimmer.myEntityId = loginPayload[0];
            glimmerLog(`EntityID set to: ${Glimmer.myEntityId} (via ${source})`);

            Glimmer.updateMyLocation(loginPayload[4], loginPayload[5], loginPayload[6]);

            const hpLevel = loginPayload[48];
            glimmerLog(`HP extraction debug - Position 48 value: ${hpLevel}, Type: ${typeof hpLevel}`);
            if (hpLevel && typeof hpLevel === 'number' && hpLevel > 0) {
                Glimmer.myMaxHealth = hpLevel;
                Glimmer.myCurrentHealth = hpLevel;
                glimmerLog(`Health initialized. Max: ${Glimmer.myMaxHealth}, Current: ${Glimmer.myCurrentHealth}`);
            } else {
                glimmerLog(`Failed to extract HP from position 48. Searching in payload...`);
                for (let i = 40; i < 60; i++) {
                    if (typeof loginPayload[i] === 'number' && loginPayload[i] >= 10 && loginPayload[i] <= 100) {
                        glimmerLog(`Found potential HP at position ${i}: ${loginPayload[i]}`);
                        // Use the first reasonable HP value found
                        Glimmer.myMaxHealth = loginPayload[i];
                        Glimmer.myCurrentHealth = loginPayload[i];
                        glimmerLog(`Health initialized from position ${i}. Max: ${Glimmer.myMaxHealth}, Current: ${Glimmer.myCurrentHealth}`);
                        break;
                    }
                }
            }

            Glimmer.notify("Glimmer Connected", "Now monitoring your session.");
        },

        isIntercepted: false,
    },

    initialize: function() {
        // Initialize with default settings to prevent undefined checks
        this.settings = {
            glimmer_idleAlert: "true",
            glimmer_pmAlert: "true", 
            glimmer_healthAlert: "true",
            glimmer_mapEnabled: "true"
        };
        
        if (window.GlimmerNative && window.GlimmerNative.getSettings) {
            try {
                const settingsJson = window.GlimmerNative.getSettings();
                const loadedSettings = JSON.parse(settingsJson);
                // Merge loaded settings with defaults
                this.settings = { ...this.settings, ...loadedSettings };
                glimmerLog("Settings loaded: " + JSON.stringify(this.settings));
            } catch (e) {
                glimmerLog("Error parsing settings, using defaults: " + e.toString());
            }
        } else {
            glimmerLog("GlimmerNative bridge not available, using default settings.");
        }

        this.NetworkMonitor.start();
        this.WorldMap.init();
        
        // Check for early login data captured before Glimmer was ready
        if (window.glimmerEarlyLogin) {
            glimmerLog('Processing early login data from initialization');
            this.NetworkMonitor.processLogin(window.glimmerEarlyLogin.payload, window.glimmerEarlyLogin.source);
            delete window.glimmerEarlyLogin;
        }
    }
};

// Start monitoring immediately, before DOM is loaded

// Ultra-early WebSocket and Socket.IO interception
const originalWebSocket = window.WebSocket;
window.WebSocket = new Proxy(originalWebSocket, {
    construct: (target, args) => {
        // WebSocket connection initiated
        
        try {
            const wsInstance = Reflect.construct(target, args);
            
            wsInstance.addEventListener('open', (event) => {
                glimmerLog('WebSocket connection established to: ' + args[0]);
            });
            
            wsInstance.addEventListener('close', (event) => {
                glimmerLog('WebSocket connection closed: ' + event.code);
            });
            
            wsInstance.addEventListener('error', (event) => {
                glimmerLog('WebSocket connection error');
            });
            
            // Intercept outgoing messages (type "1" packets)
            const originalSend = wsInstance.send;
            wsInstance.send = function(data) {
                if (typeof data === 'string' && data.startsWith('42[')) {
                    glimmerLog('[WS-OUT] Sending packet: ' + data.substring(0, 50));
                    
                    try {
                        const jsonPart = data.substring(2);
                        const messageContent = JSON.parse(jsonPart);
                        const actionIdString = messageContent[0];
                        const payload = messageContent[1];

                        if (actionIdString === "1" && Array.isArray(payload) && payload.length >= 2 && Glimmer?.handlePacket) {
                            // Type "1" outgoing packets: [actionType, actionData]
                            glimmerLog(`[WS-OUT] Type 1 action ${payload[0]} detected`);
                            Glimmer.handlePacket(payload[0], payload[1]);
                        }
                    } catch (parseError) {
                        // Ignore parsing errors
                    }
                }
                
                return originalSend.call(this, data);
            };
            
            wsInstance.addEventListener('message', (event) => {
                const data = typeof event.data === 'string' ? event.data : null;
                
                if (data && data.startsWith('42[')) {
                    glimmerLog('[WS-IN] Processing packet: ' + data.substring(0, 50));
                    
                    // Process immediately - don't wait for Glimmer to be ready
                    const jsonPart = data.substring(2); // Remove "42" prefix
                    try {
                        const messageContent = JSON.parse(jsonPart);
                        const actionIdString = messageContent[0];
                        const payload = messageContent[1];

                        if (actionIdString === "15") {
                            glimmerLog(`>>>>>>>>>> LOGGEDIN PACKET (15) CAPTURED VIA WS! <<<<<<<<<<`);
                            // Store login data globally for when Glimmer is ready
                            window.glimmerEarlyLogin = { payload, source: "WS" };
                            
                            // Try immediate processing if Glimmer exists
                            if (Glimmer && Glimmer.NetworkMonitor) {
                                Glimmer.NetworkMonitor.processLogin(payload, "WS");
                            }
                        } else if (actionIdString === "pm" && Glimmer?.NetworkMonitor) {
                            Glimmer.NetworkMonitor.handlePM(payload);
                        } else if (actionIdString === "0" && Array.isArray(payload) && Glimmer?.handlePacket) {
                            payload.forEach(update => {
                                Glimmer.handlePacket(update[0], update[1]);
                            });
                        } else if (actionIdString === "1" && Array.isArray(payload) && payload.length >= 2 && Glimmer?.handlePacket) {
                            // Type "1" packets: [actionType, actionData] - extract the real action
                            Glimmer.handlePacket(payload[0], payload[1]);
                        } else if (Glimmer?.handlePacket) {
                            Glimmer.handlePacket(parseInt(actionIdString, 10), payload);
                        }
                    } catch (parseError) {
                        glimmerLog('WS parse error: ' + parseError.message);
                    }
                }
            });
            
            return wsInstance;
        } catch (error) {
            glimmerLog('WebSocket construction failed: ' + error.toString());
            throw error;
        }
    }
});

// Early Socket.IO interception with MutationObserver for script loading
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'SCRIPT' && (node.src || node.textContent)) {
                if ((node.src && node.src.includes('socket.io')) || 
                    (node.textContent && node.textContent.includes('socket.io'))) {
                    glimmerLog('[EARLY-Monitor] Socket.IO script detected!');
                    
                    // Try immediate interception
                    setTimeout(() => {
                        if (window.io) {
                            glimmerLog('[EARLY-Monitor] Socket.IO available after script load');
                            const originalIO = window.io;
                            window.io = function(url, opts) {
                                opts = opts || {};
                                opts.transports = ['websocket', 'polling'];
                                glimmerLog("[EARLY-Monitor] Socket.IO forced transports: " + JSON.stringify(opts.transports));
                                return originalIO(url, opts);
                            };
                        }
                    }, 10);
                }
            }
        });
    });
});

observer.observe(document, { childList: true, subtree: true });

document.addEventListener("DOMContentLoaded", () => {
    Glimmer.initialize();
});