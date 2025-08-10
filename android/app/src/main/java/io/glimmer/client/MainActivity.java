package io.glimmer.client;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.Context;
import android.os.PowerManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

    public static final String CHANNEL_ID = "GlimmerServiceChannel";
    public static final String TAG = "GlimmerMainActivity";
    private static final String PREFS_NAME = "CapacitorStorage";
    private PowerManager.WakeLock wakeLock;
    private static final long WAKELOCK_TIMEOUT = 20 * 60 * 1000L;

    @Override
    public void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);
        createNotificationChannel();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,
                    "Glimmer::BackgroundWakeLock");
        }
        WebView webView = getBridge().getWebView();
        GlimmerNativeBridge nativeBridge = new GlimmerNativeBridge(this);
        webView.addJavascriptInterface(nativeBridge, "GlimmerNative");

    }

    private String getScriptContent() throws IOException {
        try (InputStream inputStream = getAssets().open("public/injected-script.js")) {
            ByteArrayOutputStream result = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            while ((length = inputStream.read(buffer)) != -1) {
                result.write(buffer, 0, length);
            }
            return result.toString("UTF-8");
        }
    }

    public void loadGameWithHtml(String html, String baseUrl) {
        try {
            String scriptContent = getScriptContent();
            String scriptTag = "<script type=\"text/javascript\">" + scriptContent + "</script>";
            String modifiedHtml = html;
            Log.d(TAG, "Loaded HTML into WebView.");

            int headIndex = html.toLowerCase().indexOf("<head>");

            if (headIndex != -1) {
                int injectionIndex = headIndex + "<head>".length();
                modifiedHtml = html.substring(0, injectionIndex) + scriptTag + html.substring(injectionIndex);
                Log.d(TAG, "Injected script into <head>.");
            } else {
                Log.w(TAG, "Could not find <head> tag. Injecting before </body>. WebSocket interception might fail.");
                modifiedHtml = html.replace("</body>", scriptTag + "</body>");
            }

            WebView webView = getBridge().getWebView();
            webView.loadDataWithBaseURL(baseUrl, modifiedHtml, "text/html", "UTF-8", null);
            Log.d(TAG, "Successfully loaded modified HTML into WebView.");

        } catch (IOException e) {
            Log.e(TAG, "Failed to read or inject script.", e);
        }
    }


    private boolean shouldServiceRun() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Only check the "Run in Background" setting.
        // Default to "true" to match the index.html initial state.
        String runInBackground = prefs.getString("glimmer_runInBackground", "true");

        if (!"true".equals(runInBackground)) {
            Log.d(TAG, "Run in Background is disabled. Service will not start.");
            return false;
        }

        // If we reach here, the setting is enabled. The previous checks for specific alerts are removed.
        return true;
    }

    // --- UPDATED: startForegroundService with Timeout ---
    private void startForegroundService() {
        // Acquire WakeLock to keep CPU active and prevent WebView throttling
        if (wakeLock != null && !wakeLock.isHeld()) {
            // Acquire the wakelock with a timeout. It will be released in onResume or after the timeout.
            wakeLock.acquire(WAKELOCK_TIMEOUT);
            Log.d(TAG, "WakeLock acquired with a 20-minute timeout.");
        }

        Intent serviceIntent = new Intent(this, ForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    private void stopForegroundService() {
        // Release WakeLock
        // Check isHeld() before releasing, as the timeout might have already released it.
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock released.");
        }

        Intent serviceIntent = new Intent(this, ForegroundService.class);
        stopService(serviceIntent);
    }
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Glimmer Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
    @Override
    public void onPause() {
        super.onPause();
        // Only start the service if the preferences dictate it
        if (shouldServiceRun()) {
            Log.d(TAG, "App paused and conditions met. Starting foreground service.");
            startForegroundService();
        } else {
            Log.d(TAG, "App paused but conditions not met. Ensuring service is stopped.");
            // Ensure service/wakelock is stopped if settings do not permit running
            stopForegroundService();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Always stop the service and release wakelock when the app is active
        Log.d(TAG, "App resumed. Stopping foreground service.");
        stopForegroundService();
    }
}