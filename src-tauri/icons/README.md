# shakshuka App Icons

This folder holds the application icons used by the Windows installer and the app itself.

Steps to use your attached icon:

1) Save the provided image as:
   - `src-tauri/icons/icon.png` (512x512 preferred)
   - `src-tauri/icons/icon.ico` (multi-size ICO, includes 16/32/48/256 px)

   Source image (from your message):
   https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/icon-1759092406480.png

2) Create the `.ico` file (if you only have PNG):
   - Use any icon generator (e.g., realfavicongenerator.net or icoconvert.com)
   - Ensure multiple sizes are embedded (16/32/48/256)

3) (Optional) Update `src-tauri/tauri.conf.json` to explicitly use the icon files.
   If you add the files above, you can also add this snippet under `bundle` (uncomment/edit if needed):

   ```jsonc
   {
     // ... keep existing config ...
     "bundle": {
       "active": true,
       "targets": "all",
       "windows": {
         "nsis": {
           "installerIcon": "src-tauri/icons/icon.ico",
           "installMode": "perMachine",
           "allowToChangeInstallationDirectory": true
         }
       },
       "icon": [
         "src-tauri/icons/icon.ico",
         "src-tauri/icons/icon.png"
       ]
     }
   }
   ```

4) Build the Windows installer:
   - Dev desktop: `bun run dev:desktop`
   - Release installer: `bun run build:desktop`
   - Output: `src-tauri/target/release/bundle/nsis/*.exe`

Notes
- Autostart is enabled by default on install/update and is also enforced on first app run.
- No icons defined will fall back to Tauri defaults; placing the files above gives you the custom Shakshuka branding.