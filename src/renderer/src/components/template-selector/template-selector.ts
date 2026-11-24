export type OptionItem = {
  enabled: boolean
  label: string
  value: string
}

export const options: OptionItem[] = [
  {
    enabled: true,
    label: 'Install',
    value: 'install'
  },
  {
    enabled: true,
    label: 'Stick',
    value: 'stick'
  }
]

export const renderSelector = (): void => {
  const selectorElem: HTMLSelectElement | null = document.getElementById(
    'template-selector'
  ) as HTMLSelectElement | null 

  if (!selectorElem) {
    return
  }
  selectorElem.addEventListener('change', (_event) => console.log('template-selector: ', _event))
  selectorElem.addEventListener('click', (_event) => console.log('template-selector: ', _event))

  options.forEach((item) => {
    if (item.enabled) {
      const newOption = document.createElement('option')
      newOption.value = item.value
      newOption.textContent = item.label
      selectorElem.appendChild(newOption)
    }
  })
}
