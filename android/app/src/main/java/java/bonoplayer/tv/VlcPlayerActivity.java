package com.bonoplayer.tv;

import android.net.Uri;
import android.os.Bundle;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.FrameLayout;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import org.videolan.libvlc.LibVLC;
import org.videolan.libvlc.Media;
import org.videolan.libvlc.MediaPlayer;

import java.util.ArrayList;

public class VlcPlayerActivity extends AppCompatActivity {

    private LibVLC libVLC;
    private MediaPlayer mediaPlayer;
    private SurfaceView surfaceView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(
        this,
        new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                finish();
            }
        }
);

        /*
         * FULL SCREEN
         */
        ActionBar actionBar = getSupportActionBar();

        if (actionBar != null) {
            actionBar.hide();
        }

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

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

        /*
         * ROOT VIEW
         */
        FrameLayout root = new FrameLayout(this);

        root.setLayoutParams(
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        root.setBackgroundColor(
                android.graphics.Color.BLACK
        );

        /*
         * VLC SURFACE
         */
        surfaceView = new SurfaceView(this);

        FrameLayout.LayoutParams videoParams =
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                );

        root.addView(
                surfaceView,
                videoParams
        );

        setContentView(root);

        /*
         * STREAM URL
         */
        String streamUrl =
                getIntent().getStringExtra("streamUrl");

        if (
                streamUrl == null ||
                streamUrl.isEmpty()
        ) {
            finish();
            return;
        }

        /*
         * LIBVLC
         */
        ArrayList<String> options =
                new ArrayList<>();

        options.add("--network-caching=800");

        libVLC =
                new LibVLC(
                        this,
                        options
                );

        mediaPlayer =
                new MediaPlayer(libVLC);

        mediaPlayer
                .getVLCVout()
                .setVideoView(surfaceView);

        mediaPlayer
                .getVLCVout()
                .attachViews();

        /*
         * FORCE VLC TO USE FULL WINDOW
         */
        surfaceView.post(() -> {
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
         * MEDIA
         */
        Media media =
        new Media(
                libVLC,
                Uri.parse(streamUrl)
        );

media.setHWDecoderEnabled(true, false);

media.addOption(":network-caching=800");
media.addOption(":clock-jitter=0");
media.addOption(":clock-synchro=0");

mediaPlayer.setMedia(media);

media.release();

mediaPlayer.play();
    }

    @Override
    public void onWindowFocusChanged(
            boolean hasFocus
    ) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
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
    }

    @Override
    protected void onStop() {
        super.onStop();

        if (mediaPlayer != null) {
            mediaPlayer.stop();

            mediaPlayer
                    .getVLCVout()
                    .detachViews();

            mediaPlayer.release();
            mediaPlayer = null;
        }

        if (libVLC != null) {
            libVLC.release();
            libVLC = null;
        }
    }
}