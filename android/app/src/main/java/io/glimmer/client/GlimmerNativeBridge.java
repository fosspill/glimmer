package io.glimmer.client;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Map;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

public class GlimmerNativeBridge {
    Context context;
    SharedPreferences prefs;
    private int notificationId = 1;
    public static final String TAG = "GlimmerNativeBridge";

    GlimmerNativeBridge(Context c) {
        context = c;
        // Capacitor Preferences plugin uses this specific storage name by default.
        prefs = c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
    }
    @JavascriptInterface
    public void log(String message) {
        Log.d("GlimmerJS", message);
    }
    @JavascriptInterface
    public void notify(String title, String body) {
        // NOTE: Methods called via JavascriptInterface run on a background thread.
        Log.d(TAG, "Notify: " + title + " - " + body);

        // Create an Intent for the MainActivity
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        } else {
            pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        Notification notification = new NotificationCompat.Builder(context, MainActivity.CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(R.drawable.ic_stat_glimmer) // Make sure you have this drawable
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build();

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId++, notification);
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