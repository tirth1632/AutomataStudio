import type { NFA } from '../NFA';
import type { Intent } from '../parser/Intent';

export interface Generator {
  canHandle(intent: Intent): boolean;
  generate(intent: Intent): NFA;
}
