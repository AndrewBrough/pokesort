import './HowToStep.css'

export type HowToStepProps = {
  index: number
  title: string
  detail: string
}

export function mountHowToStep(parent: HTMLElement, props: HowToStepProps): void {
  const root = document.createElement('li')
  root.className = 'how-to-step'
  const index = document.createElement('span')
  index.className = 'how-to-step__index'
  index.textContent = String(props.index)
  const title = document.createElement('p')
  title.className = 'how-to-step__title'
  title.textContent = props.title
  const detail = document.createElement('p')
  detail.className = 'how-to-step__detail'
  detail.textContent = props.detail
  root.append(index, title, detail)
  parent.append(root)
}
