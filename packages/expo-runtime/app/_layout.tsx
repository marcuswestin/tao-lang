import { Stack } from 'expo-router'
import { View } from 'react-native'

const HeaderStyles = {
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  height: '100%',
} as const

const ScreenOptions = {
  headerBackground: () => <View style={HeaderStyles} />,
  headerTintColor: 'white',
} as const

export default function RootLayout() {
  return (
    <Stack
      screenOptions={ScreenOptions}
    />
  )
}
