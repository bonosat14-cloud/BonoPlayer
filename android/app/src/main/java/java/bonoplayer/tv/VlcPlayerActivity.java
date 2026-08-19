package com.bonoplayer.tv;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;

import java.util.ArrayList;
import java.util.Locale;

public class VlcPlayerActivity extends AppCompatActivity {

    private LibVLC libVLC;
    private MediaPlayer mediaPlayer;
    private SurfaceView surfaceView;

    private FrameLayout root;
    private LinearLayout controlsContainer;

    private TextView rewindButton;
    private TextView playPauseButton;
    private TextView forwardButton;

    private TextView currentTimeText;
    private TextView durationText;

    private ProgressBar progressBar;

    private final Handler handler =
            new Handler(Looper.getMainLooper());

    private boolean controlsVisible = false;

    private static final long SEEK_STEP_MS =
            10_000L;

    private static final long CONTROLS_HIDE_DELAY =
            4_000L;

    /*
     * =========================================================
     * AUTO HIDE CONTROLS
     * =========================================================
     */

    private final Runnable hideControlsRunnable =
            new Runnable() {
                @Override
                public void run() {
                    hideControls();
                }
            };

    /*
     * =========================================================
     * PROGRESS UPDATE
     * =========================================================
     */

    private final Runnable progressRunnable =
            new Runnable() {
                @Override
                public void run() {
                    updateProgress();

                    handler.postDelayed(
                            this,
                            500
                    );
                }
            };

    @Override
    protected void onCreate(
            Bundle savedInstanceState
    ) {
        super.onCreate(savedInstanceState);

        /*
         * =====================================================
         * BACK
         * =====================================================
         */

        getOnBackPressedDispatcher()
                .addCallback(
                        this,
                        new OnBackPressedCallback(true) {
                            @Override
                            public void handleOnBackPressed() {
                                finish();
                            }
                        }
                );

        /*
         * =====================================================
         * FULL SCREEN
         * =====================================================
         */

        ActionBar actionBar =
                getSupportActionBar();

        if (actionBar != null) {
            actionBar.hide();
        }

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        applyImmersiveMode();

        /*
         * =====================================================
         * ROOT
         * =====================================================
         */

        root =
                new FrameLayout(this);

        root.setLayoutParams(
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        root.setBackgroundColor(
                Color.BLACK
        );

        /*
         * =====================================================
         * VIDEO SURFACE
         * =====================================================
         */

        surfaceView =
                new SurfaceView(this);

        FrameLayout.LayoutParams videoParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                );

        root.addView(
                surfaceView,
                videoParams
        );

        /*
         * =====================================================
         * CONTROLS UI
         * =====================================================
         */

        createControls();

        setContentView(root);

        /*
         * =====================================================
         * STREAM URL
         * =====================================================
         */

        String streamUrl =
                getIntent()
                        .getStringExtra(
                                "streamUrl"
                        );

        if (
                streamUrl == null ||
                streamUrl.isEmpty()
        ) {
            finish();
            return;
        }

        /*
         * =====================================================
         * VLC
         * =====================================================
         */

        ArrayList<String> options =
                new ArrayList<>();

        options.add(
                "--network-caching=800"
        );

        libVLC =
                new LibVLC(
                        this,
                        options
                );

        mediaPlayer =
                new MediaPlayer(
                        libVLC
                );

        mediaPlayer
                .getVLCVout()
                .setVideoView(
                        surfaceView
                );

        mediaPlayer
                .getVLCVout()
                .attachViews();

        /*
         * =====================================================
         * FULL WINDOW VIDEO
         * =====================================================
         */

        surfaceView.post(() -> {
            if (mediaPlayer == null) {
                return;
            }

            int width =
                    getWindow()
                            .getDecorView()
                            .getWidth();

            int height =
                    getWindow()
                            .getDecorView()
                            .getHeight();

            if (
                    width > 0 &&
                    height > 0
            ) {
                mediaPlayer
                        .getVLCVout()
                        .setWindowSize(
                                width,
                                height
                        );

                mediaPlayer.setScale(0);

                mediaPlayer.setAspectRatio(
                        width + ":" + height
                );
            }
        });

        /*
         * =====================================================
         * MEDIA
         * =====================================================
         */

        Media media =
                new Media(
                        libVLC,
                        Uri.parse(
                                streamUrl
                        )
                );

        media.setHWDecoderEnabled(
                true,
                false
        );

        media.addOption(
                ":network-caching=800"
        );

        media.addOption(
                ":clock-jitter=0"
        );

        media.addOption(
                ":clock-synchro=0"
        );

        mediaPlayer.setMedia(
                media
        );

        media.release();

        /*
         * =====================================================
         * VLC EVENTS
         * =====================================================
         */

        mediaPlayer.setEventListener(
                event -> {
                    switch (event.type) {

                        case MediaPlayer.Event.Playing:
                            runOnUiThread(() -> {
                                updatePlayPauseIcon();
                                
                            });
                            break;

                        case MediaPlayer.Event.Paused:
                            runOnUiThread(() -> {
                                updatePlayPauseIcon();
                                showControls();
                            });
                            break;

                        case MediaPlayer.Event.EndReached:
                            runOnUiThread(
                                    this::finish
                            );
                            break;

                        default:
                            break;
                    }
                }
        );

        mediaPlayer.play();

        handler.post(
                progressRunnable
        );
        controlsContainer.setVisibility(
        View.GONE
);

controlsVisible = false;
        
    }

