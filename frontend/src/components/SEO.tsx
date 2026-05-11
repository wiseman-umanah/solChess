import { Helmet } from 'react-helmet-async'

export const BASE_URL = 'https://sol-chess-nine.vercel.app'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  structuredData?: object
}

export default function SEO({
  title = 'SolChess — Play Chess for SOL on Solana',
  description = 'Wager SOL, stake on outcomes, and win on-chain. SolChess is a trustless chess platform built on Solana — no middleman, instant settlement.',
  image = DEFAULT_IMAGE,
  url = BASE_URL,
  type = 'website',
  structuredData,
}: SEOProps) {
  const fullTitle = title.includes('SolChess') ? title : `${title} | SolChess`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}
