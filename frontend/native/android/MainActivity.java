package com.fitlife.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Modules natifs : autorisations caméra / micro des lives.
        registerPlugin(MediaPermissionsPlugin.class);
        // Podomètre réel (capteur de pas du téléphone).
        registerPlugin(StepCounterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
