import { TextCatalog } from '@datapoint/apiary-ui';

export const backupsPortuguese: TextCatalog = {
  Backups: 'Cópias de segurança',
  'A backup holds every project, route, certificate, user and the audit log. Take one before each upgrade and after big changes.':
    'Uma cópia de segurança contém todos os projetos, rotas, certificados, utilizadores e o registo de auditoria. Faça uma antes de cada atualização e depois de grandes alterações.',
  'Backing up…': 'A fazer a cópia…',
  'Back up now': 'Fazer cópia agora',
  'The last backup is {time}': 'A última cópia de segurança foi {time}',
  'There are no backups yet': 'Ainda não há cópias de segurança',
  'If the cluster were lost now, every change since then would be lost with it.':
    'Se o cluster se perdesse agora, todas as alterações desde então perder-se-iam com ele.',
  'Keep the root key with your backups': 'Guarde a chave raiz com as cópias de segurança',
  'Backups are encrypted with the root key, and include certificates’ private keys. Without the key a backup can’t be restored, so store a copy of the key apart from the cluster, and the backups where only administrators can read them.':
    'As cópias de segurança são cifradas com a chave raiz e incluem as chaves privadas dos certificados. Sem a chave não é possível restaurar uma cópia, por isso guarde uma cópia da chave fora do cluster, e as cópias de segurança onde só os administradores as possam ler.',
  'Last backup': 'Última cópia de segurança',
  Taken: 'Feita',
  By: 'Por',
  'Changes since': 'Alterações desde então',
  'None yet. Apiary doesn’t keep backups itself: each one is downloaded when you take it.':
    'Ainda nenhuma. O Apiary não guarda cópias de segurança: cada uma é transferida quando a faz.',
  'Restore a backup': 'Restaurar uma cópia de segurança',
  'Replaces the whole configuration on every replica. Use it to go back after a mistake, or to move a configuration to a new cluster with the same root key.':
    'Substitui toda a configuração em todas as réplicas. Use-a para voltar atrás depois de um erro, ou para mover uma configuração para um cluster novo com a mesma chave raiz.',
  'Choose a backup file…': 'Escolher um ficheiro de cópia de segurança…',
  'The backup was taken, but its file was lost while the leader changed. Back up again.':
    'A cópia de segurança foi feita, mas o ficheiro perdeu-se enquanto o líder mudava. Faça a cópia novamente.',
  '{name} is downloading. Store it with the root key, apart from the cluster.':
    '{name} está a ser transferida. Guarde-a com a chave raiz, fora do cluster.',
  'Backup taken': 'Cópia de segurança feita',
  'Couldn’t back up': 'Não foi possível fazer a cópia de segurança',
  'Restore {name}?': 'Restaurar {name}?',
  'Every replica goes back to the routes, certificates and users in this backup. Changes made since it was taken are lost, and everyone is signed out, you included. Traffic keeps flowing.':
    'Todas as réplicas voltam às rotas, certificados e utilizadores desta cópia de segurança. As alterações feitas desde então perdem-se, e todos terminam sessão, incluindo você. O tráfego continua a passar.',
  'Restore backup': 'Restaurar cópia de segurança',
  'Restoring…': 'A restaurar…',
  restore: 'restaurar',
  'Back to {time} UTC: {contents}. Sign in again.': 'De volta a {time} UTC: {contents}. Inicie sessão novamente.',
  '{count} route': '{count} rota',
  '{count} routes': '{count} rotas',
  '{count} certificate': '{count} certificado',
  '{count} certificates': '{count} certificados',
  '{count} user': '{count} utilizador',
  '{count} users': '{count} utilizadores',
  'Backup restored': 'Cópia de segurança restaurada',
};
