import { useRef, useState } from 'react'
import { useProfile } from '../hooks/useProfile.jsx'
import { useToast } from '../hooks/useToast.jsx'
import { useI18n } from '../i18n/index.jsx'
import {
  PANEL_ICONS,
  isDefaultLayout,
  movePanel,
  resolvePanels,
  toSaved,
} from '../utils/dashboardPanels.js'
import Icon from './Icon.jsx'

// Configurações > Painéis do Resumo: ordem e ícone de cada cartão. Cada
// mudança é salva na hora (sem botão "Salvar") e já aparece na tela; se o
// servidor recusar, volta ao que estava salvo.
//
// Os botões não ficam desabilitados enquanto salva: quem usa teclado pode
// apertar "subir" várias vezes seguidas sem perder o foco.
function DashboardPanelsSettings() {
  const { t } = useI18n()
  const toast = useToast()
  const { profile, updateProfile } = useProfile()
  const [pending, setPending] = useState(null) // lista ainda sendo salva
  const [picking, setPicking] = useState(null) // id do painel com o seletor de ícone aberto
  const [error, setError] = useState('')
  const lastRequest = useRef(0)

  const panels = pending ?? resolvePanels(profile?.dashboard_panels)
  const isDefault = isDefaultLayout(panels)

  async function save(next) {
    const request = ++lastRequest.current
    setError('')
    setPending(next)
    try {
      // Igual ao padrão: grava null, e a pessoa acompanha mudanças futuras do padrão.
      await updateProfile({ dashboard_panels: isDefaultLayout(next) ? null : toSaved(next) })
      if (request === lastRequest.current) toast(t('panels.saved'))
    } catch (err) {
      if (request === lastRequest.current) setError(err.message)
    } finally {
      if (request === lastRequest.current) setPending(null)
    }
  }

  function changeIcon(id, icon) {
    setPicking(null)
    save(panels.map((panel) => (panel.id === id ? { ...panel, icon } : panel)))
  }

  function restoreDefault() {
    setPicking(null)
    save(resolvePanels(null))
  }

  return (
    <div className="settings-section">
      <div className="section-header">
        <h2>{t('panels.title')}</h2>
        <button type="button" className="button button--ghost" onClick={restoreDefault} disabled={isDefault}>
          {t('panels.restore')}
        </button>
      </div>
      <p>{t('panels.intro')}</p>

      {error && <p className="status status--error">{error}</p>}

      <ol className="panel-list">
        {panels.map((panel, index) => {
          const name = t(panel.labelKey)
          return (
            <li key={panel.id} className="panel-list__item">
              <div className="panel-list__row">
                <span className="panel-list__icon">
                  <Icon name={panel.icon} size={18} />
                </span>
                <strong className="panel-list__name">{name}</strong>

                <span className="row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('panels.moveUp', { name })}
                    title={t('panels.moveUp', { name })}
                    onClick={() => save(movePanel(panels, index, -1))}
                    disabled={index === 0}
                  >
                    <Icon name="chevronUp" size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('panels.moveDown', { name })}
                    title={t('panels.moveDown', { name })}
                    onClick={() => save(movePanel(panels, index, 1))}
                    disabled={index === panels.length - 1}
                  >
                    <Icon name="chevronDown" size={16} />
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    aria-expanded={picking === panel.id}
                    aria-label={t('panels.changeIconOf', { name })}
                    onClick={() => setPicking(picking === panel.id ? null : panel.id)}
                  >
                    {t('panels.changeIcon')}
                  </button>
                </span>
              </div>

              {picking === panel.id && (
                // Botões, não radios: com radio, cada seta do teclado já
                // salvaria um ícone diferente.
                <div className="icon-picker" role="group" aria-label={t('panels.iconOf', { name })}>
                  {PANEL_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className="icon-picker__option"
                      aria-pressed={panel.icon === icon}
                      aria-label={t(`icon.${icon}`)}
                      title={t(`icon.${icon}`)}
                      onClick={() => (panel.icon === icon ? setPicking(null) : changeIcon(panel.id, icon))}
                    >
                      <Icon name={icon} size={20} />
                    </button>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default DashboardPanelsSettings
