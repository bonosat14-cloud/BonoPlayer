package com.bonoplayer.tv;

import android.content.Intent;
import android.net.Uri;
import android.view.SurfaceView;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;

import java.util.ArrayList;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    private LibVLC previewLibVLC;
    private MediaPlayer previewPlayer;
    private FrameLayout previewContainer;
    private SurfaceView previewSurface;

    /*
     * =========================================================
     * PREVIEW
     * =========================================================
     */

    @PluginMethod
    public void playPreview(PluginCall call) {
        String streamUrl = call.getString("streamUrl");

        Double x = call.getDouble("x");
        Double y = call.getDouble("y");
        Double width = call.getDouble("width");
        Double height = call.getDouble("height");
        Double scale = call.getDouble("scale");

        if (streamUrl == null || streamUrl.isEmpty()) {
            call.reject("streamUrl is required");
            return;
        }

        if (
                x == null ||
                y == null ||
                width == null ||
                height == null
        ) {
            call.reject("Preview bounds are required");
            return;
        }

        final double pixelScale =
                scale != null ? scale : 1.0;

        getActivity().runOnUiThread(() -> {
            try {
                stopPreviewInternal();

                int[] webViewLocation = new int[2];
int[] decorLocation = new int[2];

getBridge()
        .getWebView()
        .getLocationOnScreen(webViewLocation);

getActivity()
        .getWindow()
        .getDecorView()
        .getLocationOnScreen(decorLocation);

int webViewOffsetX =
        webViewLocation[0] - decorLocation[0];

int webViewOffsetY =
        webViewLocation[1] - decorLocation[1];

int left =
        webViewOffsetX +
        (int) Math.round(x * pixelScale);

int top =
        webViewOffsetY +
        (int) Math.round(y * pixelScale);

int previewWidth =
        (int) Math.round(width * pixelScale);

int previewHeight =
        (int) Math.round(height * pixelScale);

                previewContainer =
                        new FrameLayout(getContext());
                        previewContainer.setFocusable(false);
                        previewContainer.setFocusableInTouchMode(false);
                        previewContainer.setClickable(false);

                previewSurface =
                        new SurfaceView(getContext());
                previewSurface.setFocusable(false);
                previewSurface.setFocusableInTouchMode(false);
                previewSurface.setClickable(false);
                previewContainer.addView(
                        previewSurface,
                        new FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                        )
                );

                FrameLayout.LayoutParams params =
                        new FrameLayout.LayoutParams(
                                previewWidth,
                                previewHeight
                        );

                params.leftMargin = left;
                params.topMargin = top;

                getActivity().addContentView(
                        previewContainer,
                        params
                );
                getBridge()
        .getWebView()
        .requestFocus();
                ArrayList<String> options =
                        new ArrayList<>();

                options.add("--network-caching=1000");

                previewLibVLC =
                        new LibVLC(
                                getContext(),
                                options
                        );

                previewPlayer =
                        new MediaPlayer(previewLibVLC);

                previewPlayer
                        .getVLCVout()
                        .setVideoView(previewSurface);

                previewPlayer
                        .getVLCVout()
                        .attachViews();

                Media media =
                        new Media(
                                previewLibVLC,
                                Uri.parse(streamUrl)
                        );

                media.setHWDecoderEnabled(
                        true,
                        false
                );

                previewPlayer.setMedia(media);

                media.release();

                previewPlayer.play();

                call.resolve();

            } catch (Exception error) {
                stopPreviewInternal();

                call.reject(
                        "Unable to start VLC preview",
                        error
                );
            }
        });
    }

    /*
     * =========================================================
     * STOP PREVIEW
     * =========================================================
     */

    @PluginMethod
    public void stopPreview(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            stopPreviewInternal();
            call.resolve();
        });
    }

    private void stopPreviewInternal() {
        if (previewPlayer != null) {
            try {
                previewPlayer.stop();

                previewPlayer
                        .getVLCVout()
                        .detachViews();

                previewPlayer.release();
            } catch (Exception ignored) {
            }

            previewPlayer = null;
        }

        if (previewLibVLC != null) {
            try {
                previewLibVLC.release();
            } catch (Exception ignored) {
            }

            previewLibVLC = null;
        }

        if (previewContainer != null) {
            ViewGroup parent =
                    (ViewGroup) previewContainer.getParent();

            if (parent != null) {
                parent.removeView(previewContainer);
            }

            previewContainer = null;
            previewSurface = null;
        }
    }

    /*
     * =========================================================
     * FULL SCREEN VLC
     * =========================================================
     */

    @PluginMethod
    public void playFullscreen(PluginCall call) {
        String streamUrl =
                call.getString("streamUrl");

        if (streamUrl == null || streamUrl.isEmpty()) {
            call.reject("streamUrl is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            stopPreviewInternal();

            Intent intent = new Intent(
                    getContext(),
                    VlcPlayerActivity.class
            );

            intent.putExtra(
                    "streamUrl",
                    streamUrl
            );

            getActivity().startActivity(intent);

            call.resolve();
        });
    }

    /*
     * =========================================================
     * OLD METHOD
     * Keep it temporarily so current React code still works.
     * =========================================================
     */

    @PluginMethod
    public void play(PluginCall call) {
        playFullscreen(call);
    }
       
    @PluginMethod
    public void exitApp(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            call.resolve();
            getActivity().finishAndRemoveTask();
        });
    }
}

