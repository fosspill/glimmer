package io.glimmer.client;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    public static final String CHANNEL_ID = "GlimmerServiceChannel";
    public static final String TAG = "GlimmerMainActivity";
    private static final String PREFS_NAME = "CapacitorStorage";
    private PowerManager.WakeLock wakeLock;
    private static final long WAKELOCK_TIMEOUT = 20 * 60 * 1000L;
    private ActivityResultLauncher<String> requestPermissionLauncher;
    private boolean isServiceRunning = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("GlimmerMainActivity", "Attempting to register GlimmerPlugin...");
        registerPlugin(GlimmerPlugin.class);
        Log.d("GlimmerMainActivity", "GlimmerPlugin registration call completed.");
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

        requestPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                isGranted -> {
                    if (isGranted) {
                        Log.d(TAG, "Notification permission granted.");
                        notifyJSPermissionResult(true);
                    } else {
                        Log.d(TAG, "Notification permission denied.");
                        notifyJSPermissionResult(false);
                    }
                });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    private String getScriptContent(String fileName) throws IOException {
        try (InputStream inputStream = getAssets().open("public/" + fileName)) {
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
            String interactJsContent = getScriptContent("interact.min.js");
            String glimmerScriptContent = getScriptContent("injected-script.js");

            String combinedScripts = interactJsContent + "\n" + glimmerScriptContent;

            String scriptTag = "<script type=\"text/javascript\">" + combinedScripts + "</script>";
            String injections = scriptTag;

            String modifiedHtml = html;
            Log.d(TAG, "Preparing HTML injection.");

            int headIndex = html.toLowerCase().indexOf("<head>");

            if (headIndex != -1) {
                int injectionIndex = headIndex + "<head>".length();
                modifiedHtml = html.substring(0, injectionIndex) + injections + html.substring(injectionIndex);
                Log.d(TAG, "Injected scripts into <head>.");
            } else {
                Log.w(TAG, "Could not find <head> tag. Injecting before </body>. WebSocket interception might fail.");
                modifiedHtml = html.replace("</body>", injections + "</body>");
            }

            WebView webView = getBridge().getWebView();
            webView.getSettings().setDomStorageEnabled(true);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // Enable WebSocket support
            webView.getSettings().setAllowContentAccess(true);
            webView.getSettings().setAllowFileAccess(true);
            webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
            webView.getSettings().setAllowFileAccessFromFileURLs(true);
            
            // Leave default WebView User-Agent
            
            Log.d(TAG, "WebView configured with WebSocket support settings");
            webView.loadDataWithBaseURL(baseUrl, modifiedHtml, "text/html", "UTF-8", null);
            Log.d(TAG, "Successfully loaded modified HTML into WebView.");

        } catch (IOException e) {
            Log.e(TAG, "Failed to read or inject script.", e);
        }
    }


    private boolean shouldServiceRun() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String runInBackground = prefs.getString("glimmer_runInBackground", "true");
        return "true".equals(runInBackground);
    }

    private void startForegroundService() {
        if (isServiceRunning) {
            Log.d(TAG, "Service is already running, skipping start");
            return;
        }
        
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(WAKELOCK_TIMEOUT);
            }
            Intent serviceIntent = new Intent(this, ForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Log.d(TAG, "Starting foreground service for Android O+");
                startForegroundService(serviceIntent);
            } else {
                Log.d(TAG, "Starting service for pre-Android O");
                startService(serviceIntent);
            }
            isServiceRunning = true;
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service", e);
            isServiceRunning = false;
        }
    }

    private void stopForegroundService() {
        if (!isServiceRunning) {
            Log.d(TAG, "Service is not running, skipping stop");
            return;
        }
        
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
            Intent serviceIntent = new Intent(this, ForegroundService.class);
            Log.d(TAG, "Stopping foreground service");
            stopService(serviceIntent);
            isServiceRunning = false;
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop foreground service", e);
        }
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
        if (shouldServiceRun()) {
            startForegroundService();
        } else {
            stopForegroundService();
        }
    }

    public void requestNotificationPermissionFromJS() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            } else {
                notifyJSPermissionResult(true);
            }
        } else {
            notifyJSPermissionResult(true);
        }
    }

    private void notifyJSPermissionResult(boolean granted) {
        WebView webView = getBridge().getWebView();
        String jsCallback = String.format("if (window.handlePermissionResult) { window.handlePermissionResult(%b); }", granted);
        webView.post(() -> webView.evaluateJavascript(jsCallback, null));
    }

    @Override
    public void onResume() {
        super.onResume();
        stopForegroundService();
    }
}