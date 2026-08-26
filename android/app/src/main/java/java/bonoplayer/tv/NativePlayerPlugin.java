package com.bonoplayer.tv;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;

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
    private TextureView previewSurface;

    /*
     * =========================================================
     * PREVIEW ORIGINAL BOUNDS
     * =========================================================
     */

    private int previewLeft = 0;
    private int previewTop = 0;
    private int previewWidth = 0;
    private int previewHeight = 0;

    /*
     * =========================================================
     * LIVE FULLSCREEN STATE
     * =========================================================
     */

    private boolean liveFullscreen = false;
    private boolean liveAnimating = false;

    private OnBackPressedCallback liveBackCallback;

    private static final long LIVE_ANIMATION_DURATION =
            220L;

    /*
     * =========================================================
     * PREVIEW
     * =========================================================
     */

    @PluginMethod
    public void playPreview(
            PluginCall call
    ) {
        String streamUrl =
                call.getString(
                        "streamUrl"
                );

        Double x =
                call.getDouble("x");

        Double y =
                call.getDouble("y");

        Double width =
                call.getDouble(
                        "width"
                );

        Double height =
                call.getDouble(
                        "height"
                );

        Double scale =
                call.getDouble(
                        "scale"
                );

        if (
                streamUrl == null ||
                streamUrl.isEmpty()
        ) {
            call.reject(
                    "streamUrl is required"
            );

            return;
        }

        if (
                x == null ||
                y == null ||
                width == null ||
                height == null
        ) {
            call.reject(
                    "Preview bounds are required"
            );

            return;
        }

        final double pixelScale =
                scale != null
                        ? scale
                        : 1.0;

        getActivity()
                .runOnUiThread(
                        () -> {
                            try {
                                /*
                                 * قناة جديدة =
                                 * أوقف Preview السابق.
                                 */
                                stopPreviewInternal();

                                int[] webViewLocation =
                                        new int[2];

                                int[] decorLocation =
                                        new int[2];

                                getBridge()
                                        .getWebView()
                                        .getLocationOnScreen(
                                                webViewLocation
                                        );

                                getActivity()
                                        .getWindow()
                                        .getDecorView()
                                        .getLocationOnScreen(
                                                decorLocation
                                        );

                                int webViewOffsetX =
                                        webViewLocation[0] -
                                                decorLocation[0];

                                int webViewOffsetY =
                                        webViewLocation[1] -
                                                decorLocation[1];

                                previewLeft =
                                        webViewOffsetX +
                                                (int) Math.round(
                                                        x *
                                                                pixelScale
                                                );

                                previewTop =
                                        webViewOffsetY +
                                                (int) Math.round(
                                                        y *
                                                                pixelScale
                                                );

                                previewWidth =
                                        (int) Math.round(
                                                width *
                                                        pixelScale
                                        );

                                previewHeight =
                                        (int) Math.round(
                                                height *
                                                        pixelScale
                                        );

                                /*
                                 * =================================================
                                 * PREVIEW CONTAINER
                                 * =================================================
                                 */

                                previewContainer =
                                        new FrameLayout(
                                                getContext()
                                        );

                                previewContainer
                                        .setFocusable(
                                                false
                                        );

                                previewContainer
                                        .setFocusableInTouchMode(
                                                false
                                        );

                                previewContainer
                                        .setClickable(
                                                false
                                        );

                                /*
                                 * =================================================
                                 * SURFACE
                                 * =================================================
                                 */

                                previewSurface =
                                        new TextureView(
                                                getContext()
                                        );

                                previewSurface
                                        .setFocusable(
                                                false
                                        );

                                previewSurface
                                        .setFocusableInTouchMode(
                                                false
                                        );

                                previewSurface
                                        .setClickable(
                                                false
                                        );

                                previewContainer
                                        .addView(
                                                previewSurface,
                                                new FrameLayout.LayoutParams(
                                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                                        ViewGroup.LayoutParams.MATCH_PARENT
                                                )
                                        );

                                /*
                                 * =================================================
                                 * PREVIEW POSITION
                                 * =================================================
                                 */

                                FrameLayout.LayoutParams params =
                                        new FrameLayout.LayoutParams(
                                                previewWidth,
                                                previewHeight
                                        );

                                params.leftMargin =
                                        previewLeft;

                                params.topMargin =
                                        previewTop;

                                getActivity()
                                        .addContentView(
                                                previewContainer,
                                                params
                                        );

                                getBridge()
                                        .getWebView()
                                        .requestFocus();

                                /*
                                 * =================================================
                                 * VLC
                                 * =================================================
                                 */

                                ArrayList<String> options =
                                        new ArrayList<>();

                                options.add(
                                        "--network-caching=400"
                                );

                                previewLibVLC =
                                        new LibVLC(
                                                getContext(),
                                                options
                                        );

                                previewPlayer =
                                        new MediaPlayer(
                                                previewLibVLC
                                        );

                                previewPlayer
                                        .getVLCVout()
                                        .setVideoView(
                                                previewSurface
                                        );

                                previewPlayer
                                        .getVLCVout()
                                        .attachViews();

                                /*
                                 * =================================================
                                 * VLC WINDOW
                                 * =================================================
                                 */

                                previewSurface.post(
                                        () -> {
                                            if (
                                                    previewPlayer ==
                                                            null
                                            ) {
                                                return;
                                            }

                                            previewPlayer
                                                    .getVLCVout()
                                                    .setWindowSize(
                                                            previewWidth,
                                                            previewHeight
                                                    );

                                            previewPlayer
                                                    .setScale(
                                                            0
                                                    );

                                            previewPlayer
                                                    .setAspectRatio(
                                                            previewWidth +
                                                                    ":" +
                                                                    previewHeight
                                                    );
                                        }
                                );

                                /*
                                 * =================================================
                                 * MEDIA
                                 * =================================================
                                 */

                                Media media =
                                        new Media(
                                                previewLibVLC,
                                                Uri.parse(
                                                        streamUrl
                                                )
                                        );

                                media.setHWDecoderEnabled(
                                        true,
                                        false
                                );

                                media.addOption(
                                        ":network-caching=400"
                                );

                                media.addOption(
                                        ":clock-jitter=0"
                                );

                                media.addOption(
                                        ":clock-synchro=0"
                                );

                                previewPlayer
                                        .setMedia(
                                                media
                                        );

                                media.release();

                                previewPlayer.play();

                                liveFullscreen =
                                        false;

                                liveAnimating =
                                        false;

                                call.resolve();

                            } catch (
                                    Exception error
                            ) {
                                stopPreviewInternal();

                                call.reject(
                                        "Unable to start VLC preview",
                                        error
                                );
                            }
                        }
                );
    }

    /*
     * =========================================================
     * LIVE FULLSCREEN
     *
     * SAME VLC PLAYER
     * SAME SURFACE
     * SAME AUDIO
     * =========================================================
     */

    @PluginMethod
    public void enterLiveFullscreen(
            PluginCall call
    ) {
        getActivity()
                .runOnUiThread(
                        () -> {
                            if (
                                    previewContainer ==
                                            null ||
                                    previewPlayer ==
                                            null
                            ) {
                                call.reject(
                                        "Live preview is not running"
                                );

                                return;
                            }

                            if (
                                    liveFullscreen ||
                                    liveAnimating
                            ) {
                                call.resolve();
                                return;
                            }

                            liveAnimating =
                                    true;

                            View decor =
                                    getActivity()
                                            .getWindow()
                                            .getDecorView();

                            int fullWidth =
                                    decor.getWidth();

                            int fullHeight =
                                    decor.getHeight();

                            if (
                                    fullWidth <= 0 ||
                                    fullHeight <= 0
                            ) {
                                liveAnimating =
                                        false;

                                call.reject(
                                        "Unable to get fullscreen size"
                                );

                                return;
                            }

                            /*
                             * Immersive Full Screen
                             */
                            hideSystemUi();

                            animateLiveBounds(
                                    previewLeft,
                                    previewTop,
                                    previewWidth,
                                    previewHeight,

                                    0,
                                    0,
                                    fullWidth,
                                    fullHeight,

                                    () -> {
                                        liveFullscreen =
                                                true;

                                        liveAnimating =
                                                false;

                                        updateVlcWindow(
                                                fullWidth,
                                                fullHeight
                                        );

                                        installLiveBackHandler();

                                        call.resolve();
                                    }
                            );
                        }
                );
    }

    /*
     * =========================================================
     * EXIT LIVE FULLSCREEN
     * =========================================================
     */

    @PluginMethod
    public void exitLiveFullscreen(
            PluginCall call
    ) {
        getActivity()
                .runOnUiThread(
                        () -> {
                            if (
                                    !liveFullscreen ||
                                    previewContainer ==
                                            null
                            ) {
                                call.resolve();
                                return;
                            }

                            exitLiveFullscreenInternal(
                                    call::resolve
                            );
                        }
                );
    }

    /*
     * =========================================================
     * FULLSCREEN -> PREVIEW
     * =========================================================
     */

    private void exitLiveFullscreenInternal(
            Runnable onComplete
    ) {
        if (
                previewContainer ==
                        null ||
                liveAnimating
        ) {
            if (
                    onComplete !=
                            null
            ) {
                onComplete.run();
            }

            return;
        }

        liveAnimating =
                true;

        FrameLayout.LayoutParams currentParams =
                (FrameLayout.LayoutParams)
                        previewContainer
                                .getLayoutParams();

        int currentLeft =
                currentParams.leftMargin;

        int currentTop =
                currentParams.topMargin;

        int currentWidth =
                currentParams.width;

        int currentHeight =
                currentParams.height;

        animateLiveBounds(
                currentLeft,
                currentTop,
                currentWidth,
                currentHeight,

                previewLeft,
                previewTop,
                previewWidth,
                previewHeight,

                () -> {
                    liveFullscreen =
                            false;

                    liveAnimating =
                            false;

                    updateVlcWindow(
                            previewWidth,
                            previewHeight
                    );

                    removeLiveBackHandler();

                    getBridge()
                            .getWebView()
                            .requestFocus();

                    if (
                            onComplete !=
                                    null
                    ) {
                        onComplete.run();
                    }
                }
        );
    }

    /*
     * =========================================================
     * ANIMATION
     * =========================================================
     */

    private void animateLiveBounds(
            int fromLeft,
            int fromTop,
            int fromWidth,
            int fromHeight,

            int toLeft,
            int toTop,
            int toWidth,
            int toHeight,

            Runnable onComplete
    ) {
        if (previewContainer == null) {
            if (onComplete != null) {
                onComplete.run();
            }
            return;
        }

        final FrameLayout container = previewContainer;

        container.animate().cancel();

        container.setPivotX(0f);
        container.setPivotY(0f);

        final float targetScaleX =
                fromWidth > 0
                        ? (float) toWidth / (float) fromWidth
                        : 1f;

        final float targetScaleY =
                fromHeight > 0
                        ? (float) toHeight / (float) fromHeight
                        : 1f;

        final float targetTranslationX =
                toLeft - fromLeft;

        final float targetTranslationY =
                toTop - fromTop;

        container.animate()
                .translationX(targetTranslationX)
                .translationY(targetTranslationY)
                .scaleX(targetScaleX)
                .scaleY(targetScaleY)
                .setDuration(LIVE_ANIMATION_DURATION)
                .setInterpolator(
                        new DecelerateInterpolator()
                )
                .withEndAction(
                        () -> {
                            if (previewContainer == null) {
                                return;
                            }

                            FrameLayout.LayoutParams params =
                                    (FrameLayout.LayoutParams)
                                            previewContainer
                                                    .getLayoutParams();

                            params.leftMargin = toLeft;
                            params.topMargin = toTop;
                            params.width = toWidth;
                            params.height = toHeight;

                            previewContainer
                                    .setLayoutParams(params);

                            previewContainer
                                    .setTranslationX(0f);

                            previewContainer
                                    .setTranslationY(0f);

                            previewContainer
                                    .setScaleX(1f);

                            previewContainer
                                    .setScaleY(1f);

                            if (onComplete != null) {
                                onComplete.run();
                            }
                        }
                )
                .start();
    }

    /*
     * =========================================================
     * VLC SIZE
     * =========================================================
     */

    private void updateVlcWindow(
            int width,
            int height
    ) {
        if (
                previewPlayer ==
                        null
        ) {
            return;
        }

        try {
            previewPlayer
                    .getVLCVout()
                    .setWindowSize(
                            width,
                            height
                    );

            previewPlayer
                    .setScale(
                            0
                    );

            previewPlayer
                    .setAspectRatio(
                            width +
                                    ":" +
                                    height
                    );

        } catch (
                Exception ignored
        ) {
        }
    }

    /*
     * =========================================================
     * ANDROID BACK WHILE LIVE FULLSCREEN
     * =========================================================
     */

    private void installLiveBackHandler() {
        removeLiveBackHandler();

        if (
                !(
                        getActivity()
                                instanceof
                                ComponentActivity
                )
        ) {
            return;
        }

        ComponentActivity activity =
                (ComponentActivity)
                        getActivity();

        liveBackCallback =
                new OnBackPressedCallback(
                        true
                ) {
                    @Override
                    public void handleOnBackPressed() {
                        if (
                                liveFullscreen
                        ) {
                            exitLiveFullscreenInternal(
                                    null
                            );

                            return;
                        }

                        setEnabled(
                                false
                        );

                        activity
                                .getOnBackPressedDispatcher()
                                .onBackPressed();
                    }
                };

        activity
                .getOnBackPressedDispatcher()
                .addCallback(
                        activity,
                        liveBackCallback
                );
    }

    private void removeLiveBackHandler() {
        if (
                liveBackCallback !=
                        null
        ) {
            liveBackCallback.remove();

            liveBackCallback =
                    null;
        }
    }

    /*
     * =========================================================
     * SYSTEM UI
     * =========================================================
     */

    private void hideSystemUi() {
        getActivity()
                .getWindow()
                .getDecorView()
                .setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                                |
                                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                |
                                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                |
                                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                |
                                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                |
                                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
    }

    /*
     * =========================================================
     * STOP PREVIEW
     * =========================================================
     */

    @PluginMethod
    public void stopPreview(
            PluginCall call
    ) {
        getActivity()
                .runOnUiThread(
                        () -> {
                            stopPreviewInternal();

                            call.resolve();
                        }
                );
    }

    private void stopPreviewInternal() {
        removeLiveBackHandler();

        liveFullscreen =
                false;

        liveAnimating =
                false;

        if (
                previewPlayer !=
                        null
        ) {
            try {
                previewPlayer.stop();

                previewPlayer
                        .getVLCVout()
                        .detachViews();

                previewPlayer.release();

            } catch (
                    Exception ignored
            ) {
            }

            previewPlayer =
                    null;
        }

        if (
                previewLibVLC !=
                        null
        ) {
            try {
                previewLibVLC.release();

            } catch (
                    Exception ignored
            ) {
            }

            previewLibVLC =
                    null;
        }

        if (
                previewContainer !=
                        null
        ) {
            ViewGroup parent =
                    (ViewGroup)
                            previewContainer
                                    .getParent();

            if (
                    parent !=
                            null
            ) {
                parent.removeView(
                        previewContainer
                );
            }

            previewContainer =
                    null;

            previewSurface =
                    null;
        }
    }

    /*
     * =========================================================
     * MOVIES / SERIES FULL SCREEN
     *
     * This still uses VlcPlayerActivity.
     * =========================================================
     */

    @PluginMethod
    public void playFullscreen(
            PluginCall call
    ) {
        String streamUrl =
                call.getString(
                        "streamUrl"
                );

        if (
                streamUrl == null ||
                streamUrl.isEmpty()
        ) {
            call.reject(
                    "streamUrl is required"
            );

            return;
        }

        getActivity()
                .runOnUiThread(
                        () -> {
                            try {
                                stopPreviewInternal();

                                Intent intent =
                                        new Intent(
                                                getContext(),
                                                VlcPlayerActivity.class
                                        );

                                intent.putExtra(
                                        "streamUrl",
                                        streamUrl
                                );

                                getActivity()
                                        .startActivity(
                                                intent
                                        );

                                call.resolve();

                            } catch (
                                    Exception error
                            ) {
                                call.reject(
                                        "Unable to start fullscreen VLC",
                                        error
                                );
                            }
                        }
                );
    }

    /*
     * =========================================================
     * OLD PLAY METHOD
     * =========================================================
     */

    @PluginMethod
    public void play(
            PluginCall call
    ) {
        playFullscreen(
                call
        );
    }

    /*
     * =========================================================
     * EXIT APP
     * =========================================================
     */

    /*
     * =========================================================
     * OPEN YOUTUBE TRAILER
     * =========================================================
     */

    @PluginMethod
    public void openYouTube(
            PluginCall call
    ) {
        String value = call.getString("value");

        if (value == null || value.trim().isEmpty()) {
            call.reject("YouTube value is required");
            return;
        }

        final String raw = value.trim();

        getActivity().runOnUiThread(() -> {
            try {
                String videoId = extractYouTubeVideoId(raw);
                String webUrl;

                if (videoId != null && !videoId.isEmpty()) {
                    webUrl = "https://www.youtube.com/watch?v=" + videoId;
                } else if (
                        raw.startsWith("http://") ||
                        raw.startsWith("https://")
                ) {
                    webUrl = raw;
                } else {
                    webUrl =
                            "https://www.youtube.com/results?search_query=" +
                                    Uri.encode(raw);
                }

                Intent tvIntent = new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse(webUrl)
                );
                tvIntent.setPackage("com.google.android.youtube.tv");
                tvIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                if (tvIntent.resolveActivity(getContext().getPackageManager()) != null) {
                    getActivity().startActivity(tvIntent);
                    call.resolve();
                    return;
                }

                Intent youtubeIntent = new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse(webUrl)
                );
                youtubeIntent.setPackage("com.google.android.youtube");
                youtubeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                if (youtubeIntent.resolveActivity(getContext().getPackageManager()) != null) {
                    getActivity().startActivity(youtubeIntent);
                    call.resolve();
                    return;
                }

                Intent fallback = new Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse(webUrl)
                );
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getActivity().startActivity(fallback);
                call.resolve();

            } catch (Exception error) {
                call.reject("Unable to open YouTube", error);
            }
        });
    }

    private String extractYouTubeVideoId(String raw) {
        try {
            if (raw == null || raw.trim().isEmpty()) return null;
            String value = raw.trim();

            if (value.matches("^[A-Za-z0-9_-]{11}$")) return value;

            Uri uri = Uri.parse(value);
            String host = uri.getHost();
            if (host == null) return null;
            host = host.toLowerCase();

            if (host.contains("youtu.be")) return uri.getLastPathSegment();

            if (host.contains("youtube.com")) {
                String id = uri.getQueryParameter("v");
                if (id != null && !id.isEmpty()) return id;

                String path = uri.getPath();
                if (path != null) {
                    String[] parts = path.split("/");
                    for (int i = 0; i < parts.length - 1; i++) {
                        if (
                                "embed".equals(parts[i]) ||
                                "shorts".equals(parts[i]) ||
                                "live".equals(parts[i])
                        ) {
                            return parts[i + 1];
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        return null;
    }

    @PluginMethod
    public void exitApp(
            PluginCall call
    ) {
        getActivity()
                .runOnUiThread(
                        () -> {
                            stopPreviewInternal();

                            call.resolve();

                            getActivity()
                                    .finishAndRemoveTask();
                        }
                );
    }

    /*
     * =========================================================
     * STOP ALL PLAYBACK
     * =========================================================
     */

    public void stopAllPlayback() {
        getActivity()
                .runOnUiThread(
                        this::stopPreviewInternal
                );
    }
}