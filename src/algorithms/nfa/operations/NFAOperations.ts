import { unionNFA } from './Union';
import { concatNFA } from './Concatenation';
import { starNFA } from './Star';
import { plusNFA } from './Plus';
import { optionalNFA } from './Optional';
import { reverseNFA } from './Reverse';
import { sanitizeAndRenameNFA } from './RenameStates';
import { removeUnreachableNFAStates } from './RemoveUnreachableStates';

export const NFAOperations = {
  union: unionNFA,
  concat: concatNFA,
  star: starNFA,
  plus: plusNFA,
  optional: optionalNFA,
  reverse: reverseNFA,
  renameStates: sanitizeAndRenameNFA,
  removeUnreachableStates: removeUnreachableNFAStates,
};

export {
  unionNFA,
  concatNFA,
  starNFA,
  plusNFA,
  optionalNFA,
  reverseNFA,
  sanitizeAndRenameNFA,
  removeUnreachableNFAStates,
};
