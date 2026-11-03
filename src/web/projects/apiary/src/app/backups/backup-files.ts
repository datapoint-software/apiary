import { isApiProblem } from '@datapoint/apiary-ui';
import { Api } from '../api/api';
import { BackupFile, RestoredBackup } from '../api/models';

export function download(file: BackupFile): void {
  const url = URL.createObjectURL(new Blob([file.content], { type: 'application/octet-stream' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const maximumBackupSize = 25 * 1024 * 1024;

export async function restoreBackup(api: Api, action: string, content: string): Promise<RestoredBackup> {
  try {
    return await api.send<RestoredBackup>(action, { content });
  } catch (error) {
    if (isApiProblem(error) && error.errors?.some((e) => e.code === 'backup.unreadable')) {
      throw { status: 400, code: 'backup.unreadable' };
    }
    throw error;
  }
}
