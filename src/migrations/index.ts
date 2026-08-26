import * as migration_20260826_021855_initial_payload_foundation from './20260826_021855_initial_payload_foundation';
import * as migration_20260826_100916_payload_content_model_foundation from './20260826_100916_payload_content_model_foundation';

export const migrations = [
  {
    up: migration_20260826_021855_initial_payload_foundation.up,
    down: migration_20260826_021855_initial_payload_foundation.down,
    name: '20260826_021855_initial_payload_foundation',
  },
  {
    up: migration_20260826_100916_payload_content_model_foundation.up,
    down: migration_20260826_100916_payload_content_model_foundation.down,
    name: '20260826_100916_payload_content_model_foundation'
  },
];
