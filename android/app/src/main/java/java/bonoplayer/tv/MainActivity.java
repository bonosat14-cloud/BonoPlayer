package com.bonoplayer.tv;

import android.os.Bundle;
import android.view.KeyEvent;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativePlayerPlugin.class);

        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        if (
                                getBridge() != null &&
                                getBridge().getWebView() != null
                        ) {
                            getBridge()
                                    .getWebView()
                                    .evaluateJavascript(
                                            "window.dispatchEvent(new Event('bonoBack'));",
                                            null
                                    );
                        }
                    }
                }
        );
    }
    
@Override
public boolean dispatchKeyEvent(KeyEvent event) {
    if (
            event.getAction() == KeyEvent.ACTION_DOWN &&
            (
                    event.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER ||
                    event.getKeyCode() == KeyEvent.KEYCODE_ENTER ||
                    event.getKeyCode() == KeyEvent.KEYCODE_NUMPAD_ENTER
            )
    ) {
        if (
                getBridge() != null &&
                getBridge().getWebView() != null
        ) {
            getBridge()
                    .getWebView()
                    .evaluateJavascript(
                            "window.dispatchEvent(new Event('bonoOk'));",
                            null
                    );
        }
    }

    return super.dispatchKeyEvent(event);
}


/*
 * Stop native playback when app leaves foreground
 */
@Override
public void onStop() {
    super.onStop();

    if (
            getBridge() != null &&
            getBridge().getPlugin("NativePlayer") != null
    ) {
        NativePlayerPlugin plugin =
                (NativePlayerPlugin)
                        getBridge()
                                .getPlugin("NativePlayer")
                                .getInstance();

        if (plugin != null) {
            plugin.stopAllPlayback();
        }
    }
}

}