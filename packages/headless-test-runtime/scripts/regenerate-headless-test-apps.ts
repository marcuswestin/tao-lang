/** regenerate-headless-test-apps runs scenario regen (`just regen-test-apps`); watch mode touches `tests/jest-watch-compiler-hook.ts` — see `packages/headless-test-runtime/Justfile`. */
import { regenerateAllHeadlessScenarioOutputs } from '../src/headless-compile'

regenerateAllHeadlessScenarioOutputs()
