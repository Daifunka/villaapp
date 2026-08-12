package com.lavillastjean.villaApp;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
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
            openAndroidInstaller(apkFile);

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

    private void openAndroidInstaller(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent installIntent = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);

        if (installIntent.resolveActivity(context.getPackageManager()) == null) {
            throw new IllegalStateException("Aucun installateur APK n'est disponible sur cet appareil.");
        }

        context.startActivity(installIntent);
    }
}
