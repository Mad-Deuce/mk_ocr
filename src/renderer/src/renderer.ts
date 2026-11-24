import { renderMenu } from './components/menu/menu'
// import { renderSelector } from './components/template-selector/template-selector'

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    doAThing()
  })
}

async function doAThing(): Promise<void> {
  const properties = await window.api.getProperties()
  const scanRegion: HTMLElement | null = document.getElementById('scan-region')
  if (scanRegion) {
    scanRegion.style.width = properties.SCAN_REGION_WIDTH + 'px'
    scanRegion.style.height = properties.SCAN_REGION_HEIGHT + 'px'
  }

  const value: HTMLElement | null = document.getElementById('value')
  const meta: HTMLElement | null = document.getElementById('meta')

  window.api.onResult((data) => {
    if (!value || !meta) {
      throw new Error('Renderer: value, meta render error')
    }

    value.textContent = data.text
    meta.textContent = `${properties.FONT} · ${data.confidence}% · ${data.count} digit(s)`
  })

  renderMenu()
  const menu: HTMLElement | null = document.getElementById('menu')
  window.api.onConfirm((isConfirmed) => {
    if (!menu) {
      throw new Error('Renderer: menu render error')
    }

    if (isConfirmed) {
      menu.removeAttribute('hidden')
    } else {
      menu.setAttribute('hidden', '')
    }
  })

  // renderSelector()
  // const templateSelector: HTMLElement | null = document.getElementById('template-selector')

  window.api.onError((message) => {
    console.error('[RENDERER] OCR error:', message)

    if (value) {
      value.textContent = '!'
    }

    if (meta) {
      meta.textContent = String(message).slice(0, 48)
    }
  })
}

init()
