import * as migration_20261020_104241_baseline from './20261020_104241_baseline';
import * as migration_20261020_124503_content_schema from './20261020_124503_content_schema';
import * as migration_20261020_133212_add_jobs_queue from './20261020_133212_add_jobs_queue';
import * as migration_20261021_065527_add_search from './20261021_065527_add_search';

export const migrations = [
  {
    up: migration_20261020_104241_baseline.up,
    down: migration_20261020_104241_baseline.down,
    name: '20261020_104241_baseline',
  },
  {
    up: migration_20261020_124503_content_schema.up,
    down: migration_20261020_124503_content_schema.down,
    name: '20261020_124503_content_schema',
  },
  {
    up: migration_20261020_133212_add_jobs_queue.up,
    down: migration_20261020_133212_add_jobs_queue.down,
    name: '20261020_133212_add_jobs_queue',
  },
  {
    up: migration_20261021_065527_add_search.up,
    down: migration_20261021_065527_add_search.down,
    name: '20261021_065527_add_search'
  },
];
