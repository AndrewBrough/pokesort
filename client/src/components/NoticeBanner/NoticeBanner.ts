import './NoticeBanner.css'

export type NoticeBannerProps = {
  token: string
  text: string
}

export type NoticeBannerHandle = {
  update: (props: NoticeBannerProps | null) => void
  destroy: () => void
}

export function mountNoticeBanner(parent: HTMLElement): NoticeBannerHandle {
  const root = document.createElement('p')
  root.className = 'notice-banner'
  root.dataset.visible = 'false'
  parent.append(root)
  let token = ''
  let timer = 0

  return {
    update(props) {
      if (!props || props.token === token) return
      token = props.token
      root.textContent = props.text
      root.dataset.visible = 'true'
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        root.dataset.visible = 'false'
      }, 2600)
    },
    destroy() {
      window.clearTimeout(timer)
      root.remove()
    },
  }
}
