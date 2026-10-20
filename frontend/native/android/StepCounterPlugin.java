package com.fitlife.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Podomètre réel : capteur matériel de pas d'Android (TYPE_STEP_COUNTER).
 * Le capteur compte les pas en continu depuis le démarrage du téléphone, même application
 * fermée ; on mémorise une référence par jour pour obtenir les pas de la journée.
 * Aucun pas n'est compté si le téléphone ne bouge pas au rythme de la marche.
 */
@CapacitorPlugin(
    name = "StepCounter",
    permissions = { @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION }) }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private static final String PREFS = "fitlife_steps";
    private SensorManager sensorManager;
    private Sensor stepSensor;
    private boolean watching = false;
    private float lastValue = -1;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager != null ? sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) : null;
    }

    private boolean needsPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }

    private boolean granted() {
        return !needsPermission() || getPermissionState("activity") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("available", stepSensor != null);
        r.put("permission", granted() ? "granted" : getPermissionState("activity").toString());
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            status(call);
            return;
        }
        requestPermissionForAlias("activity", call, "afterPermission");
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        status(call);
    }

    /** Démarre l'écoute : un événement « steps » { today, date } à chaque nouveau pas. */
    @PluginMethod
    public void start(PluginCall call) {
        if (stepSensor == null) {
            call.reject("Ce téléphone n'a pas de capteur de pas.", "UNAVAILABLE");
            return;
        }
        if (!granted()) {
            call.reject("Autorisation « Activité physique » refusée.", "DENIED");
            return;
        }
        if (!watching) {
            watching = sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_UI, 0);
        }
        JSObject r = new JSObject();
        r.put("today", lastValue >= 0 ? todaySteps(lastValue) : readToday());
        r.put("date", today());
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (watching && sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        watching = false;
        call.resolve();
    }

    @Override
    protected void handleOnPause() {
        // Le capteur matériel continue de compter : on se réabonne au retour.
        if (watching && sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @Override
    protected void handleOnResume() {
        if (watching && sensorManager != null && stepSensor != null) {
            sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_UI, 0);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) {
            return;
        }
        lastValue = event.values[0];
        JSObject r = new JSObject();
        r.put("today", todaySteps(lastValue));
        r.put("date", today());
        notifyListeners("steps", r);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    private int readToday() {
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!today().equals(p.getString("day", ""))) {
            return 0;
        }
        return Math.max(0, Math.round(p.getFloat("last", 0) - p.getFloat("base", 0)));
    }

    /**
     * Pas du jour à partir du compteur depuis le démarrage du téléphone.
     * Nouveau jour : la référence devient la dernière valeur connue. Redémarrage du téléphone
     * (compteur remis à zéro) : on conserve les pas déjà faits aujourd'hui.
     */
    private int todaySteps(float counter) {
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String day = today();
        long boot = System.currentTimeMillis() - SystemClock.elapsedRealtime();
        String storedDay = p.getString("day", null);
        float base = p.getFloat("base", counter);
        float last = p.getFloat("last", counter);
        long storedBoot = p.getLong("boot", boot);
        boolean rebooted = Math.abs(storedBoot - boot) > 120000 || counter < last;
        if (storedDay == null) {
            base = counter;
        } else if (rebooted) {
            float doneToday = day.equals(storedDay) ? Math.max(0, last - base) : 0;
            base = -doneToday;
        } else if (!day.equals(storedDay)) {
            base = last;
        }
        p.edit().putString("day", day).putFloat("base", base).putFloat("last", counter).putLong("boot", boot).apply();
        return Math.max(0, Math.round(counter - base));
    }
}
