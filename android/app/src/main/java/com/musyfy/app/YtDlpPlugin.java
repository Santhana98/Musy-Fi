package com.musyfy.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "YtDlp")
public class YtDlpPlugin extends Plugin {

    private static final String TAG = "YTDLP";
    private String ytDlpPath;

    @Override
    public void load() {
        android.util.Log.d(TAG, "Plugin load() started");

        try {
            File ytDlpFile = new File(getContext().getFilesDir(), "yt-dlp");

            android.util.Log.d(TAG, "Files dir: " + getContext().getFilesDir());
            android.util.Log.d(TAG, "Target binary: " + ytDlpFile.getAbsolutePath());

            if (!ytDlpFile.exists()) {

                android.util.Log.d(TAG, "yt-dlp binary not found. Extracting from assets...");

                InputStream is = getContext().getAssets().open("assets/yt-dlp");

                FileOutputStream fos = new FileOutputStream(ytDlpFile);

                byte[] buffer = new byte[1024];
                int length;

                while ((length = is.read(buffer)) > 0) {
                    fos.write(buffer, 0, length);
                }

                is.close();
                fos.close();

                boolean executableSet = ytDlpFile.setExecutable(true);

                android.util.Log.d(
                    TAG,
                    "Extraction complete. Executable set = " + executableSet
                );
            }

            ytDlpFile.setExecutable(true);

            android.util.Log.d(TAG, "File exists = " + ytDlpFile.exists());
            android.util.Log.d(TAG, "File size = " + ytDlpFile.length());
            android.util.Log.d(TAG, "Can execute = " + ytDlpFile.canExecute());

            ytDlpPath = ytDlpFile.getAbsolutePath();

            android.util.Log.d(TAG, "ytDlpPath = " + ytDlpPath);

        } catch (Exception e) {
            android.util.Log.e(TAG, "load() failed", e);
        }
    }

    @PluginMethod
    public void getAudioUrl(PluginCall call) {

        android.util.Log.d(TAG, "==============================");
        android.util.Log.d(TAG, "getAudioUrl() called");

        String youtubeUrl = call.getString("url");

        android.util.Log.d(TAG, "URL = " + youtubeUrl);

        if (youtubeUrl == null || youtubeUrl.isEmpty()) {

            android.util.Log.e(TAG, "No URL provided");

            call.reject("No URL provided");
            return;
        }

        try {

            android.util.Log.d(TAG, "Creating ProcessBuilder");

            ProcessBuilder pb = new ProcessBuilder(
                ytDlpPath,
                "-f",
                "bestaudio",
                "-g",
                youtubeUrl
            );

            pb.redirectErrorStream(true);

            android.util.Log.d(TAG, "Starting yt-dlp process...");
            android.util.Log.d(TAG, "Binary path = " + ytDlpPath);

            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );

            StringBuilder output = new StringBuilder();

            String line;

            while ((line = reader.readLine()) != null) {
                android.util.Log.d(TAG, "yt-dlp: " + line);
                output.append(line).append("\n");
            }

            int exitCode = process.waitFor();

            android.util.Log.d(TAG, "Process exit code = " + exitCode);

            String streamUrl = output.toString().trim();

            android.util.Log.d(TAG, "Output length = " + streamUrl.length());

            if (streamUrl.isEmpty() || streamUrl.contains("ERROR")) {

                android.util.Log.e(TAG, "Extraction failed");
                android.util.Log.e(TAG, "Output = " + streamUrl);

                call.reject("Failed to extract audio: " + streamUrl);
                return;
            }

            android.util.Log.d(TAG, "Extraction successful");

            JSObject result = new JSObject();
            result.put("url", streamUrl);

            call.resolve(result);

        } catch (Exception e) {

            android.util.Log.e(TAG, "Execution failed", e);

            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadSong(PluginCall call) {

        android.util.Log.d(TAG, "downloadSong() called");

        String youtubeUrl = call.getString("url");
        String videoId = call.getString("videoId");

        if (youtubeUrl == null ||
            youtubeUrl.isEmpty() ||
            videoId == null ||
            videoId.isEmpty()) {

            call.reject("URL and videoId are required");
            return;
        }

        try {

            File localFile =
                new File(getContext().getFilesDir(), videoId + ".m4a");

            if (localFile.exists() && localFile.length() > 0) {

                JSObject result = new JSObject();
                result.put("url", "file://" + localFile.getAbsolutePath());
                result.put("localPath", localFile.getAbsolutePath());
                result.put("status", "exists");

                call.resolve(result);
                return;
            }

            ProcessBuilder pb = new ProcessBuilder(
                ytDlpPath,
                "-f",
                "ba[ext=m4a]",
                "-o",
                localFile.getAbsolutePath(),
                youtubeUrl
            );

            pb.redirectErrorStream(true);

            Process process = pb.start();

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream())
            );

            StringBuilder output = new StringBuilder();

            String line;

            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }

            int exitCode = process.waitFor();

            if (exitCode != 0 ||
                !localFile.exists() ||
                localFile.length() == 0) {

                call.reject("Download failed: " + output);
                return;
            }

            JSObject result = new JSObject();
            result.put("url", "file://" + localFile.getAbsolutePath());
            result.put("localPath", localFile.getAbsolutePath());
            result.put("status", "downloaded");

            call.resolve(result);

        } catch (Exception e) {

            android.util.Log.e(TAG, "downloadSong failed", e);

            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkDownloadStatus(PluginCall call) {

        String videoId = call.getString("videoId");

        if (videoId == null || videoId.isEmpty()) {
            call.reject("videoId is required");
            return;
        }

        try {

            File localFile =
                new File(getContext().getFilesDir(), videoId + ".m4a");

            JSObject result = new JSObject();

            if (localFile.exists() && localFile.length() > 0) {

                result.put("isDownloaded", true);
                result.put("url", "file://" + localFile.getAbsolutePath());
                result.put("localPath", localFile.getAbsolutePath());

            } else {

                result.put("isDownloaded", false);
            }

            call.resolve(result);

        } catch (Exception e) {

            android.util.Log.e(TAG, "checkDownloadStatus failed", e);

            call.reject("Error: " + e.getMessage());
        }
    }
}
