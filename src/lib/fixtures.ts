import escrowJson from '@fixtures/escrow.json';
import groundingJson from '@fixtures/grounding.json';
import pipelineJson from '@fixtures/pipeline.json';
import playgroundJson from '@fixtures/playground.json';

import {
  escrowFixtureSchema,
  groundingFixtureSchema,
  pipelineFixtureSchema,
  playgroundFixtureSchema,
} from './schemas';

// Fixtures are parsed once at build/hydration time so a malformed file fails loudly, not in the UI.
export const pipelineFixture = pipelineFixtureSchema.parse(pipelineJson);
export const groundingFixture = groundingFixtureSchema.parse(groundingJson);
export const playgroundFixture = playgroundFixtureSchema.parse(playgroundJson);
export const escrowFixture = escrowFixtureSchema.parse(escrowJson);
