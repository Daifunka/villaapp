package com.lavillastjean.villaApp;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", canRequestPackageInstalls());
        call.resolve(result);
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        String expectedSha256 = call.getString("sha256", "").trim().toLowerCase(Locale.ROOT);

        if (path == null || path.isBlank()) {
            call.reject("Le chemin de l'APK est requis.", "APK_PATH_REQUIRED");
            return;
        }

        if (!canRequestPackageInstalls()) {
            openInstallPermissionSettings();
            JSObject result = new JSObject();
            result.put("permissionRequired", true);
            call.resolve(result);
            return;
        }

        try {
            File apkFile = resolveTrustedApk(path);
            verifyChecksum(apkFile, expectedSha256);
            verifyPackage(apkFile);
            commitInstallSession(apkFile);

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage(), "APK_INSTALL_FAILED", error);
        }
    }

    private boolean canRequestPackageInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void openInstallPermissionSettings() {
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private File resolveTrustedApk(String path) throws Exception {
        URI uri = URI.create(path);
        if (!"file".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("Le fichier APK doit provenir du stockage privé de l'application.");
        }

        File apkFile = new File(uri).getCanonicalFile();
        File cacheDirectory = getContext().getCacheDir().getCanonicalFile();
        String cachePrefix = cacheDirectory.getPath() + File.separator;

        if (!apkFile.getPath().startsWith(cachePrefix) || !apkFile.isFile()) {
            throw new IllegalArgumentException("Le fichier APK téléchargé est introuvable ou non autorisé.");
        }
        if (!apkFile.getName().toLowerCase(Locale.ROOT).endsWith(".apk")) {
            throw new IllegalArgumentException("Le fichier téléchargé n'est pas une APK.");
        }

        return apkFile;
    }

    private void verifyChecksum(File apkFile, String expectedSha256) throws Exception {
        if (!expectedSha256.matches("^[a-f0-9]{64}$")) {
            throw new IllegalArgumentException("L'empreinte SHA-256 de la mise à jour est invalide.");
        }

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] buffer = new byte[1024 * 1024];
        try (InputStream input = new FileInputStream(apkFile)) {
            int count;
            while ((count = input.read(buffer)) != -1) {
                digest.update(buffer, 0, count);
            }
        }

        StringBuilder actualSha256 = new StringBuilder();
        for (byte value : digest.digest()) {
            actualSha256.append(String.format(Locale.ROOT, "%02x", value));
        }

        if (!expectedSha256.contentEquals(actualSha256)) {
            throw new SecurityException("L'APK téléchargée ne correspond pas à l'empreinte publiée.");
        }
    }

    private void verifyPackage(File apkFile) throws Exception {
        PackageManager packageManager = getContext().getPackageManager();
        PackageInfo archive = packageManager.getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
        PackageInfo current = packageManager.getPackageInfo(getContext().getPackageName(), 0);

        if (archive == null || !getContext().getPackageName().equals(archive.packageName)) {
            throw new SecurityException("Cette APK n'appartient pas à VillaApp.");
        }

        long archiveVersion = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? archive.getLongVersionCode()
            : archive.versionCode;
        long currentVersion = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
            ? current.getLongVersionCode()
            : current.versionCode;

        if (archiveVersion <= currentVersion) {
            throw new IllegalArgumentException("La version téléchargée n'est pas plus récente que la version installée.");
        }
    }

    private void commitInstallSession(File apkFile) throws Exception {
        Context context = getContext();
        PackageInstaller installer = context.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
            PackageInstaller.SessionParams.MODE_FULL_INSTALL
        );
        params.setAppPackageName(context.getPackageName());
        params.setSize(apkFile.length());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }

        int sessionId = installer.createSession(params);
        try (PackageInstaller.Session session = installer.openSession(sessionId);
             InputStream input = new FileInputStream(apkFile);
             OutputStream output = session.openWrite("villa-update.apk", 0, apkFile.length())) {
            byte[] buffer = new byte[1024 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            session.fsync(output);

            Intent callbackIntent = new Intent(context, ApkInstallReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                flags |= PendingIntent.FLAG_MUTABLE;
            }
            PendingIntent callback = PendingIntent.getBroadcast(context, sessionId, callbackIntent, flags);
            session.commit(callback.getIntentSender());
        } catch (Exception error) {
            installer.abandonSession(sessionId);
            throw error;
        }
    }
}
