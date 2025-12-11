import { describe, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'

describe('runtime:', () => {
  test('renders <MockTestView />', async () => {
    const MockTestView = () => <Text>Hello Mock Test View</Text>
    await render(<MockTestView />).findByText('Hello Mock Test View')
  })
})
