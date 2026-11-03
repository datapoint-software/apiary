import { MessageCatalog } from '@datapoint/apiary-ui';

export const appMessages: MessageCatalog = {
  'validation.failed': () => 'Some fields need attention.',
  'project.notFound': () => 'Choose a project.',
  'route.notFound': () => 'This route was deleted. Go back to the routes list to see what’s there now.',
  'route.duplicate': () => 'Another route already uses this hostname and path. Change one of them.',
  'route.targetsRequired': () => 'Add at least one target.',
};
