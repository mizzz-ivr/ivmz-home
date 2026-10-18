import * as migration_20260826_021855_initial_payload_foundation from './20260826_021855_initial_payload_foundation';
import * as migration_20260826_100916_payload_content_model_foundation from './20260826_100916_payload_content_model_foundation';
import * as migration_20261009_021711_contact_submissions from './20261009_021711_contact_submissions';
import * as migration_20261009_042936_contact_attachments from './20261009_042936_contact_attachments';
import * as migration_20261009_070000_enable_row_level_security from './20261009_070000_enable_row_level_security';
import * as migration_20261013_004103_integration_settings from './20261013_004103_integration_settings';

import * as migration_20261018_031000_anonymous_messages from './20261018_031000_anonymous_messages';

export const migrations = [
  {
    up: migration_20260826_021855_initial_payload_foundation.up,
    down: migration_20260826_021855_initial_payload_foundation.down,
    name: '20260826_021855_initial_payload_foundation',
  },
  {
    up: migration_20260826_100916_payload_content_model_foundation.up,
    down: migration_20260826_100916_payload_content_model_foundation.down,
    name: '20260826_100916_payload_content_model_foundation',
  },
  {
    up: migration_20261009_021711_contact_submissions.up,
    down: migration_20261009_021711_contact_submissions.down,
    name: '20261009_021711_contact_submissions',
  },
  {
    up: migration_20261009_042936_contact_attachments.up,
    down: migration_20261009_042936_contact_attachments.down,
    name: '20261009_042936_contact_attachments',
  },
  {
    up: migration_20261009_070000_enable_row_level_security.up,
    down: migration_20261009_070000_enable_row_level_security.down,
    name: '20261009_070000_enable_row_level_security',
  },
  {
    up: migration_20261013_004103_integration_settings.up,
    down: migration_20261013_004103_integration_settings.down,
    name: '20261013_004103_integration_settings'
  },
  {
    up: migration_20261018_031000_anonymous_messages.up,
    down: migration_20261018_031000_anonymous_messages.down,
    name: '20261018_031000_anonymous_messages',
  },
];
