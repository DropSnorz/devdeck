import { beforeEach, describe, expect, it } from 'vitest'
import { useOverlayStore } from './useOverlayStore'

beforeEach(() => {
  useOverlayStore.setState({ target: null })
})

describe('useOverlayStore', () => {
  it('expandPinned stores both instanceId and widgetId', () => {
    useOverlayStore.getState().expandPinned('instance-1', 'base64')

    expect(useOverlayStore.getState().target).toEqual({
      kind: 'pinned',
      instanceId: 'instance-1',
      widgetId: 'base64',
    })
  })

  it('openEphemeral generates a fresh instanceId on every call, even for the same widget', () => {
    useOverlayStore.getState().openEphemeral('base64')
    const first = useOverlayStore.getState().target

    useOverlayStore.getState().openEphemeral('base64')
    const second = useOverlayStore.getState().target

    expect(first?.kind).toBe('ephemeral')
    expect(second?.kind).toBe('ephemeral')
    expect(first?.instanceId).not.toBe(second?.instanceId)
  })

  it('close clears the target', () => {
    useOverlayStore.getState().expandPinned('instance-1', 'base64')

    useOverlayStore.getState().close()

    expect(useOverlayStore.getState().target).toBeNull()
  })
})
