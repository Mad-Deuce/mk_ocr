export type MenuItem = {
  enabled: boolean
  label: string
  action: (args?: unknown) => void
  subMenu?: MenuItem[]
}

export const menu: MenuItem[] = [
  {
    enabled: true,
    label: 'Install/add a part',
    action: () => {
      window.api.addPartHandler()
    }
  },
  {
    enabled: true,
    label: 'Install/add a place',
    action: () => {
      window.api.addPlaceHandler()
    }
  },
  {
    enabled: true,
    label: 'Install/add a fastener',
    action: () => {
      window.api.addFastenerHandler()
    }
  },
  {
    enabled: true,
    label: 'Install/add a washer',
    action: () => {
      window.api.addWasherHandler()
    }
  }
]

export const renderMenu = (): void => {
  const menuElem: HTMLElement | null = document.getElementById('menu')

  if (!menuElem) {
    return
  }

  menu.forEach((item) => {
    if (item.enabled) {
      const newLi = document.createElement('li')
      const newButton = document.createElement('button')
      newButton.innerText = item.label
      newButton.addEventListener('click', item.action)
      newLi.appendChild(newButton)
      menuElem.appendChild(newLi)
    }
  })
}
