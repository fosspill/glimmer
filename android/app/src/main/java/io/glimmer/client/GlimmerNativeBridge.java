// Filename: GlimmerNativeBridge.java
package io.glimmer.client;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.util.Log;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;

public class GlimmerNativeBridge {
    Context context;
    SharedPreferences prefs;
    public static final String TAG = "GlimmerNativeBridge";

    GlimmerNativeBridge(Context c) {
        context = c;
        // Capacitor Preferences plugin uses this specific storage name by default.
        prefs = c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public void notify(String title, String body) {
        // NOTE: Methods called via JavascriptInterface run on a background thread.
        Log.d(TAG, "Notify: " + title + " - " + body);
        
        // TODO: Implement actual Android system notifications here.
        // The ForegroundService is running, but you need logic to display the notification alert.
    }

    @JavascriptInterface
    public String getSettings() {
        // Fetch settings required by the injected script.
        Map<String, String> settingsMap = new HashMap<>();
        // Keys defined in index.html
        String[] keys = {"glimmer_idleAlert", "glimmer_pmAlert", "glimmer_healthAlert"};

        for (String key : keys) {
            // Default to "true" if not found, matching the index.html defaults
            String value = prefs.getString(key, "true");
            if (value != null) {
                settingsMap.put(key, value);
            }
        }

        // Convert the map to a JSON string for the Javascript layer.
        JSONObject json = new JSONObject(settingsMap);
        return json.toString();
    }
}