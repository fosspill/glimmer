package io.glimmer.client;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class GlimmerNativeBridge {
    Context context;
    SharedPreferences prefs;
    private int notificationId = 1;
    public static final String TAG = "GlimmerNativeBridge";

    GlimmerNativeBridge(Context c) {
        context = c;
        prefs = c.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
    }
    @JavascriptInterface
    public void log(String message) {
        Log.d("GlimmerJS", message);
    }
    @JavascriptInterface
    public void notify(String title, String body) {
        Log.d(TAG, "Notify: " + title + " - " + body);

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
                .setSmallIcon(R.drawable.ic_stat_glimmer)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .build();

        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(notificationId++, notification);
    }


    @JavascriptInterface
    public String getSettings() {
        Map<String, String> settingsMap = new HashMap<>();
        String[] keys = {"glimmer_idleAlert", "glimmer_pmAlert", "glimmer_healthAlert", "glimmer_mapEnabled"};

        for (String key : keys) {
            String value = prefs.getString(key, "true");
            if (value != null) {
                settingsMap.put(key, value);
            }
        }

        JSONObject json = new JSONObject(settingsMap);
        return json.toString();
    }
}