# Android APK Install & Play Guide (ChartWorkspace /game)

This guide explains how to download, install, and play the latest Android build from **GitHub Releases**.

## 1) Download the correct file (.apk, not workflow zip)
1. Open the repository **Releases** page.
2. Download `chartworkspace-game-release.apk` from the **Assets** section.
3. (Optional) Download `chartworkspace-game-release.aab` for Play Console distribution.

> Note: files under **Actions → Artifacts** are always wrapped as `.zip` by GitHub. Use **Releases assets** when you need a directly installable `.apk`.

## 2) Fastest install methods

### Method A — install directly on phone
1. Tap `chartworkspace-game-release.apk` in Downloads.
2. Allow your browser/file manager to install unknown apps (Android will prompt once).
3. Tap **Install**.

### Method B — instant install from desktop (ADB, recommended for testing)
```bash
adb devices
adb install -r chartworkspace-game-release.apk
```

## 3) First launch / play
1. Ensure internet connection (TWA serves live web content).
2. Open app; it launches directly into `/game` scope.
3. Create profile and start playing.

## 4) Update to latest build
- Download latest APK from the newest GitHub Release and install over existing app.
- With ADB: `adb install -r chartworkspace-game-release.apk`

## Troubleshooting
- **Only got .zip**: download from **Release assets**, not Actions artifact.
- **App not installing**: re-check unknown-app permission and storage space.
- **Blank screen/network issue**: verify `https://<host>/game` is reachable.
- **Build pipeline fails at Bubblewrap**: ensure `https://<host>/manifest.webmanifest` is live and valid before triggering TWA release.
