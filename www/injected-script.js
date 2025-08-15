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
        if (!this.settings.glimmer_healthAlert || this.myMaxHealth === null || this.myCurrentHealth === null) {
            return;
        }

        const healthPercent = (this.myCurrentHealth / this.myMaxHealth) * 100;

        if (healthPercent < 20 && !this.isLowHealth) {
            this.notify("Low Health Warning!", `Your health is below 20% (${this.myCurrentHealth}/${this.myMaxHealth})`);
            this.isLowHealth = true;
        } else if (healthPercent >= 20 && this.isLowHealth) {
            this.isLowHealth = false;
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
            this.WorldMap.updatePosition();
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

        switch (actionId) {
            case 1:
                if (payload[0] === this.myEntityId) {
                    this.updateMyLocation(null, payload[1], payload[2]);
                }
                break;

            case 3:
                 if (payload[0] === this.myEntityId) {
                    this.updateMyLocation(payload[7], payload[8], payload[9]);
                }
                break;

            case 8:
                if (payload[1] === this.myEntityId) {
                    const damage = payload[2];
                    this.myCurrentHealth -= damage;
                    glimmerLog(`Took ${damage} damage. Current health: ${this.myCurrentHealth}`);
                    this.checkHealthAlert();
                }
                break;

            case 13:
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

            case 91:
                if (payload[1] === this.myEntityId) {
                    this.myCurrentHealth = payload[2];
                    glimmerLog(`Health restored. Current health: ${this.myCurrentHealth}`);
                    this.checkHealthAlert();
                }
                break;
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
            glimmerLog("[NetworkMonitor] Injecting network interceptors...");

            const OriginalXHR = window.XMLHttpRequest;
            window.XMLHttpRequest = function() {
                const xhr = new OriginalXHR(arguments);
                xhr.addEventListener('load', function () {
                    if (this.responseURL && this.responseURL.includes('socket.io') && typeof this.responseText === 'string') {

                        if (this.responseText.includes('42["16"')) {
                            glimmerLog('>>>>>>>>>> LOGGEDIN PACKET (16) CAPTURED VIA XHR! <<<<<<<<<<');
                            try {
                                const startIndex = this.responseText.indexOf('42[');
                                if (startIndex === -1) return;

                                const messageContent = JSON.parse(this.responseText.substring(startIndex + 2));
                                const loginPayload = messageContent[1];

                                Glimmer.NetworkMonitor.processLogin(loginPayload, "XHR");

                            } catch (e) {
                                glimmerLog('Error parsing LoggedIn packet via XHR: ' + e);
                            }
                        }
                    }
                });
                return xhr;
            };

            const OriginalWebSocket = window.WebSocket;
            window.WebSocket = new Proxy(OriginalWebSocket, {
                construct: (target, args) => {
                    const wsInstance = Reflect.construct(target, args);
                    glimmerLog('[WSMonitor] Connection initiated: ' + wsInstance.url);
                    wsInstance.addEventListener('message', (event) => Glimmer.NetworkMonitor.handleMessage(event));
                    return wsInstance;
                }
            });

            this.isIntercepted = true;
            glimmerLog('[NetworkMonitor] Network interceptors injected successfully.');
        },

        handleMessage: function(event) {
            const data = typeof event.data === 'string' ? event.data : null;

            try {
                if (data && data.startsWith('42')) {
                    const messageContent = JSON.parse(data.substring(2));
                    const actionIdString = messageContent[0];
                    const payload = messageContent[1];

                    if (actionIdString === "16") {
                        glimmerLog('>>>>>>>>>> LOGGEDIN PACKET (16) CAPTURED VIA WS! <<<<<<<<<<');
                        this.processLogin(payload, "WS");
                        return;
                    }

                    if (actionIdString === "0" && Array.isArray(payload)) {
                        payload.forEach(update => {
                            Glimmer.handlePacket(update[0], update[1]);
                        });
                    } else {
                        Glimmer.handlePacket(parseInt(actionIdString, 10), payload);
                    }
                }
            } catch (e) {
                // Suppress errors for non-game packets
            }
        },

        processLogin: function(loginPayload, source) {
            Glimmer.myEntityId = loginPayload[0];
            glimmerLog(`EntityID set to: ${Glimmer.myEntityId} (via ${source})`);

            Glimmer.updateMyLocation(loginPayload[4], loginPayload[5], loginPayload[6]);

            const initialHp = loginPayload[27];
            Glimmer.myMaxHealth = initialHp;
            Glimmer.myCurrentHealth = initialHp;
            glimmerLog(`Health initialized. Max: ${Glimmer.myMaxHealth}, Current: ${Glimmer.myCurrentHealth}`);

            Glimmer.notify("Glimmer Connected", "Now monitoring your session.");
        },

        isIntercepted: false,
    },

    initialize: function() {
        if (window.GlimmerNative && window.GlimmerNative.getSettings) {
            try {
                const settingsJson = window.GlimmerNative.getSettings();
                this.settings = JSON.parse(settingsJson);
                glimmerLog("Settings loaded.");
            } catch (e) {
                glimmerLog("Error parsing settings: " + e.toString());
            }
        }

        this.NetworkMonitor.start();
        this.WorldMap.init();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Glimmer.initialize();
});