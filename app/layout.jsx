import './globals.css';

export const metadata = {
  title: 'Vocal Coach — Pitch Practice',
  description: 'Private, confidence-aware pitch practice for singers.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
