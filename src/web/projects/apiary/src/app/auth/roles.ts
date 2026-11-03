import { Role } from '../api/models';

const order: readonly Role[] = ['viewer', 'operator', 'administrator'];

export function hasRole(role: Role | undefined, required: Role): boolean {
  return role !== undefined && order.indexOf(role) >= order.indexOf(required);
}

export const roleNames: Record<Role, string> = { viewer: 'Viewer', operator: 'Operator', administrator: 'Administrator' };

export const roleDescriptions: Record<Role, string> = {
  administrator: 'Everything, including users, the root key and recovery.',
  operator: 'Routes, certificates, redirects and backups. Not users.',
  viewer: 'Reads everything except secrets. Changes nothing.',
};
