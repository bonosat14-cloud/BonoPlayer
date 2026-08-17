package com.bonoplayer.tv;

import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

public class NativePlayerActivity extends AppCompatActivity {

    private ExoPlayer player;
    private PlayerView playerView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        playerView = new PlayerView(this);

playerView.setUseController(true);
playerView.setControllerAutoShow(true);
playerView.setControllerShowTimeoutMs(3000);
playerView.setControllerHideOnTouch(true);

setContentView(playerView);
        String streamUrl = getIntent().getStringExtra("streamUrl");

        if (streamUrl == null || streamUrl.isEmpty()) {
            finish();
            return;
        }

        player = new ExoPlayer.Builder(this).build();

        playerView.setPlayer(player);

        MediaItem mediaItem =
                MediaItem.fromUri(Uri.parse(streamUrl));

        player.setMediaItem(mediaItem);
        player.prepare();
        player.play();
        
        playerView.showController();

        player.addListener(new Player.Listener() {
            @Override
            public void onPlayerError(
                    androidx.media3.common.PlaybackException error
            ) {
                error.printStackTrace();
            }
        });
    }

    @Override
    protected void onStop() {
        super.onStop();

        if (player != null) {
            player.release();
            player = null;
        }
    }
}