import * as SplashScreen from 'expo-splash-screen'
import {
  Component,
  type ComponentType,
  createElement,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useRef,
} from 'react'
import * as RN from 'react-native'

type CompiledTaoAppProps = {
  onRuntimeReady?: () => void
}

declare const require: (path: string) => { default: ComponentType<CompiledTaoAppProps> }

type RuntimeStartupErrorBoundaryState = {
  error: unknown
}

const styles = RN.StyleSheet.create({
  errorBody: {
    color: '#5f6368',
    fontSize: 14,
    lineHeight: 20,
  },
  errorRoot: {
    alignItems: 'stretch',
    backgroundColor: '#ffffff',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#202124',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
})

function runtimeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }
  return String(error)
}

function hideNativeSplash(reason: string): void {
  void SplashScreen.hideAsync().catch(error => {
    console.warn(`[tao-expo-runtime] Failed to hide native splash screen after ${reason}.`, error)
  })
}

class RuntimeStartupErrorBoundary extends Component<
  { children: ReactNode },
  RuntimeStartupErrorBoundaryState
> {
  state: RuntimeStartupErrorBoundaryState = { error: undefined }

  static getDerivedStateFromError(error: unknown): RuntimeStartupErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('[tao-expo-runtime] Failed to render generated Tao app.', error, errorInfo.componentStack)
    hideNativeSplash('startup error')
  }

  render(): ReactNode {
    if (this.state.error !== undefined) {
      return createElement(
        RN.View,
        { style: styles.errorRoot },
        createElement(RN.Text, { style: styles.errorTitle }, 'Tao runtime failed to load'),
        createElement(RN.Text, { style: styles.errorBody }, runtimeErrorMessage(this.state.error)),
      )
    }
    return this.props.children
  }
}

function CompiledTaoAppLoader(props: CompiledTaoAppProps) {
  const CompiledTaoApp = require('./_gen/tao-app/app-bootstrap').default
  return createElement(CompiledTaoApp, props)
}

/** ExpoRuntimeEntrypoint renders the generated Tao app bootstrap. */
export default function ExpoRuntimeEntrypoint() {
  const didHideSplash = useRef(false)
  const markRuntimeReady = useCallback(() => {
    if (didHideSplash.current) {
      return
    }
    didHideSplash.current = true
    hideNativeSplash('navigation ready')
  }, [])

  return createElement(
    RuntimeStartupErrorBoundary,
    null,
    createElement(CompiledTaoAppLoader, { onRuntimeReady: markRuntimeReady }),
  )
}
