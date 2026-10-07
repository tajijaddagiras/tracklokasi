import './globals.css';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://permintaanmaafku.vercel.app'),
  title: 'Sebuah Pesan Tulus Untukmu ✨',
  description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
  openGraph: {
    title: 'Sebuah Pesan Tulus Untukmu ✨',
    description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
    url: '/',
    siteName: 'Pesan Khusus Untukmu',
    images: [
      {
        url: '/images/fotokita.jpeg',
        width: 1200,
        height: 630,
        alt: 'Momen Kenangan Kita',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sebuah Pesan Tulus Untukmu ✨',
    description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
    images: ['/images/fotokita.jpeg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
