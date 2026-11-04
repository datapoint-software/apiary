import { TextCatalog } from '@datapoint/apiary-ui';

export const keysPortuguese: TextCatalog = {
  'Root key': 'Chave raiz',
  'The root key protects the stored configuration and backups. Swarm gives it to every replica as a secret; Apiary never stores it.':
    'A chave raiz protege a configuração guardada e as cópias de segurança. O Swarm entrega-a a cada réplica como segredo; o Apiary nunca a guarda.',
  'The rotation hasn’t finished': 'A rotação não terminou',
  'It started {time}, and {behind} of {total} replicas still use another key. Check that the stack was deployed with the new secret, and that these replicas restarted: {nodes}.':
    'Começou {time}, e {behind} de {total} réplicas ainda usam outra chave. Verifique se a stack foi implementada com o segredo novo e se estas réplicas reiniciaram: {nodes}.',
  'This replica’s key': 'A chave desta réplica',
  'In use': 'Em uso',
  'Key ID': 'ID da chave',
  'Known since': 'Conhecida desde',
  'Replicas using it': 'Réplicas que a usam',
  '{count} of {total}': '{count} de {total}',
  Rotation: 'Rotação',
  'In progress': 'Em curso',
  'Not running': 'Parada',
  'Root key rotation': 'Rotação da chave raiz',
  'New key deployed': 'Chave nova implementada',
  'Rolling update': 'Atualização progressiva',
  'Old key forgotten': 'Chave antiga esquecida',
  'Replicas on': 'Réplicas em',
  'Replicas on the new root key': 'Réplicas com a chave raiz nova',
  'Swarm restarts the replicas one by one. Each fetches the data keys from the others and protects them with the new key. Traffic continues, and Apiary forgets the old key once every replica uses the new one.':
    'O Swarm reinicia as réplicas uma a uma. Cada uma obtém as chaves de dados das outras e protege-as com a chave nova. O tráfego continua, e o Apiary esquece a chave antiga quando todas as réplicas usarem a nova.',
  'Rotate the key if it may have leaked, or as your policy requires.':
    'Rode a chave se puder ter sido divulgada, ou quando a sua política o exigir.',
  '1. If your secret store doesn’t have the current key, save it from a node running a replica':
    '1. Se o seu cofre de segredos não tiver a chave atual, guarde-a a partir de um nó que execute uma réplica',
  '2. Create the new key on a manager node': '2. Crie a chave nova num nó gestor',
  '3. Copy the file': '3. Copie o ficheiro',
  'into your secret store, then delete it. Swarm never shows a secret again.':
    'para o seu cofre de segredos e depois elimine-o. O Swarm nunca volta a mostrar um segredo.',
  '4. Change the secret’s name in the stack file, then run':
    '4. Mude o nome do segredo no ficheiro da stack e depois execute',
  '5. Once every replica uses it, Apiary forgets the old key on its own. Remove the old secret with':
    '5. Quando todas as réplicas a usarem, o Apiary esquece a chave antiga sozinho. Remova o segredo antigo com',
  ', and export a new backup.': ' e exporte uma nova cópia de segurança.',
  'Backups can only be restored with the key they were taken with. Keep the old key in your secret store, apart from the backups, for as long as you keep backups taken with it. Rotation needs at least two replicas: a single replica can’t fetch the data keys from another.':
    'As cópias de segurança só podem ser restauradas com a chave com que foram feitas. Guarde a chave antiga no seu cofre de segredos, longe das cópias, enquanto mantiver cópias feitas com ela. A rotação precisa de pelo menos duas réplicas: uma réplica sozinha não consegue obter as chaves de dados de outra.',
  Replicas: 'Réplicas',
  'Root key of each replica': 'Chave raiz de cada réplica',
  Replica: 'Réplica',
  'Not reported yet; it reports when it restarts': 'Ainda não indicada; é indicada quando reiniciar',
  '(old)': '(antiga)',
};
