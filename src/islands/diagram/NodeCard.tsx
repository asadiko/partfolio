import type { DiagramNode } from '@/lib/schemas';

import { Definition, Panel } from '../shared/ui';

export function NodeCard({ node }: { node: DiagramNode | undefined }) {
  if (!node) {
    return (
      <Panel title="Node details">
        <p className="text-muted m-0 text-sm">Select a node in the diagram.</p>
      </Panel>
    );
  }
  return (
    <Panel title={node.label}>
      <dl className="m-0">
        <Definition term="Job">{node.card.job}</Definition>
        <Definition term="Guards against">{node.card.guards}</Definition>
        <Definition term="Trade-off">{node.card.tradeoff}</Definition>
      </dl>
    </Panel>
  );
}
