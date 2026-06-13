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

    private String ytDlpPath;

    @Override
    public void load() {
        try {
            File ytDlpFile = new File(getContext().getFilesDir(), "yt-dlp");
            if (!ytDlpFile.exists()) {
                InputStream is = getContext().getAssets().open("assets/yt-dlp");
                FileOutputStream fos = new FileOutputStream(ytDlpFile);
                byte[] buffer = new byte[1024];
                int length;
                while ((length = is.read(buffer)) > 0) {
                    fos.write(buffer, 0, length);
                }
                is.close();
                fos.close();
                ytDlpFile.setExecutable(true);
            }
            ytDlpPath = ytDlpFile.getAbsolutePath();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void getAudioUrl(PluginCall call) {
        String youtubeUrl = call.getString("url");
        
        if (youtubeUrl == null || youtubeUrl.isEmpty()) {
            call.reject("No URL provided");
            return;
        }
        
        try {
            ProcessBuilder pb = new ProcessBuilder(
                ytDlpPath,
                "-f", "bestaudio",
                "-g",
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
            
            process.waitFor();
            
            String streamUrl = output.toString().trim();
            
            if (streamUrl.isEmpty() || streamUrl.contains("ERROR")) {
                call.reject("Failed to extract audio: " + streamUrl);
                return;
            }
            
            JSObject result = new JSObject();
            result.put("url", streamUrl);
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadSong(PluginCall call) {
        String youtubeUrl = call.getString("url");
        String videoId = call.getString("videoId");

        if (youtubeUrl == null || youtubeUrl.isEmpty() || videoId == null || videoId.isEmpty()) {
            call.reject("URL and videoId are required");
            return;
        }

        try {
            File localFile = new File(getContext().getFilesDir(), videoId + ".m4a");
            if (localFile.exists() && localFile.length() > 0) {
                JSObject result = new JSObject();
                result.put("url", "file://" + localFile.getAbsolutePath());
                result.put("localPath", localFile.getAbsolutePath());
                result.put("status", "exists");
                call.resolve(result);
                return;
            }

            // Run yt-dlp to download m4a directly to app's files directory
            ProcessBuilder pb = new ProcessBuilder(
                ytDlpPath,
                "-f", "ba[ext=m4a]",
                "-o", localFile.getAbsolutePath(),
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
            if (exitCode != 0 || !localFile.exists() || localFile.length() == 0) {
                call.reject("Download failed: " + output.toString());
                return;
            }

            JSObject result = new JSObject();
            result.put("url", "file://" + localFile.getAbsolutePath());
            result.put("localPath", localFile.getAbsolutePath());
            result.put("status", "downloaded");
            call.resolve(result);

        } catch (Exception e) {
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
            File localFile = new File(getContext().getFilesDir(), videoId + ".m4a");
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
            call.reject("Error: " + e.getMessage());
        }
    }
}

