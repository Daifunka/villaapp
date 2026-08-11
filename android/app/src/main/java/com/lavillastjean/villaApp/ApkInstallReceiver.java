package com.lavillastjean.villaApp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.util.Log;

public class ApkInstallReceiver extends BroadcastReceiver {

    private static final String TAG = "VillaApkInstaller";

    @Override
    public void onReceive(Context context, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        String message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);

        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirmationIntent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                confirmationIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
            } else {
                //noinspection deprecation
                confirmationIntent = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            }

            if (confirmationIntent != null) {
                confirmationIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(confirmationIntent);
            } else {
                Log.e(TAG, "Android demande une confirmation, mais aucun écran d'installation n'est disponible.");
            }
            return;
        }

        if (status == PackageInstaller.STATUS_SUCCESS) {
            Log.i(TAG, "Mise à jour APK installée avec succès.");
            return;
        }

        Log.e(TAG, "Échec de l'installation APK (" + status + "): " + message);
    }
}
