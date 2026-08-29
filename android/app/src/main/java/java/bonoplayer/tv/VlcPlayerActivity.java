package com.bonoplayer.tv;

import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.content.SharedPreferences;
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
import android.widget.ScrollView;
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

    /*
     * =========================================================
     * RESUME / CONTINUE WATCHING
     * =========================================================
     */
    private String contentType = "";
    private String contentId = "";
    private String contentTitle = "";
    private String seriesId = "";
    private int seasonNumber = -1;
    private int episodeNumber = -1;

    private String resumeKey = "";
    private long pendingResumePosition = 0L;
    private boolean resumeApplied = false;
    private boolean playbackCompleted = false;

    private static final String RESUME_PREFS = "bonoplayer_resume";
    private static final long MIN_RESUME_POSITION_MS = 30_000L;
    private static final float COMPLETED_PERCENT = 0.95f;

    private FrameLayout root;
    private LinearLayout controlsContainer;

    private TextView rewindButton;
    private TextView playPauseButton;
    private TextView forwardButton;
    private TextView ccButton;

    private FrameLayout subtitleMenuOverlay;
    private LinearLayout subtitleMenuList;

    private final ArrayList<Integer> subtitleTrackIds =
            new ArrayList<>();

    private final ArrayList<String> subtitleTrackNames =
            new ArrayList<>();

    private final ArrayList<TextView> subtitleMenuItems =
            new ArrayList<>();

    private boolean subtitleMenuVisible = false;
    private int subtitleMenuIndex = 0;

    private TextView currentTimeText;
    private TextView durationText;

    private ProgressBar progressBar;

    private final Handler handler =
            new Handler(Looper.getMainLooper());

    private boolean controlsVisible = false;

    private boolean subtitlesAvailable = false;
    private boolean subtitlesEnabled = false;
    private int selectedSubtitleTrackId = -1;

    /*
     * 0 = Rewind
     * 1 = Play / Pause
     * 2 = Forward
     * 3 = CC
     */
    private int focusedControlIndex = 1;

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
                                if (subtitleMenuVisible) {
                                    closeSubtitleMenu();
                                    return;
                                }

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

/*
 * Keep Android TV awake while video is playing.
 * Prevent screen saver / power saving during playback.
 */
