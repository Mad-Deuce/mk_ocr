import { renderMenu } from './components/menu/menu'

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    doAThing()
  })
}

function doAThing(): void {
  renderMenu()
  const value: HTMLElement | null = document.getElementById('value')
  const meta: HTMLElement | null = document.getElementById('meta')
  const menu: HTMLElement | null = document.getElementById('menu')

  window.api.onResult((data) => {
    if (value) {
      value.textContent = data.text
    }

    if (meta) {
      meta.textContent = `Arial Bold 24 · ${data.confidence}% · ${data.digits} digit(s)`
    }
  })

  window.api.onError((message) => {
    console.error('[RENDERER] OCR error:', message)

    if (value) {
      value.textContent = '!'
    }

    if (meta) {
      meta.textContent = String(message).slice(0, 48)
    }
  })

  window.api.onConfirm((isConfirmed) => {
    console.log(isConfirmed)

    if (menu) {
      menu.removeAttribute('hidden')
    }
  })
}

init()
