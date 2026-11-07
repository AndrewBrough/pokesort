import './BuildStamp.css'

export type BuildStampProps = {
  commit: string
}

export type BuildStampHandle = {
  destroy: () => void
}

export function mountBuildStamp(parent: HTMLElement, props: BuildStampProps): BuildStampHandle {
  const root = document.createElement('p')
  root.className = 'build-stamp'
  root.textContent = props.commit
  parent.append(root)
  return {
    destroy() {
      root.remove()
    },
  }
}
