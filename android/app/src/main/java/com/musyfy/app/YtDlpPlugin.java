package com.musyfy.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import com.yausername.youtubedl_android.YoutubeDL;
import com.yausername.youtubedl_android.YoutubeDLRequest;
import com.yausername.youtubedl_android.YoutubeDLResponse;
import java.util.Collections;

@CapacitorPlugin(name = "YtDlp")
public class YtDlpPlugin extends Plugin {

    private static final String TAG = "YTDLP";
    private String ytDlpPath;

    @Override
    public void load() {
        Log.d(TAG, "Plugin load started");

        new Thread(() -> {
            try {
                Log.d(TAG, "Update started");
                YoutubeDL.getInstance().init(getContext());
                YoutubeDL.getInstance().updateYoutubeDL(getContext(), YoutubeDL.UpdateChannel._STABLE);
                Log.d(TAG, "Update completed");
            } catch (Exception e) {
                Log.e(TAG, "Update failed", e);
            }
        }).start();
    }

    @PluginMethod
    public void getAudioUrl(PluginCall call) {

        Log.d(TAG, "getAudioUrl called");

        String youtubeUrl = call.getString("url");

        Log.d(TAG, "URL received: " + youtubeUrl);

        if (youtubeUrl == null || youtubeUrl.isEmpty()) {

            Log.e(TAG, "No URL provided");

            call.reject("No URL provided");
            return;
        }

        new Thread(() -> {
            try {
                YoutubeDL.getInstance().init(getContext());

                YoutubeDLRequest request = new YoutubeDLRequest(youtubeUrl);
                request.addOption("-f", "bestaudio");
                request.addOption("-g");

                Log.d(TAG, "Extracting audio URL using YoutubeDL: " + youtubeUrl);
                YoutubeDLResponse response = YoutubeDL.getInstance().execute(request);

                String streamUrl = response.getOut();
                if (streamUrl != null) {
                    streamUrl = streamUrl.trim();
                }

                if (streamUrl == null || streamUrl.isEmpty() || streamUrl.contains("ERROR")) {

                    Log.e(TAG, "Failed to extract audio: " + streamUrl);

                    call.reject("Failed to extract audio: " + streamUrl);
                    return;
                }

                JSObject result = new JSObject();
                result.put("url", streamUrl);

                Log.d(TAG, "Returning stream URL");

                call.resolve(result);

            } catch (Exception e) {

                Log.e(TAG, "getAudioUrl failed", e);

                call.reject("Error: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void downloadSong(PluginCall call) {

        Log.d(TAG, "downloadSong called");

        String youtubeUrl = call.getString("url");
        String videoId = call.getString("videoId");

        if (youtubeUrl == null || youtubeUrl.isEmpty() ||
                videoId == null || videoId.isEmpty()) {

            call.reject("URL and videoId are required");
            return;
        }

        new Thread(() -> {
            try {
                YoutubeDL.getInstance().init(getContext());

                File localFile = new File(
                        getContext().getFilesDir(),
                        videoId + ".m4a"
                );

                Log.d(TAG, "Download target path: " + localFile.getAbsolutePath());

                if (localFile.exists() && localFile.length() > 0) {
                    Log.d(TAG, "Cache hit: File already exists and is valid. Skipping download.");
                    JSObject result = new JSObject();
                    result.put("status", "exists");
                    result.put("localPath", localFile.getAbsolutePath());
                    result.put("fileName", localFile.getName());
                    result.put("fileSize", localFile.length());
                    result.put("url", "file://" + localFile.getAbsolutePath());
                    call.resolve(result);
                    return;
                } else if (localFile.exists()) {
                    Log.d(TAG, "Cache corrupted (size 0). Deleting file and re-downloading.");
                    localFile.delete();
                }

                YoutubeDLRequest request = new YoutubeDLRequest(youtubeUrl);
                request.addOption("-f", "ba[ext=m4a]/bestaudio");
                request.addOption("-o", localFile.getAbsolutePath());

                Log.d(TAG, "Starting YoutubeDL download: " + youtubeUrl);
                YoutubeDLResponse response = YoutubeDL.getInstance().execute(request);

                Log.d(TAG, "Download executed. Exit code: " + response.getExitCode());

                if (!localFile.exists() || localFile.length() == 0) {
                    Log.e(TAG, "Post-download verification failed: file does not exist or is empty");
                    call.reject("Download failed: File verification failed post-download");
                    return;
                }

                JSObject result = new JSObject();
                result.put("status", "downloaded");
                result.put("localPath", localFile.getAbsolutePath());
                result.put("fileName", localFile.getName());
                result.put("fileSize", localFile.length());
                result.put("url", "file://" + localFile.getAbsolutePath());
                Log.d(TAG, "Downloaded file size = " + localFile.length());
                Log.d(TAG, "Download successful. Returning local path.");
                call.resolve(result);

            } catch (Exception e) {

                Log.e(TAG, "downloadSong failed", e);
                call.reject("Error: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void checkDownloadStatus(PluginCall call) {

        Log.d(TAG, "checkDownloadStatus called");

        String videoId = call.getString("videoId");

        if (videoId == null || videoId.isEmpty()) {

            call.reject("videoId is required");
            return;
        }

        try {

            File localFile = new File(
                    getContext().getFilesDir(),
                    videoId + ".m4a"
            );

            JSObject result = new JSObject();

            if (localFile.exists() && localFile.length() > 0) {

                result.put("isDownloaded", true);
                result.put("url", "file://" + localFile.getAbsolutePath());
                result.put("localPath", localFile.getAbsolutePath());
                result.put("fileName", localFile.getName());
                result.put("fileSize", localFile.length());

            } else {

                result.put("isDownloaded", false);
            }

            call.resolve(result);

        } catch (Exception e) {

            Log.e(TAG, "checkDownloadStatus failed", e);

            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testYtDlp(PluginCall call) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    YoutubeDL.getInstance().init(getContext());
                    YoutubeDLRequest request = new YoutubeDLRequest("");
                    request.addOption("--version");
                    YoutubeDLResponse response = YoutubeDL.getInstance().execute(request);
                    String versionOutput = response.getOut();
                    JSObject result = new JSObject();
                    result.put("version", versionOutput != null ? versionOutput.trim() : "Unknown");
                    call.resolve(result);
                } catch (Exception e) {
                    Log.e(TAG, "testYtDlp failed", e);
                    call.reject("Error: " + e.getMessage());
                }
            }
        }).start();
    }
    @PluginMethod
    public void getVideoInfo(PluginCall call) {

        String url = call.getString("url");

        if (url == null || url.isEmpty()) {
            call.reject("URL required");
            return;
        }

        new Thread(() -> {
            try {

                YoutubeDL.getInstance().init(getContext());

                YoutubeDLRequest request = new YoutubeDLRequest(url);

                request.addOption("--dump-single-json");
                request.addOption("--no-download");

                YoutubeDLResponse response =
                        YoutubeDL.getInstance().execute(request);

                JSObject result = new JSObject();
                result.put("json", response.getOut());

                call.resolve(result);

            } catch (Exception e) {

                Log.e(TAG, "getVideoInfo failed", e);

                call.reject("Error: " + e.getMessage());
            }
        }).start();
    }
}
