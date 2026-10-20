import * as migration_20261020_104241_baseline from './20261020_104241_baseline';
import * as migration_20261020_124503_content_schema from './20261020_124503_content_schema';

export const migrations = [
  {
    up: migration_20261020_104241_baseline.up,
    down: migration_20261020_104241_baseline.down,
    name: '20261020_104241_baseline',
  },
  {
    up: migration_20261020_124503_content_schema.up,
    down: migration_20261020_124503_content_schema.down,
    name: '20261020_124503_content_schema'
  },
];
