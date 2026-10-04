# QR Forge - Free QR Code Generator

QR Forge is a browser-only QR code generator built with React, TypeScript, Vite, Tailwind CSS, Lucide icons, and the `qrcode` package. It creates static QR codes for common real-world use cases and exports them as PNG or SVG without requiring a backend, login, or watermark.

## What the App Does

The app lets users create QR codes for:

- Website URLs
- Plain text
- Email links with optional subject and message
- Phone calls
- Wi-Fi credentials
- vCard/contact information
- WhatsApp links
- SMS messages
- Calendar events

The QR preview updates live as the user changes content or styling. Users can set foreground and background colors, image size, error correction level, an optional center logo, and a custom export file name.

## How It Works

QR Forge runs entirely in the browser:

1. The user chooses a QR type.
2. The form validates the required fields for that type.
3. The app converts the input into the correct QR payload format.
4. The `qrcode` library generates a QR matrix client-side.
5. The matrix is rendered as a preview image.
6. The user can export the same payload as PNG or SVG.

There is no server-side generation. User input such as Wi-Fi passwords, contact details, phone numbers, or event details is processed in the browser.

## QR Payload Formats

The app generates static QR codes using these payload patterns:

- URL: normalized to `https://` when no scheme is provided.
- Email: `mailto:name@example.com?subject=...&body=...`
- Phone: `tel:+15550101000`
- Wi-Fi: `WIFI:T:WPA;S:Network;P:Password;H:false;;`
- Contact: vCard 3.0 text.
- WhatsApp: `https://wa.me/<digits>?text=<encoded message>`
- SMS: `sms:<phone>?&body=<encoded message>`
- Calendar: iCalendar `VCALENDAR` / `VEVENT` text.

Special characters are escaped where needed for Wi-Fi, vCard, and calendar data.

## User Features

- Live QR preview
- PNG export
- SVG export
- Custom download filename
- Foreground and background color controls
- Contrast warning for hard-to-scan color combinations
- Warning for inverted light-on-dark QR colors
- QR size slider
- Error correction selector
- Optional logo upload
- Reset button
- Mobile-friendly responsive layout
- Dedicated landing routes for SEO-focused use cases

## Landing Pages

The app supports route-based content and preselected QR tabs:

- `/` - Free QR Code Generator
- `/wifi-qr-code-generator` - Wi-Fi QR Code Generator
- `/vcard-qr-code-generator` - vCard QR Code Generator
- `/qr-code-for-restaurant-menu` - Restaurant Menu QR Code Generator
- `/email-qr-code-generator` - Email QR Code Generator

These routes use the same tool component and change page metadata, heading copy, and supporting content.

## Project Structure

```text
.
├── public/
│   ├── qr-code.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## How to Use the App

1. Open the app in a browser.
2. Choose the QR type, such as URL, Wi-Fi, Contact, WhatsApp, SMS, or Event.
3. Enter the required details.
4. Customize the QR style if needed.
5. Check the live preview.
6. Fix any validation or contrast warnings.
7. Enter a download file name.
8. Export as PNG or SVG.

## Notes on Scannability

For reliable QR codes:

- Use a dark foreground on a light background.
- Keep strong contrast between foreground and background.
- Keep the quiet zone around the QR code.
- Use High error correction when adding a logo.
- Keep logos small.
- Test the QR code before printing.

## Privacy and Security

QR Forge has no backend. QR generation happens in the browser. The app does not intentionally send QR content, Wi-Fi passwords, contact details, or messages to a server.

Because the generated QR codes are static, they do not expire by themselves and they cannot track scan counts. Tracking would require a dynamic QR system with a redirect URL, which this project does not implement.

## Development Workflow

This project is maintained with an agile-style workflow:

1. Make a small focused change.
2. Run the build.
3. Test the affected user flow.
4. Review the diff.
5. Commit the completed slice.
6. Push to GitHub.
7. Repeat for the next improvement.

This keeps updates easy to review and reduces the chance of unrelated changes being mixed together.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- qrcode
- Lucide React

## License

No license has been selected yet. Add a license before reusing or distributing this project outside the repository owner's intended use.
