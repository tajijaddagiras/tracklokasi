import { store } from '@/lib/store';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const link = store.getLinkById(id);
  const title = link?.title || 'Sebuah Pesan Tulus Untukmu ✨';

  return {
    title: `${title}`,
    description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
    openGraph: {
      title: `${title}`,
      description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
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
      title: `${title}`,
      description: 'Ada kenangan dan pesan yang ingin kusampaikan dari lubuk hatiku yang terdalam...',
      images: ['/images/fotokita.jpeg'],
    },
  };
}

export default function ViewLayout({ children }) {
  return children;
}
