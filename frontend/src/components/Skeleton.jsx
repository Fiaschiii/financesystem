import { useI18n } from '../i18n/index.jsx'

// Blocos cinza que "pulsam" no lugar do conteúdo enquanto ele carrega.
// Dão uma ideia do formato da página e evitam que tudo pule quando os dados chegam.
export function Skeleton({ width = '100%', height = 16, radius }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius }} aria-hidden="true" />
}

export function SkeletonCards({ count = 3 }) {
  return (
    <div className="dashboard-cards">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="dashboard-card">
          <Skeleton width="45%" height={13} />
          <Skeleton width="70%" height={26} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={40} radius={6} />
      ))}
    </div>
  )
}

// Texto só para leitores de tela, já que os blocos em si são invisíveis para eles.
export function LoadingLabel() {
  const { t } = useI18n()
  return <span className="visually-hidden" role="status">{t('common.loading')}</span>
}