getWindow().addFlags(
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
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
         * CONTENT IDENTITY / RESUME
         * =====================================================
         */
        contentType = safeString(getIntent().getStringExtra("contentType"));
        contentId = safeString(getIntent().getStringExtra("contentId"));
        contentTitle = safeString(getIntent().getStringExtra("title"));
        seriesId = safeString(getIntent().getStringExtra("seriesId"));
        seasonNumber = getIntent().getIntExtra("seasonNumber", -1);
        episodeNumber = getIntent().getIntExtra("episodeNumber", -1);

        resumeKey = buildResumeKey();

        if (!resumeKey.isEmpty()) {
            pendingResumePosition =
                    getSharedPreferences(RESUME_PREFS, MODE_PRIVATE)
                            .getLong(resumeKey + "_position", 0L);
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
                                applyPendingResume();
                                
                            });
                            break;

                        case MediaPlayer.Event.Paused:
                            runOnUiThread(() -> {
                                updatePlayPauseIcon();
                                showControls();
                            });
                            break;

                        case MediaPlayer.Event.EndReached:
                            playbackCompleted = true;
                            clearResumePosition();
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

        ccButton =
                createControlButton(
                        "CC"
                );

        updateCcButton();

        buttonRow.addView(
                rewindButton
        );

        buttonRow.addView(
                playPauseButton
        );

        buttonRow.addView(
                forwardButton
        );

        buttonRow.addView(
                ccButton
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
                true
        );

        button.setFocusableInTouchMode(
                true
        );

        button.setClickable(
                false
        );

        button.setOnFocusChangeListener(
                (view, hasFocus) ->
                        updateControlButtonStyle(
                                (TextView) view,
                                hasFocus
                        )
        );

        button.setPadding(
                dp(22),
                dp(12),
                dp(22),
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
         * =====================================================
         * SUBTITLE LANGUAGE MENU
         * =====================================================
         */
        if (subtitleMenuVisible) {
            if (
                    keyCode ==
                    KeyEvent.KEYCODE_DPAD_UP
            ) {
                moveSubtitleMenuFocus(
                        -1
                );

                return true;
            }

            if (
                    keyCode ==
                    KeyEvent.KEYCODE_DPAD_DOWN
            ) {
                moveSubtitleMenuFocus(
                        1
                );

                return true;
            }

            if (
                    keyCode ==
                            KeyEvent.KEYCODE_DPAD_CENTER ||
                    keyCode ==
                            KeyEvent.KEYCODE_ENTER ||
                    keyCode ==
                            KeyEvent.KEYCODE_NUMPAD_ENTER
            ) {
                selectSubtitleMenuItem();

                return true;
            }

            if (
                    keyCode ==
                            KeyEvent.KEYCODE_DPAD_LEFT ||
                    keyCode ==
                            KeyEvent.KEYCODE_DPAD_RIGHT ||
                    keyCode ==
                            KeyEvent.KEYCODE_BACK
            ) {
                closeSubtitleMenu();

                return true;
            }

            return true;
        }

        /*
         * =====================================================
         * CONTROLS HIDDEN
         *
         * الأزرار لا تظهر إلا عند الضغط على OK.
         * LEFT / RIGHT يعملان Seek بدون إظهار الـControls.
         * =====================================================
         */
        if (!controlsVisible) {

            if (
                    keyCode ==
                    KeyEvent.KEYCODE_DPAD_LEFT
            ) {
                seekRelative(
                        -SEEK_STEP_MS
                );

                return true;
            }

            if (
                    keyCode ==
                    KeyEvent.KEYCODE_DPAD_RIGHT
            ) {
                seekRelative(
                        SEEK_STEP_MS
                );

                return true;
            }

            if (
                    keyCode ==
                            KeyEvent.KEYCODE_DPAD_CENTER ||
                    keyCode ==
                            KeyEvent.KEYCODE_ENTER ||
                    keyCode ==
                            KeyEvent.KEYCODE_NUMPAD_ENTER
            ) {
                showControls();
                focusControl(1);

                return true;
            }

            return super.dispatchKeyEvent(
                    event
            );
        }

        /*
         * =====================================================
         * CONTROLS VISIBLE
         * LEFT / RIGHT = Move focus
         * OK = Execute selected control
         * =====================================================
         */

        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_LEFT
        ) {
            moveControlFocus(
                    -1
            );

            showControls();

            return true;
        }

        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_RIGHT
        ) {
            moveControlFocus(
                    1
            );

            showControls();

            return true;
        }

        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_UP
        ) {
            showControls();

            return true;
        }

        if (
                keyCode ==
                KeyEvent.KEYCODE_DPAD_DOWN
        ) {
            focusControl(
                    1
            );

            showControls();

            return true;
        }

        if (
                keyCode ==
                        KeyEvent.KEYCODE_DPAD_CENTER ||
                keyCode ==
                        KeyEvent.KEYCODE_ENTER ||
                keyCode ==
                        KeyEvent.KEYCODE_NUMPAD_ENTER
        ) {
            executeFocusedControl();

            showControls();

            return true;
        }

        return super.dispatchKeyEvent(
                event
        );
    }

    /*
     * =========================================================
     * CONTROL FOCUS
     * =========================================================
     */

    private void moveControlFocus(
            int direction
    ) {
        int next =
                focusedControlIndex +
                direction;

        next =
                Math.max(
                        0,
                        Math.min(
                                3,
                                next
                        )
                );

        focusControl(
                next
        );
    }

    private void focusControl(
            int index
    ) {
        focusedControlIndex =
                Math.max(
                        0,
                        Math.min(
                                3,
                                index
                        )
                );

        TextView target =
                getControlButton(
                        focusedControlIndex
                );

        if (
                target != null
        ) {
            target.requestFocus();
        }
    }

    private TextView getControlButton(
            int index
    ) {
        switch (index) {
            case 0:
                return rewindButton;

            case 1:
                return playPauseButton;

            case 2:
                return forwardButton;

            case 3:
                return ccButton;

            default:
                return playPauseButton;
        }
    }

    private void executeFocusedControl() {
        switch (
                focusedControlIndex
        ) {
            case 0:
                seekRelative(
                        -SEEK_STEP_MS
                );
                break;

            case 1:
                togglePlayPause();
                break;

            case 2:
                seekRelative(
                        SEEK_STEP_MS
                );
                break;

            case 3:
                openSubtitleMenu();
                break;

            default:
                break;
        }
    }

    private void updateControlButtonStyle(
            TextView button,
            boolean focused
    ) {
        GradientDrawable background =
                new GradientDrawable();

        if (focused) {
            background.setColor(
                    Color.argb(
                            225,
                            26,
                            103,
                            230
                    )
            );

            background.setStroke(
                    dp(2),
                    Color.WHITE
            );

            button.setScaleX(
                    1.08f
            );

            button.setScaleY(
                    1.08f
            );
        } else {
            background.setColor(
                    Color.argb(
                            95,
                            18,
                            24,
                            42
                    )
            );

            button.setScaleX(
                    1.0f
            );

            button.setScaleY(
                    1.0f
            );
        }

        background.setCornerRadius(
                dp(14)
        );

        button.setBackground(
                background
        );
    }

    /*
     * =========================================================
     * SUBTITLES / CC
     * =========================================================
     */

    private void refreshSubtitleTracks() {
        if (
                mediaPlayer == null
        ) {
            return;
        }

        subtitleTrackIds.clear();
        subtitleTrackNames.clear();

        try {
            MediaPlayer.TrackDescription[] tracks =
                    mediaPlayer.getSpuTracks();

            if (
                    tracks != null
            ) {
                for (
                        MediaPlayer.TrackDescription track
                        : tracks
                ) {
                    if (
                            track == null ||
                            track.id == -1
                    ) {
                        continue;
                    }

                    subtitleTrackIds.add(
                            track.id
                    );

                    String name =
                            track.name;

                    if (
                            name == null ||
                            name.trim().isEmpty()
                    ) {
                        name =
                                "Subtitle " +
                                subtitleTrackIds.size();
                    }

                    subtitleTrackNames.add(
                            name.trim()
                    );
                }
            }

            subtitlesAvailable =
                    !subtitleTrackIds.isEmpty();

            int currentTrack =
                    mediaPlayer.getSpuTrack();

            subtitlesEnabled =
                    currentTrack != -1;

            selectedSubtitleTrackId =
                    currentTrack;

            updateCcButton();

        } catch (
                Exception ignored
        ) {
            subtitlesAvailable =
                    false;

            subtitlesEnabled =
                    false;

            selectedSubtitleTrackId =
                    -1;

            subtitleTrackIds.clear();
            subtitleTrackNames.clear();

            updateCcButton();
        }
    }

    private void openSubtitleMenu() {
        refreshSubtitleTracks();

        handler.removeCallbacks(
                hideControlsRunnable
        );

        if (
                subtitleMenuOverlay != null
        ) {
            ViewGroup parent =
                    (ViewGroup)
                            subtitleMenuOverlay
                                    .getParent();

            if (
                    parent != null
            ) {
                parent.removeView(
                        subtitleMenuOverlay
                );
            }
        }

        subtitleMenuOverlay =
                new FrameLayout(this);

        subtitleMenuOverlay.setBackgroundColor(
                Color.argb(
                        145,
                        0,
                        0,
                        0
                )
        );

        FrameLayout.LayoutParams overlayParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                );

        root.addView(
                subtitleMenuOverlay,
                overlayParams
        );

        LinearLayout panel =
                new LinearLayout(this);

        panel.setOrientation(
                LinearLayout.VERTICAL
        );

        panel.setPadding(
                dp(20),
                dp(18),
                dp(20),
                dp(18)
        );

        GradientDrawable panelBackground =
                new GradientDrawable();

        panelBackground.setColor(
                Color.argb(
                        245,
                        10,
                        17,
                        34
                )
        );

        panelBackground.setCornerRadius(
                dp(18)
        );

        panelBackground.setStroke(
                dp(1),
                Color.argb(
                        70,
                        255,
                        255,
                        255
                )
        );

        panel.setBackground(
                panelBackground
        );

        FrameLayout.LayoutParams panelParams =
                new FrameLayout.LayoutParams(
                        dp(380),
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        panelParams.gravity =
                Gravity.CENTER_VERTICAL |
                Gravity.RIGHT;

        panelParams.setMargins(
                0,
                0,
                dp(52),
                0
        );

        TextView title =
                new TextView(this);

        title.setText(
                "CC  •  SUBTITLES"
        );

        title.setTextColor(
                Color.WHITE
        );

        title.setTextSize(
                18
        );

        title.setPadding(
                dp(12),
                0,
                dp(12),
                dp(14)
        );

        panel.addView(
                title
        );

        TextView hint =
                new TextView(this);

        hint.setText(
                subtitlesAvailable
                        ? "Choose subtitle language"
                        : "No embedded subtitles found"
        );

        hint.setTextColor(
                Color.argb(
                        150,
                        255,
                        255,
                        255
                )
        );

        hint.setTextSize(
                12
        );

        hint.setPadding(
                dp(12),
                0,
                dp(12),
                dp(12)
        );

        panel.addView(
                hint
        );

        ScrollView scrollView =
                new ScrollView(this);

        subtitleMenuList =
                new LinearLayout(this);

        subtitleMenuList.setOrientation(
                LinearLayout.VERTICAL
        );

        scrollView.addView(
                subtitleMenuList,
                new ScrollView.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        panel.addView(
                scrollView,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                )
        );

        subtitleMenuItems.clear();

        addSubtitleMenuItem(
                "OFF"
        );

        for (
                String trackName
                : subtitleTrackNames
        ) {
            addSubtitleMenuItem(
                    trackName
            );
        }

        subtitleMenuOverlay.addView(
                panel,
                panelParams
        );

        subtitleMenuVisible =
                true;

        /*
         * Focus current active language.
         * 0 = OFF
         * 1..N = tracks
         */
        subtitleMenuIndex =
                0;

        if (
                subtitlesEnabled &&
                selectedSubtitleTrackId != -1
        ) {
            int currentIndex =
                    subtitleTrackIds.indexOf(
                            selectedSubtitleTrackId
                    );

            if (
                    currentIndex >= 0
            ) {
                subtitleMenuIndex =
                        currentIndex + 1;
            }
        }

        updateSubtitleMenuFocus();
    }

    private void addSubtitleMenuItem(
            String text
    ) {
        if (
                subtitleMenuList == null
        ) {
            return;
        }

        TextView item =
                new TextView(this);

        item.setText(
                text
        );

        item.setTextColor(
                Color.WHITE
        );

        item.setTextSize(
                15
        );

        item.setGravity(
                Gravity.CENTER_VERTICAL
        );

        item.setPadding(
                dp(16),
                dp(12),
                dp(16),
                dp(12)
        );

        LinearLayout.LayoutParams params =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(52)
                );

        params.setMargins(
                0,
                dp(3),
                0,
                dp(3)
        );

        item.setLayoutParams(
                params
        );

        subtitleMenuItems.add(
                item
        );

        subtitleMenuList.addView(
                item
        );
    }

    private void moveSubtitleMenuFocus(
            int direction
    ) {
        if (
                subtitleMenuItems.isEmpty()
        ) {
            return;
        }

        subtitleMenuIndex =
                Math.max(
                        0,
                        Math.min(
                                subtitleMenuItems.size() -
                                        1,
                                subtitleMenuIndex +
                                        direction
                        )
                );

        updateSubtitleMenuFocus();
    }

    private void updateSubtitleMenuFocus() {
        for (
                int i = 0;
                i < subtitleMenuItems.size();
                i++
        ) {
            TextView item =
                    subtitleMenuItems.get(
                            i
                    );

            GradientDrawable background =
                    new GradientDrawable();

            if (
                    i ==
                    subtitleMenuIndex
            ) {
                background.setColor(
                        Color.argb(
                                230,
                                25,
                                107,
                                235
                        )
                );

                background.setStroke(
                        dp(2),
                        Color.WHITE
                );

                item.setTextColor(
                        Color.WHITE
                );

                item.setScaleX(
                        1.02f
                );

                item.setScaleY(
                        1.02f
                );

                item.post(
                        () -> {
                            if (
                                    item.getParent() !=
                                    null
                            ) {
                                item.requestRectangleOnScreen(
                                        new android.graphics.Rect(
                                                0,
                                                0,
                                                item.getWidth(),
                                                item.getHeight()
                                        )
                                );
                            }
                        }
                );

            } else {
                background.setColor(
                        Color.argb(
                                70,
                                255,
                                255,
                                255
                        )
                );

                item.setTextColor(
                        Color.argb(
                                225,
                                255,
                                255,
                                255
                        )
                );

                item.setScaleX(
                        1f
                );

                item.setScaleY(
                        1f
                );
            }

            background.setCornerRadius(
                    dp(12)
            );

            item.setBackground(
                    background
            );
        }
    }

    private void selectSubtitleMenuItem() {
        if (
                mediaPlayer == null
        ) {
            closeSubtitleMenu();
            return;
        }

        if (
                subtitleMenuIndex ==
                0
        ) {
            try {
                mediaPlayer.setSpuTrack(
                        -1
                );
            } catch (
                    Exception ignored
            ) {
            }

            subtitlesEnabled =
                    false;

            selectedSubtitleTrackId =
                    -1;

            updateCcButton();
            closeSubtitleMenu();

            return;
        }

        int trackArrayIndex =
                subtitleMenuIndex -
                1;

        if (
                trackArrayIndex < 0 ||
                trackArrayIndex >=
                        subtitleTrackIds.size()
        ) {
            return;
        }

        int trackId =
                subtitleTrackIds.get(
                        trackArrayIndex
                );

        try {
            boolean changed =
                    mediaPlayer.setSpuTrack(
                            trackId
                    );

            if (changed) {
                selectedSubtitleTrackId =
                        trackId;

                subtitlesEnabled =
                        true;
            }
        } catch (
                Exception ignored
        ) {
        }

        updateCcButton();
        closeSubtitleMenu();
    }

    private void closeSubtitleMenu() {
        subtitleMenuVisible =
                false;

        if (
                subtitleMenuOverlay != null
        ) {
            ViewGroup parent =
                    (ViewGroup)
                            subtitleMenuOverlay
                                    .getParent();

            if (
                    parent != null
            ) {
                parent.removeView(
                        subtitleMenuOverlay
                );
            }

            subtitleMenuOverlay =
                    null;
        }

        subtitleMenuList =
                null;

        subtitleMenuItems.clear();

        showControls();
        focusControl(3);
    }

    private String getSelectedSubtitleName() {
        if (
                !subtitlesEnabled ||
                selectedSubtitleTrackId ==
                -1
        ) {
            return "";
        }

        int index =
                subtitleTrackIds.indexOf(
                        selectedSubtitleTrackId
                );

        if (
                index < 0 ||
                index >=
                        subtitleTrackNames.size()
        ) {
            return "";
        }

        return subtitleTrackNames.get(
                index
        );
    }

    private void updateCcButton() {
        if (
                ccButton == null
        ) {
            return;
        }

        if (
                !subtitlesAvailable
        ) {
            ccButton.setText(
                    "CC"
            );

            ccButton.setTextColor(
                    Color.argb(
                            145,
                            255,
                            255,
                            255
                    )
            );

            return;
        }

        if (
                subtitlesEnabled
        ) {
            String languageName =
                    getSelectedSubtitleName();

            if (
                    languageName.length() >
                    10
            ) {
                languageName =
                        languageName.substring(
                                0,
                                10
                        );
            }

            ccButton.setText(
                    languageName.isEmpty()
                            ? "CC ON"
                            : "CC " +
                              languageName
            );

            ccButton.setTextColor(
                    Color.rgb(
                            86,
                            188,
                            255
                    )
            );

        } else {
            ccButton.setText(
                    "CC OFF"
            );

            ccButton.setTextColor(
                    Color.WHITE
            );
        }
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

        if (
                getControlButton(
                        focusedControlIndex
                ) != null &&
                !getControlButton(
                        focusedControlIndex
                ).hasFocus()
        ) {
            focusControl(
                    focusedControlIndex
            );
        }

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
                controlsContainer == null ||
                subtitleMenuVisible
        ) {
            return;
        }

        controlsContainer.setVisibility(
                View.GONE
        );

        controlsVisible =
                false;

        if (
                getCurrentFocus() != null
        ) {
            getCurrentFocus()
                    .clearFocus();
        }
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
     * RESUME HELPERS
     * =========================================================
     */

    private String safeString(String value) {
        return value == null ? "" : value.trim();
    }

    private String buildResumeKey() {
        if (contentType.isEmpty() || contentId.isEmpty()) {
            return "";
        }

        if ("movie".equals(contentType)) {
            return "movie_" + contentId;
        }

        if ("episode".equals(contentType)) {
            StringBuilder key = new StringBuilder("episode_");

            if (!seriesId.isEmpty()) {
                key.append(seriesId).append("_");
            }

            if (seasonNumber >= 0) {
                key.append("s").append(seasonNumber).append("_");
            }

            if (episodeNumber >= 0) {
                key.append("e").append(episodeNumber).append("_");
            }

            key.append(contentId);
            return key.toString();
        }

        return "";
    }

    private void applyPendingResume() {
        if (resumeApplied || mediaPlayer == null || resumeKey.isEmpty()) {
            return;
        }

        long duration = mediaPlayer.getLength();

        if (duration <= 0) {
            return;
        }

        resumeApplied = true;

        if (
                pendingResumePosition >= MIN_RESUME_POSITION_MS &&
                pendingResumePosition <
                        (long) (duration * COMPLETED_PERCENT)
        ) {
            long target =
                    Math.min(
                            pendingResumePosition,
                            Math.max(0L, duration - 1_000L)
                    );

            mediaPlayer.setTime(target);
            updateProgress();
        } else if (pendingResumePosition > 0) {
            clearResumePosition();
        }
    }

    private void saveResumePosition() {
        if (
                playbackCompleted ||
                mediaPlayer == null ||
                resumeKey.isEmpty()
        ) {
            return;
        }

        long current = mediaPlayer.getTime();
        long duration = mediaPlayer.getLength();

        if (current < MIN_RESUME_POSITION_MS || duration <= 0) {
            clearResumePosition();
            return;
        }

        if (
                ((float) current / (float) duration) >=
                        COMPLETED_PERCENT
        ) {
            clearResumePosition();
            return;
        }

        SharedPreferences.Editor editor =
                getSharedPreferences(RESUME_PREFS, MODE_PRIVATE)
                        .edit();

        editor.putLong(resumeKey + "_position", current);
        editor.putLong(resumeKey + "_duration", duration);
        editor.putString(resumeKey + "_type", contentType);
        editor.putString(resumeKey + "_id", contentId);
        editor.putString(resumeKey + "_title", contentTitle);
        editor.putString(resumeKey + "_seriesId", seriesId);
        editor.putInt(resumeKey + "_season", seasonNumber);
        editor.putInt(resumeKey + "_episode", episodeNumber);
        editor.putLong(
                resumeKey + "_updatedAt",
                System.currentTimeMillis()
        );
        editor.apply();
    }

    private void clearResumePosition() {
        if (resumeKey.isEmpty()) {
            return;
        }

        SharedPreferences preferences =
                getSharedPreferences(RESUME_PREFS, MODE_PRIVATE);

        SharedPreferences.Editor editor = preferences.edit();
        String prefix = resumeKey + "_";

        for (String key : preferences.getAll().keySet()) {
            if (key != null && key.startsWith(prefix)) {
                editor.remove(key);
            }
        }

        editor.apply();
        pendingResumePosition = 0L;
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
            saveResumePosition();

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