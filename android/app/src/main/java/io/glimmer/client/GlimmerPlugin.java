package io.glimmer.client;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "GlimmerPlugin")
public class GlimmerPlugin extends Plugin {

    @PluginMethod
    public void loadGame(PluginCall call) {
        new Thread(() -> {
            try {
                String serverId = call.getString("serverId");
                String serverUrl = call.getString("serverUrl");

                if (serverUrl == null || serverId == null) {
                    call.reject("serverId and serverUrl must be provided.");
                    return;
                }

                URL url = new URL("https://highspell.com/game");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                conn.setDoOutput(true);

                String submitValue = "World " + serverId;
                String postData = "submit=" + URLEncoder.encode(submitValue, "UTF-8") +
                        "&serverid=" + URLEncoder.encode(serverId, "UTF-8") +
                        "&serverurl=" + URLEncoder.encode(serverUrl, "UTF-8");

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = postData.getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }

                InputStream is = conn.getInputStream();
                BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                    response.append('\n');
                }
                reader.close();

                String finalHtml = response.toString();
                String baseUrl = "https://highspell.com";

                MainActivity activity = (MainActivity) getActivity();
                activity.runOnUiThread(() -> {
                    activity.loadGameWithHtml(finalHtml, baseUrl);
                    call.resolve();
                });

            } catch (Exception e) {
                Log.e("GlimmerPlugin", "Failed to manually load game data.", e);
                call.reject("Failed to load game data.", e);
            }
        }).start();
    }
}