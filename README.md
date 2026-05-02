# Telegram Media Downloader

## Summary

Download photos, videos, audio, and documents from Telegram Web chats, groups, and channels.

## Description

Telegram Media Downloader is a lightweight browser extension that helps you save media from Telegram Web faster. Instead of opening and saving each file manually, you can open a Telegram chat, group, or channel, scroll to load the media you want, and start downloading directly from the extension popup.

The extension can detect visible media in the current Telegram Web page and download supported files to your browser's Downloads folder. It includes simple controls for choosing file types, setting a maximum number of files, and tracking download progress.

## Features

- Download media from Telegram Web.
- Supports photos, videos, audio files, and documents.
- Choose which media types to include.
- Set a maximum number of files per download run.
- View live counts for found, saved, and failed files.
- Saves files locally through the browser download system.
- No account credentials are requested by the extension.
- No external server is used by the extension.

## How To Use

1. Open `https://web.telegram.org`.
2. Sign in to your Telegram account.
3. Open the chat, group, or channel that contains the media you want.
4. Scroll through the page so Telegram Web loads the media.
5. Open the Telegram Media Downloader extension popup.
6. Select the media types you want to download.
7. Click **Download**.

Downloaded files are saved in your browser's Downloads folder, usually inside a `Telegram Media` subfolder.

## Important Notes

Telegram Web loads messages and media gradually. The extension can only detect media that is currently loaded in the page. If older files are not found, scroll further through the chat or media view before starting the download.

Some Telegram files may use temporary or protected browser URLs. Availability can depend on Telegram Web, browser permissions, and whether the media is currently loaded and accessible in the page.

## Permissions

This extension requests only the permissions needed for its core functionality:

- `activeTab`: Allows the extension to work with the Telegram Web tab you are currently using.
- `downloads`: Allows the extension to save detected media through the browser download system.
- `scripting`: Allows the extension to inject its page script when needed.
- `storage`: Reserved for extension settings and future local preferences.
- `https://web.telegram.org/*`: Limits extension access to Telegram Web.

## Privacy

Telegram Media Downloader does not collect, sell, or transmit personal data to an external server.

The extension works locally in your browser. It reads media URLs from the active Telegram Web page only when you use it, then asks the browser to download those files.

## Support

If the extension does not find media, make sure:

- You are using Telegram Web at `https://web.telegram.org`.
- You opened the chat, group, or channel that contains the files.
- You scrolled enough for Telegram Web to load the media.
- Your browser allowed downloads from the extension.

## Disclaimer

This extension is an independent tool and is not affiliated with, endorsed by, or sponsored by Telegram.

Only download media you have the right to access and save. Respect copyright, privacy, and the rules of the chats, groups, and channels you use.
