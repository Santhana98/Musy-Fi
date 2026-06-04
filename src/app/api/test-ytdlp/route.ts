import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const maxDuration = 60;

function runCmd(binary: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    console.log(`Running: ${binary} ${args.join(' ')}`);
    const proc = spawn(binary, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: err.message });
    });
  });
}

export async function GET() {
  const diagnostics: any = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd(),
    tempDir: process.env.VERCEL ? '/tmp' : os.tmpdir(),
    files: {},
    steps: []
  };

  try {
    const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const bundledPath = path.join(process.cwd(), 'bin', name);
    const tmpPath = path.join('/tmp', name);

    diagnostics.files.bundledPath = {
      path: bundledPath,
      exists: fs.existsSync(bundledPath),
      size: fs.existsSync(bundledPath) ? fs.statSync(bundledPath).size : 0
    };

    diagnostics.files.tmpPath = {
      path: tmpPath,
      exists: fs.existsSync(tmpPath),
      size: fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0
    };

    // Step 1: Copy and chmod if Linux
    if (process.platform !== 'win32') {
      try {
        if (fs.existsSync(bundledPath)) {
          if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
          }
          fs.copyFileSync(bundledPath, tmpPath);
          fs.chmodSync(tmpPath, '755');
          diagnostics.steps.push({
            name: 'Copy and Chmod 755',
            status: 'SUCCESS',
            details: `Copied ${bundledPath} to ${tmpPath} and set chmod 755`
          });
        } else {
          diagnostics.steps.push({
            name: 'Copy and Chmod 755',
            status: 'FAILED',
            details: `Bundled file not found at ${bundledPath}`
          });
        }
      } catch (err: any) {
        diagnostics.steps.push({
          name: 'Copy and Chmod 755',
          status: 'ERROR',
          details: err.message
        });
      }
    }

    const testBinary = process.platform === 'win32' ? bundledPath : tmpPath;

    // Step 2: Run --version
    if (fs.existsSync(testBinary)) {
      const versionRes = await runCmd(testBinary, ['--version']);
      diagnostics.steps.push({
        name: 'Check Version (--version)',
        status: versionRes.code === 0 ? 'SUCCESS' : 'FAILED',
        code: versionRes.code,
        stdout: versionRes.stdout.trim(),
        stderr: versionRes.stderr.trim()
      });

      // Step 3: Test different player clients to bypass bot detection
      const videoUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';
      
      const clientTests = [
        { name: 'Default Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba'] },
        { name: 'TV Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba', '--extractor-args', 'youtube:player_client=tv'] },
        { name: 'Android Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba', '--extractor-args', 'youtube:player_client=android'] },
        { name: 'iOS Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba', '--extractor-args', 'youtube:player_client=ios'] },
        { name: 'mweb Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba', '--extractor-args', 'youtube:player_client=mweb'] },
        { name: 'TV + iOS Client', args: [videoUrl, '-g', '-f', '18/140/ba[ext=m4a]/ba', '--extractor-args', 'youtube:player_client=tv,ios'] }
      ];

      for (const test of clientTests) {
        const testRes = await runCmd(testBinary, test.args);
        diagnostics.steps.push({
          name: `Test: ${test.name}`,
          status: testRes.code === 0 ? 'SUCCESS' : 'FAILED',
          code: testRes.code,
          stdout: testRes.stdout.trim(),
          stderr: testRes.stderr.trim()
        });
      }
      
    } else {
      diagnostics.steps.push({
        name: 'Executable Execution',
        status: 'FAILED',
        details: `Executable not found at ${testBinary}`
      });
    }

  } catch (err: any) {
    diagnostics.globalError = err.message;
  }

  return NextResponse.json(diagnostics);
}
