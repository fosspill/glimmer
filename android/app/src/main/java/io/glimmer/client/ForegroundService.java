package io.glimmer.client;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class ForegroundService extends Service {

    private static final String TAG = "GlimmerForegroundService";
    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "GlimmerServiceChannel";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "ForegroundService onCreate() called");
        createNotificationChannel();
        startForegroundImmediately();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "ForegroundService onStartCommand() called with startId: " + startId);
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Glimmer Background Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Keeps Glimmer running in the background");
            serviceChannel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                Log.d(TAG, "Notification channel created successfully");
            } else {
                Log.e(TAG, "NotificationManager is null");
            }
        }
    }

    private void startForegroundImmediately() {
        try {
            Intent notificationIntent = new Intent(this, MainActivity.class);
            notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            PendingIntent pendingIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, 
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            } else {
                pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, 
                    PendingIntent.FLAG_UPDATE_CURRENT);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Glimmer")
                    .setContentText("Keeping your game connected")
                    .setSmallIcon(R.drawable.ic_stat_glimmer)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setCategory(NotificationCompat.CATEGORY_SERVICE)
                    .setAutoCancel(false)
                    .build();

            Log.d(TAG, "About to call startForeground()");
            startForeground(NOTIFICATION_ID, notification);
            Log.d(TAG, "startForeground() called successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error in startForegroundImmediately()", e);
            // If we can't start foreground, stop the service
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "ForegroundService onDestroy() called");
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}