declare module '@expo/vector-icons/Ionicons' {
  export default function Ionicons(): null
}

declare module '@react-navigation/bottom-tabs' {
  export function createBottomTabNavigator(config: unknown): unknown
}

declare module '@react-navigation/native' {
  export function createNavigationContainerRef(): unknown
  export function createStaticNavigation(config: unknown): import('react').ComponentType<any>
  export const StackActions: {
    pop(count?: number): unknown
    push(name: string, params?: Record<string, unknown>): unknown
  }
  export const TabActions: {
    jumpTo(name: string, params?: Record<string, unknown>): unknown
  }
}

declare module '@react-navigation/native-stack' {
  export function createNativeStackNavigator(config: unknown): unknown
}
