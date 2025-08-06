package io.glimmer.client;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugins(
                new ArrayList<>() {
                    {
                        add(GlimmerPlugin.class);
                    }
                }
        );

        super.onCreate(savedInstanceState);
        createNotificationChannel();
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

            // Inject the script just before the closing body tag
            String modifiedHtml = html.replace("</body>", "<script type=\"text/javascript\">" + scriptContent + "</script></body>");

            WebView webView = getBridge().getWebView();
            webView.loadDataWithBaseURL(baseUrl, modifiedHtml, "text/html", "UTF-8", null);
            Log.d(TAG, "Successfully loaded modified HTML into WebView.");

        } catch (IOException e) {
            Log.e(TAG, "Failed to read or inject script.", e);
        }
    }

    private void startForegroundService() {
        Intent serviceIntent = new Intent(this, ForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
    private void stopForegroundService() {
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
        startForegroundService();
    }
    @Override
    public void onResume() {
        super.onResume();
        stopForegroundService();
    }
}