    /*
     * =========================================================
     * CREATE CONTROLS
     * =========================================================
     */

    private void createControls() {

        controlsContainer =
                new LinearLayout(this);

        controlsContainer.setOrientation(
                LinearLayout.VERTICAL
        );

        controlsContainer.setGravity(
                Gravity.CENTER_HORIZONTAL
        );

        controlsContainer.setPadding(
                dp(40),
                dp(18),
                dp(40),
                dp(22)
        );

        GradientDrawable background =
                new GradientDrawable();

        background.setColor(
                Color.argb(
                        80,
                        255,
                        255,
                        255
                )
        );

        controlsContainer.setBackground(
                background
        );

        FrameLayout.LayoutParams controlsParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        controlsParams.gravity =
                Gravity.BOTTOM;

        /*
         * =====================================================
         * BUTTON ROW
         * =====================================================
         */

        LinearLayout buttonRow =
                new LinearLayout(this);

        buttonRow.setOrientation(
                LinearLayout.HORIZONTAL
        );

        buttonRow.setGravity(
                Gravity.CENTER
        );

        rewindButton =
                createControlButton(
                        "⏪ "
                );

        playPauseButton =
                createControlButton(
                        "⏸"
                );

        forwardButton =
                createControlButton(
                        " ⏩"
                );

        buttonRow.addView(
                rewindButton
        );

        buttonRow.addView(
                playPauseButton
        );

        buttonRow.addView(
                forwardButton
        );

        controlsContainer.addView(
                buttonRow
        );

        /*
         * =====================================================
         * PROGRESS ROW
         * =====================================================
         */

        LinearLayout progressRow =
                new LinearLayout(this);

        progressRow.setOrientation(
                LinearLayout.HORIZONTAL
        );

        progressRow.setGravity(
                Gravity.CENTER_VERTICAL
        );

        progressRow.setPadding(
                0,
                dp(12),
                0,
                0
        );

        currentTimeText =
                createTimeText(
                        "00:00"
                );

        durationText =
                createTimeText(
                        "00:00"
                );

        progressBar =
                new ProgressBar(
                        this,
                        null,
                        android.R.attr.progressBarStyleHorizontal
                );

        progressBar.setMax(
                1000
        );

        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(
                        0,
                        dp(8),
                        1f
                );

        progressParams.setMargins(
                dp(18),
                0,
                dp(18),
                0
        );

        progressBar.setLayoutParams(
                progressParams
        );

        progressRow.addView(
                currentTimeText
        );

        progressRow.addView(
                progressBar
        );

        progressRow.addView(
                durationText
        );

        controlsContainer.addView(
                progressRow
        );

        root.addView(
                controlsContainer,
                controlsParams
        );
    }

