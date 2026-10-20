package com.fitlife.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Autorisations caméra et micro pour le direct (lives) : Android exige de les demander
 * explicitement à l'utilisateur avant que la WebView puisse ouvrir la caméra.
 */
@CapacitorPlugin(
    name = "MediaPermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS })
    }
)
public class MediaPermissionsPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        call.resolve(states());
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED && getPermissionState("microphone") == PermissionState.GRANTED) {
            call.resolve(states());
            return;
        }
        requestAllPermissions(call, "afterRequest");
    }

    @PermissionCallback
    private void afterRequest(PluginCall call) {
        call.resolve(states());
    }

    /** Ouvre la page des autorisations de FitLife dans les réglages du téléphone. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private JSObject states() {
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera").toString());
        result.put("microphone", getPermissionState("microphone").toString());
        return result;
    }
}
