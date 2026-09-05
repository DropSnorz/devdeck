import { useId, useMemo, useState } from 'react'
import { nanoid } from 'nanoid'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/CopyButton'
import { ErrorMessage } from '@/components/ErrorMessage'
import { cn } from '@/lib/utils'
import { useWidgetDirty } from '@/widgets/useWidgetDirty'
import { useWidgetState } from '@/widgets/useWidgetState'
import type { WidgetProps } from '@/widgets/types'
import { SUPPORTED_FORMAT_EXAMPLES, parseEventLines } from './parseTimestamp'
import {
  LOCAL_TIME_ZONE,
  formatDateTimeInZone,
  formatOffsetLabel,
  formatTimeInZone,
  getUtcOffsetMinutes,
  isValidTimeZone,
  listTimeZones,
} from './timeZones'
import {
  axisTicks,
  formatDelta,
  formatDuration,
  laneColor,
  laneColorName,
  nextColorIndex,
  positionRatio,
  sortEvents,
  spansMultipleDays,
  timelineBounds,
  timelineToText,
  type TimelineEvent,
  type TimelineLane,
} from './timelineModel'

const FIRST_LANE_ID = 'lane-1'

function defaultLanes(): TimelineLane[] {
  return [{ id: FIRST_LANE_ID, name: 'Timeline 1', colorIndex: 0 }]
}

const SELECT_CLASS =
  'h-6 min-w-0 rounded-md border border-input bg-transparent px-1 text-[11px] outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 dark:bg-input/30'

const INLINE_INPUT_CLASS =
  'min-w-0 flex-1 truncate rounded-sm bg-transparent px-1 py-0.5 outline-none placeholder:text-muted-foreground/70 hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-ring/50'

/** Drag payload key. Set as `text/plain` too so a drag that lands outside a
 * lane (on the page, another app) degrades to plain text instead of nothing. */
const DRAG_MIME = 'application/x-localgrid-timeline-event'

