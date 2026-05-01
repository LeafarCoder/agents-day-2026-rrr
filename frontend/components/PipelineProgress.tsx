'use client'

interface PipelineProgressProps {
  steps: string[]
}

interface PipelineNode {
  key: string
  label: string
}

const PIPELINE_NODES: PipelineNode[] = [
  { key: 'context_resolver', label: 'Locating you' },
  { key: 'profile_loader', label: 'Loading preferences' },
  { key: 'viator_searcher', label: 'Searching Viator' },
  { key: 'availability_checker', label: 'Checking availability' },
  { key: 'itinerary_assembler', label: 'Building your plan' },
]

type NodeState = 'waiting' | 'running' | 'done'

function getNodeState(key: string, steps: string[]): NodeState {
  // Check done first — it takes priority over running (both may be in the array)
  for (const step of steps) {
    if (step.startsWith(`${key}:done`)) return 'done'
  }
  for (const step of steps) {
    if (step.startsWith(`${key}:running`)) return 'running'
  }
  return 'waiting'
}

function getNodeSubtitle(key: string, steps: string[]): string | null {
  for (const step of steps) {
    if (step.startsWith(`${key}:done`)) {
      // Extract everything after the second colon
      const parts = step.split(':')
      if (parts.length > 2) {
        // Re-join in case subtitle itself contains colons
        const subtitle = parts.slice(2).join(':').trim()
        if (subtitle) {
          if (key === 'itinerary_assembler') return 'Ready!'
          return subtitle
        }
      }
      if (key === 'itinerary_assembler') return 'Ready!'
      return null
    }
  }
  return null
}

function DotWaiting() {
  return (
    <div className="w-4 h-4 rounded-full bg-gray-700 flex-shrink-0" />
  )
}

function DotRunning() {
  return (
    <div className="w-4 h-4 flex-shrink-0 relative flex items-center justify-center">
      <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin-slow absolute" />
      <div className="w-2 h-2 rounded-full bg-amber-500/40" />
    </div>
  )
}

function DotDone() {
  return (
    <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center">
      <svg
        className="w-2.5 h-2.5 text-white"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="2,6 5,9 10,3" />
      </svg>
    </div>
  )
}

export default function PipelineProgress({ steps }: PipelineProgressProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {PIPELINE_NODES.map((node, index) => {
        const state = getNodeState(node.key, steps)
        const subtitle = getNodeSubtitle(node.key, steps)

        return (
          <div key={node.key} className="flex items-start gap-3">
            {/* Dot column with connector line */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="mt-0.5">
                {state === 'waiting' && <DotWaiting />}
                {state === 'running' && <DotRunning />}
                {state === 'done' && <DotDone />}
              </div>
              {/* Connector line between nodes */}
              {index < PIPELINE_NODES.length - 1 && (
                <div
                  className={`w-0.5 h-6 mt-1 transition-colors duration-300 ${
                    state === 'done' ? 'bg-green-500/40' : 'bg-gray-800'
                  }`}
                />
              )}
            </div>

            {/* Text column */}
            <div className="flex flex-col gap-0.5 pb-1">
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  state === 'done'
                    ? 'text-green-400'
                    : state === 'running'
                    ? 'text-amber-400'
                    : 'text-gray-500'
                }`}
              >
                {node.label}
              </span>
              {subtitle && (
                <span className="text-xs text-gray-400">{subtitle}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
