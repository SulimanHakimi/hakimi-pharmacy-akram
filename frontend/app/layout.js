import './globals.css';
import Providers from './providers';
import NoZoom from './no-zoom';

export const metadata = {
  title: 'Hakimi Pharmacy — Management System',
  description: 'Sales, stock, suppliers, purchases and reports for Hakimi Pharmacy.'
};

// Locked at 1x. Android/Chrome honours maximumScale + userScalable; iOS Safari
// ignores them, so <NoZoom> and the touch-action/font-size rules in globals.css
// cover the rest.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

// Browser extensions stamp attributes onto <html> and <body> before React hydrates.
// suppressHydrationWarning covers only the element it is on, so both need it.
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning><NoZoom /><Providers>{children}</Providers></body>
    </html>
  );
}