export default function TimelineBuilderWidget({ instanceId, mode }: WidgetProps) {
  const [lanes, setLanes] = useWidgetState<TimelineLane[]>(instanceId, 'lanes', defaultLanes)
  const [events, setEvents] = useWidgetState<TimelineEvent[]>(instanceId, 'events', [])
  const [input, setInput] = useWidgetState(instanceId, 'input', '')
  // Zone the pasted text is read in when it carries no offset of its own,
  // kept separate from the zone everything is displayed in: reading a
  // UTC-logged incident in local time is the entire job here.
  const [inputZone, setInputZone] = useWidgetState(instanceId, 'inputZone', LOCAL_TIME_ZONE)
  const [displayZone, setDisplayZone] = useWidgetState(instanceId, 'displayZone', LOCAL_TIME_ZONE)
  const [targetLaneId, setTargetLaneId] = useWidgetState(instanceId, 'targetLaneId', FIRST_LANE_ID)
  const [failedLines, setFailedLines] = useState<string[]>([])
  const [dragOverLaneId, setDragOverLaneId] = useState<string | null>(null)
  // Only used to date the "current offset" readout while the timeline is
  // still empty; captured once at mount rather than read during render,
  // which would make the render impure for a label nobody watches tick.
  const [mountedAt] = useState(() => Date.now())
  const inputFieldId = useId()

  useWidgetDirty(instanceId, events.length > 0 || input.trim() !== '' || lanes.length > 1)

  const timeZones = useMemo(() => listTimeZones(), [])
  const sorted = useMemo(() => sortEvents(events), [events])
  const bounds = useMemo(() => timelineBounds(sorted), [sorted])
  const multiDay = useMemo(() => spansMultipleDays(sorted, displayZone), [sorted, displayZone])
  const ticks = useMemo(
    () => (bounds ? axisTicks(bounds, mode === 'overlay' ? 5 : 3, displayZone) : []),
    [bounds, mode, displayZone],
  )

  const laneById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes])
  const colorForEvent = (event: TimelineEvent) => laneColor(laneById.get(event.laneId)?.colorIndex ?? 0)
  const activeLaneId = laneById.has(targetLaneId) ? targetLaneId : (lanes[0]?.id ?? FIRST_LANE_ID)

  const displayOffset = formatOffsetLabel(getUtcOffsetMinutes(bounds?.startMs ?? mountedAt, displayZone))

  const addEvents = (text: string) => {
    const { events: parsed, failed } = parseEventLines(text, { timeZone: inputZone })
    if (parsed.length > 0) {
      setEvents((previous) => [
        ...previous,
        ...parsed.map((event) => ({
          id: nanoid(8),
          ms: event.ms,
          label: event.label,
          laneId: activeLaneId,
          format: event.format,
          hasExplicitOffset: event.hasExplicitOffset,
        })),
      ])
    }
    setFailedLines(failed)
    // Anything unparseable stays in the box so it can be corrected in place
    // rather than being silently dropped on the floor.
    setInput(failed.join('\n'))
  }

  const handleAddNow = () => {
    setEvents((previous) => [
      ...previous,
      {
        id: nanoid(8),
        ms: Date.now(),
        label: input.trim() || 'now',
        laneId: activeLaneId,
        format: 'Captured now',
        hasExplicitOffset: true,
      },
    ])
    setInput('')
    setFailedLines([])
  }

  const moveEvent = (eventId: string, laneId: string) => {
    setEvents((previous) => previous.map((event) => (event.id === eventId ? { ...event, laneId } : event)))
  }

  const relabelEvent = (eventId: string, label: string) => {
    setEvents((previous) => previous.map((event) => (event.id === eventId ? { ...event, label } : event)))
  }

  const removeEvent = (eventId: string) => {
    setEvents((previous) => previous.filter((event) => event.id !== eventId))
  }

  const addLane = () => {
    const lane: TimelineLane = {
      id: nanoid(8),
      name: `Timeline ${lanes.length + 1}`,
      colorIndex: nextColorIndex(lanes),
    }
    setLanes((previous) => [...previous, lane])
    setTargetLaneId(lane.id)
  }

  const renameLane = (laneId: string, name: string) => {
    setLanes((previous) => previous.map((lane) => (lane.id === laneId ? { ...lane, name } : lane)))
  }

  const cycleLaneColor = (laneId: string) => {
    setLanes((previous) =>
      previous.map((lane) => (lane.id === laneId ? { ...lane, colorIndex: lane.colorIndex + 1 } : lane)),
    )
  }

  const removeLane = (laneId: string) => {
    if (lanes.length <= 1) return
    const fallbackId = lanes.find((lane) => lane.id !== laneId)?.id ?? FIRST_LANE_ID
    // Events outlive their lane: losing timestamps because a lane was tidied
    // away would be the one unrecoverable action in the widget.
    setEvents((previous) =>
      previous.map((event) => (event.laneId === laneId ? { ...event, laneId: fallbackId } : event)),
    )
    setLanes((previous) => previous.filter((lane) => lane.id !== laneId))
    if (targetLaneId === laneId) setTargetLaneId(fallbackId)
  }

  const clearEvents = () => {
    setEvents([])
    setFailedLines([])
  }

  const handleDrop = (laneId: string) => (dragEvent: React.DragEvent) => {
    dragEvent.preventDefault()
    setDragOverLaneId(null)
    const eventId = dragEvent.dataTransfer.getData(DRAG_MIME)
    if (eventId) moveEvent(eventId, laneId)
  }

  const handleDragOver = (laneId: string) => (dragEvent: React.DragEvent) => {
    if (!dragEvent.dataTransfer.types.includes(DRAG_MIME)) return
    dragEvent.preventDefault()
    dragEvent.dataTransfer.dropEffect = 'move'
    setDragOverLaneId(laneId)
  }

  const startDrag = (event: TimelineEvent) => (dragEvent: React.DragEvent) => {
    dragEvent.dataTransfer.setData(DRAG_MIME, event.id)
    dragEvent.dataTransfer.setData('text/plain', `${formatDateTimeInZone(event.ms, displayZone)} ${event.label}`)
    dragEvent.dataTransfer.effectAllowed = 'move'
  }

  const eventTime = (event: TimelineEvent) =>
    multiDay ? formatDateTimeInZone(event.ms, displayZone) : formatTimeInZone(event.ms, displayZone)

  return (
    <div className="flex h-full flex-col gap-2 text-xs">
      <div className="flex items-start gap-1">
        <Textarea
          id={inputFieldId}
          aria-label="Timestamps to add"
          value={input}
          onChange={(changeEvent) => setInput(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Enter' && (keyEvent.metaKey || keyEvent.ctrlKey)) {
              keyEvent.preventDefault()
              addEvents(input)
            }
          }}
          rows={2}
          spellCheck={false}
          placeholder={
            '2024-01-15T12:34:56Z deploy started\n1705322096789 | cache warm\nJan 15 12:35:01 healthcheck ok'
          }
          className="min-h-14 flex-1 font-mono text-xs"
        />
        <div className="flex flex-col gap-1">
          <Button type="button" size="sm" onClick={() => addEvents(input)} disabled={input.trim() === ''}>
            Add
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handleAddNow}>
            Now
          </Button>
        </div>
      </div>

      {failedLines.length > 0 && (
        <ErrorMessage>
          {failedLines.length === 1 ? 'No timestamp found in: ' : `No timestamp found in ${failedLines.length} lines: `}
          {failedLines.slice(0, 2).join(', ')}
        </ErrorMessage>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-1">
          Add to
          <select
            aria-label="Timeline new events go to"
            value={activeLaneId}
            onChange={(changeEvent) => setTargetLaneId(changeEvent.target.value)}
            className={cn(SELECT_CLASS, 'max-w-28')}
          >
            {lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Read as
          <select
            aria-label="Input time zone"
            value={isValidTimeZone(inputZone) ? inputZone : 'UTC'}
            onChange={(changeEvent) => setInputZone(changeEvent.target.value)}
            className={cn(SELECT_CLASS, 'max-w-32')}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Show in
          <select
            aria-label="Display time zone"
            value={isValidTimeZone(displayZone) ? displayZone : 'UTC'}
            onChange={(changeEvent) => setDisplayZone(changeEvent.target.value)}
            className={cn(SELECT_CLASS, 'max-w-32')}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <span className="font-mono">{displayOffset}</span>
        <Button type="button" size="xs" variant="ghost" onClick={addLane}>
          <Plus />
          Timeline
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <CopyButton
            value={timelineToText(events, lanes, displayZone)}
            label=""
            ariaLabel="Copy timeline as text"
            className="size-6"
          />
          <Button type="button" size="xs" variant="ghost" onClick={clearEvents} disabled={events.length === 0}>
            Clear
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="space-y-1.5">
          {lanes.map((lane, laneIndex) => {
            const laneEvents = sorted.filter((event) => event.laneId === lane.id)
            return (
              <div
                key={lane.id}
                onDragOver={handleDragOver(lane.id)}
                onDragLeave={() => setDragOverLaneId((current) => (current === lane.id ? null : current))}
                onDrop={handleDrop(lane.id)}
                className={cn(
                  'rounded-md border border-border p-1.5 transition-colors',
                  dragOverLaneId === lane.id && 'border-ring bg-muted/60',
                )}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cycleLaneColor(lane.id)}
                    aria-label={`Change color of ${lane.name}, currently ${laneColorName(lane.colorIndex)}`}
                    className="size-3 shrink-0 rounded-full ring-offset-1 ring-offset-card focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                    style={{ backgroundColor: laneColor(lane.colorIndex) }}
                  />
                  <input
                    value={lane.name}
                    onChange={(changeEvent) => renameLane(lane.id, changeEvent.target.value)}
                    aria-label={`Name of timeline ${laneIndex + 1}`}
                    className={cn(INLINE_INPUT_CLASS, 'font-medium')}
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {laneEvents.length} {laneEvents.length === 1 ? 'event' : 'events'}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Remove ${lane.name}`}
                    disabled={lanes.length <= 1}
                    onClick={() => removeLane(lane.id)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="relative mt-1 h-7 rounded bg-muted/50">
                  <div className="absolute inset-x-1.5 top-1/2 h-px -translate-y-1/2 bg-border" />
                  {bounds &&
                    laneEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        draggable
                        onDragStart={startDrag(event)}
                        title={`${formatDateTimeInZone(event.ms, displayZone)}${event.label ? `, ${event.label}` : ''}`}
                        aria-label={`${event.label || 'Event'} at ${eventTime(event)} on ${lane.name}`}
                        className="group absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-card focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                        style={{
                          left: `calc(6px + ${positionRatio(event.ms, bounds)} * (100% - 12px))`,
                          backgroundColor: colorForEvent(event),
                        }}
                      >
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded border border-border bg-popover px-1 py-0.5 font-mono text-[10px] whitespace-nowrap text-popover-foreground shadow-sm group-hover:block group-focus-visible:block">
                          {eventTime(event)}
                          {event.label ? ` ${event.label}` : ''}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )
          })}
        </div>

        {bounds && (
          <div className="relative h-3 font-mono text-[10px] text-muted-foreground">
            {ticks.map((tick) => (
              <span
                key={tick.ratio}
                className={cn(
                  'absolute top-0 whitespace-nowrap',
                  tick.ratio === 0 ? '' : tick.ratio === 1 ? '-translate-x-full' : '-translate-x-1/2',
                )}
                style={{ left: `calc(6px + ${tick.ratio} * (100% - 12px))` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        )}

        {bounds ? (
          <p className="text-[11px] text-muted-foreground">
            {events.length} {events.length === 1 ? 'event' : 'events'} over{' '}
            <span className="font-mono text-foreground">{formatDuration(bounds.spanMs)}</span>, from{' '}
            <span className="font-mono">{formatDateTimeInZone(bounds.startMs, displayZone)}</span> in {displayZone}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Paste timestamps above, one per line, with an optional label. Drag a marker onto another timeline to regroup
            it.
          </p>
        )}

        {sorted.length > 0 && (
          <ul className="space-y-0.5">
            {sorted.map((event, index) => (
              <li
                key={event.id}
                draggable
                onDragStart={startDrag(event)}
                className="flex items-center gap-1 rounded px-0.5 py-0.5 hover:bg-muted/60"
              >
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colorForEvent(event) }}
                />
                <span
                  className="shrink-0 font-mono text-[11px] tabular-nums"
                  title={`${event.format}${event.hasExplicitOffset ? '' : ` read as ${inputZone}`}`}
                >
                  {eventTime(event)}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                  {index === 0 ? '' : formatDelta(event.ms - sorted[index - 1].ms)}
                </span>
                <input
                  value={event.label}
                  onChange={(changeEvent) => relabelEvent(event.id, changeEvent.target.value)}
                  aria-label={`Label for event at ${eventTime(event)}`}
                  placeholder="label"
                  className={INLINE_INPUT_CLASS}
                />
                <select
                  value={event.laneId}
                  onChange={(changeEvent) => moveEvent(event.id, changeEvent.target.value)}
                  aria-label={`Timeline for event at ${eventTime(event)}`}
                  className={cn(SELECT_CLASS, 'max-w-24 shrink-0')}
                >
                  {lanes.map((lane) => (
                    <option key={lane.id} value={lane.id}>
                      {lane.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`Remove event at ${eventTime(event)}`}
                  onClick={() => removeEvent(event.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-auto text-[10px] text-muted-foreground">
          <summary className="cursor-pointer select-none">Supported formats</summary>
          <ul className="mt-1 space-y-0.5 pl-3 font-mono">
            {SUPPORTED_FORMAT_EXAMPLES.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}
