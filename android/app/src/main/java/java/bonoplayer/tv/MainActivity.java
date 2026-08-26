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
        boolean isOkKey =
                event.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER ||
                event.getKeyCode() == KeyEvent.KEYCODE_ENTER ||
                event.getKeyCode() == KeyEvent.KEYCODE_NUMPAD_ENTER;

        if (
                isOkKey &&
                getBridge() != null &&
                getBridge().getWebView() != null
        ) {
            /*
             * =====================================================
             * ACTION DOWN
             *
             * 1) bonoOkDown:
             *    خاص بـ Live TV لمعرفة بداية الضغط المطول.
             *
             * 2) bonoOk:
             *    نحافظ على الحدث القديم تماماً حتى يبقى
             *    Home / Movies / Series يعمل كما كان.
             * =====================================================
             */
            if (
                    event.getAction() == KeyEvent.ACTION_DOWN &&
                    event.getRepeatCount() == 0
            ) {
                getBridge()
                        .getWebView()
                        .evaluateJavascript(
                                "window.dispatchEvent(new Event('bonoOkDown'));",
                                null
                        );

                getBridge()
                        .getWebView()
                        .evaluateJavascript(
                                "window.dispatchEvent(new Event('bonoOk'));",
                                null
                        );
            }

            /*
             * =====================================================
             * ACTION UP
             *
             * خاص بـ Live TV لتمييز Short Press عن Long Press.
             * =====================================================
             */
            if (
                    event.getAction() == KeyEvent.ACTION_UP
            ) {
                getBridge()
                        .getWebView()
                        .evaluateJavascript(
                                "window.dispatchEvent(new Event('bonoOkUp'));",
                                null
                        );
            }
        }

        /*
         * مهم جداً:
         * لا نستهلك زر OK هنا.
         *
         * نترك Android/WebView يستقبل الزر بشكل طبيعي
         * كما كان في النسخة الأصلية المستقرة.
         */
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