    /*
     * =========================================================
     * CONTROL BUTTON
     * =========================================================
     */

    private TextView createControlButton(
            String text
    ) {
        TextView button =
                new TextView(this);

        button.setText(
                text
        );

        button.setTextColor(
                Color.WHITE
        );

        button.setTextSize(
                20
        );

        button.setGravity(
                Gravity.CENTER
        );

        button.setFocusable(
                false
        );

        button.setClickable(
                false
        );

        button.setPadding(
                dp(24),
                dp(12),
                dp(24),
                dp(12)
        );

        LinearLayout.LayoutParams params =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        dp(58)
                );

        params.setMargins(
                dp(8),
                0,
                dp(8),
                0
        );

        button.setLayoutParams(
                params
        );

        GradientDrawable background =
                new GradientDrawable();

        background.setColor(
                Color.argb(
                        65,
                        255,
                        255,
                        255
                )
        );

        background.setCornerRadius(
                dp(14)
        );

        button.setBackground(
                background
        );

        return button;
    }

    /*
     * =========================================================
     * TIME TEXT
     * =========================================================
     */

    private TextView createTimeText(
            String text
    ) {
        TextView view =
                new TextView(this);

        view.setText(
                text
        );

        view.setTextColor(
                Color.WHITE
        );

        view.setTextSize(
                14
        );

        return view;
    }

    /*
     * =========================================================
     * REMOTE CONTROL
     * =========================================================
     */

    @Override
    public boolean dispatchKeyEvent(
            KeyEvent event
    ) {

        if (
                event.getAction() !=
                KeyEvent.ACTION_DOWN
        ) {
            return super.dispatchKeyEvent(
                    event
            );
        }

        int keyCode =
                event.getKeyCode();

        /*
         * LEFT = -10 SECONDS
         */
        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_LEFT
        ) {
            seekRelative(
                    -SEEK_STEP_MS
            );

            showControls();

            return true;
        }

        /*
         * RIGHT = +10 SECONDS
         */
        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_RIGHT
        ) {
            seekRelative(
                    SEEK_STEP_MS
            );

            showControls();

            return true;
        }

        /*
         * OK / ENTER
         */
        if (
                keyCode ==
                        KeyEvent.KEYCODE_DPAD_CENTER ||
                keyCode ==
                        KeyEvent.KEYCODE_ENTER ||
                keyCode ==
                        KeyEvent.KEYCODE_NUMPAD_ENTER
        ) {

            if (!controlsVisible) {
                showControls();
            } else {
                togglePlayPause();
            }

            return true;
        }

        /*
         * UP / DOWN
         * Show controls
         */
        if (
                keyCode ==
                        KeyEvent.KEYCODE_DPAD_UP ||
                keyCode ==
                        KeyEvent.KEYCODE_DPAD_DOWN
        ) {
            showControls();

            return true;
        }

        return super.dispatchKeyEvent(
                event
        );
    }

    /*
     * =========================================================
     * PLAY / PAUSE
     * =========================================================
     */

    private void togglePlayPause() {
        if (
                mediaPlayer == null
        ) {
            return;
        }

        if (
                mediaPlayer.isPlaying()
        ) {
            mediaPlayer.pause();
        } else {
            mediaPlayer.play();
        }

        updatePlayPauseIcon();

        showControls();
    }

    private void updatePlayPauseIcon() {
        if (
                playPauseButton == null ||
                mediaPlayer == null
        ) {
            return;
        }

        if (
                mediaPlayer.isPlaying()
        ) {
            playPauseButton.setText(
                    "⏸"
            );
        } else {
            playPauseButton.setText(
                    "▶"
            );
        }
    }

    /*
     * =========================================================
     * SEEK
     * =========================================================
     */

    private void seekRelative(
            long deltaMs
    ) {
        if (
                mediaPlayer == null
        ) {
            return;
        }

        long duration =
                mediaPlayer.getLength();

        long current =
                mediaPlayer.getTime();

        if (
                duration <= 0 ||
                current < 0
        ) {
            return;
        }

        long target =
                current +
                deltaMs;

        target =
                Math.max(
                        0,
                        target
                );

        target =
                Math.min(
                        duration,
                        target
                );

        mediaPlayer.setTime(
                target
        );

        updateProgress();
    }

    /*
     * =========================================================
     * PROGRESS
     * =========================================================
     */

    private void updateProgress() {
        if (
                mediaPlayer == null ||
                progressBar == null
        ) {
            return;
        }

        long duration =
                mediaPlayer.getLength();

        long current =
                mediaPlayer.getTime();

        if (current < 0) {
            current = 0;
        }

        if (duration < 0) {
            duration = 0;
        }

        currentTimeText.setText(
                formatTime(
                        current
                )
        );

        durationText.setText(
                formatTime(
                        duration
                )
        );

        if (
                duration > 0
        ) {
            int progress =
                    (int) (
                            (
                                    current *
                                    1000L
                            ) /
                            duration
                    );

            progressBar.setProgress(
                    progress
            );
        } else {
            progressBar.setProgress(
                    0
            );
        }
    }

    /*
     * =========================================================
     * FORMAT TIME
     * =========================================================
     */

    private String formatTime(
            long milliseconds
    ) {
        long totalSeconds =
                milliseconds /
                1000L;

        long hours =
                totalSeconds /
                3600L;

        long minutes =
                (
                        totalSeconds %
                        3600L
                ) /
                60L;

        long seconds =
                totalSeconds %
                60L;

        if (hours > 0) {
            return String.format(
                    Locale.US,
                    "%02d:%02d:%02d",
                    hours,
                    minutes,
                    seconds
            );
        }

        return String.format(
                Locale.US,
                "%02d:%02d",
                minutes,
                seconds
        );
    }

    /*
     * =========================================================
     * SHOW CONTROLS
     * =========================================================
     */

    private void showControls() {
        if (
                controlsContainer == null
        ) {
            return;
        }

        controlsContainer.setVisibility(
                View.VISIBLE
        );

        controlsVisible =
                true;

        handler.removeCallbacks(
                hideControlsRunnable
        );

        handler.postDelayed(
                hideControlsRunnable,
                CONTROLS_HIDE_DELAY
        );
    }

    /*
     * =========================================================
     * HIDE CONTROLS
     * =========================================================
     */

    private void hideControls() {
        if (
                controlsContainer == null
        ) {
            return;
        }

        controlsContainer.setVisibility(
                View.GONE
        );

        controlsVisible =
                false;
    }

    /*
     * =========================================================
     * IMMERSIVE MODE
     * =========================================================
     */

    private void applyImmersiveMode() {
        getWindow()
                .getDecorView()
                .setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
    }

    /*
     * =========================================================
     * DP
     * =========================================================
     */

    private int dp(
            int value
    ) {
        float density =
                getResources()
                        .getDisplayMetrics()
                        .density;

        return (int) (
                value *
                density
        );
    }

    /*
     * =========================================================
     * WINDOW FOCUS
     * =========================================================
     */

    @Override
    public void onWindowFocusChanged(
            boolean hasFocus
    ) {
        super.onWindowFocusChanged(
                hasFocus
        );

        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    /*
     * =========================================================
     * CLEANUP
     * =========================================================
     */

    @Override
    protected void onStop() {
        super.onStop();

        handler.removeCallbacks(
                hideControlsRunnable
        );

        handler.removeCallbacks(
                progressRunnable
        );

        if (
                mediaPlayer != null
        ) {
            mediaPlayer.stop();

            mediaPlayer
                    .getVLCVout()
                    .detachViews();

            mediaPlayer.release();

            mediaPlayer =
                    null;
        }

        if (
                libVLC != null
        ) {
            libVLC.release();

            libVLC =
                    null;
        }
    }
}