export type MenuItem = {
  enabled: boolean
  label: string
  subMenu?: MenuItem[]
}

export const menu: MenuItem[] = [
  { enabled: true, label: 'Install/add a part' },
  { enabled: true, label: 'Add a place' },
  { enabled: true, label: 'Add a fastener' },
  { enabled: true, label: 'Add a washer' }
]

export const renderMenu = (): void => {
  const menuElem: HTMLElement | null = document.getElementById('menu')

  if (!menuElem) {
    return
  }

  const newUl = document.createElement('ul')

  menu.forEach((item) => {
    if (item.enabled) {
      const newLi = document.createElement('li')
      newLi.innerText = item.label
      newUl.appendChild(newLi)
    }
  })

  menuElem.appendChild(newUl)
}
