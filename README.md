# LibreNMS Status Page

A split-flap display style status board for LibreNMS devices.

<img width="2878" height="1549" alt="image" src="https://github.com/user-attachments/assets/a6275082-fd2b-4220-91c3-10f366a4c9bc" />

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` with your LibreNMS credentials:

   ```
   LIBRENMS_HOST=https://your-librenms-instance.com
   LIBRENMS_API_KEY=your-api-key
   ```

3. Run the dev server:

   ```bash
   pnpm run dev
   ```

4. Building for Production:

   ```bash
   pnpm build
   pnpm run start
   ```

## Tech Stack

- Next.js
- React
- Tailwind CSS

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied. Use at your own risk. The authors are not responsible for any damage or data loss that may result from using this project.
