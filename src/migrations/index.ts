import * as migration_20261020_104241_baseline from './20261020_104241_baseline';

export const migrations = [
  {
    up: migration_20261020_104241_baseline.up,
    down: migration_20261020_104241_baseline.down,
    name: '20261020_104241_baseline'
  },
];
