import { TextCatalog } from '@datapoint/apiary-ui';

export const clusterPortuguese: TextCatalog = {
  "Changes are paused while the cluster can't reach a majority of replicas.":
    'As alterações estão em pausa enquanto o cluster não conseguir contactar a maioria das réplicas.',
  'Routing continues with the last configuration.': 'O encaminhamento continua com a última configuração.',
  'Changes are paused': 'As alterações estão em pausa',
  'The replica on {node} joins in a few seconds, then catches up and starts serving traffic.':
    'A réplica em {node} entra dentro de segundos, atualiza-se e começa a servir tráfego.',
  'Replica approved': 'Réplica aprovada',
  'Couldn’t approve': 'Não foi possível aprovar',
  'Waiting for approval': 'À espera de aprovação',
  'These replicas have the root key and ask to join. Approve the ones you deployed; the others keep waiting.':
    'Estas réplicas têm a chave raiz e pedem para entrar. Aprove as que implementou; as outras continuam à espera.',
  'Replicas waiting for approval': 'Réplicas à espera de aprovação',
  Replica: 'Réplica',
  Replicas: 'Réplicas',
  Address: 'Endereço',
  'Asking since': 'A pedir desde',
  Actions: 'Ações',
  'Approving…': 'A aprovar…',
  Approve: 'Aprovar',
  Leader: 'Líder',
  Voter: 'Votante',
  Joining: 'A juntar-se',
  'Missing for {time}': 'Em falta há {time}',
  Unreachable: 'Inacessível',
  'Catching up': 'A atualizar',
  'In sync': 'Sincronizada',
  'New replicas now wait for your approval, and missing ones stay until you remove them.':
    'As réplicas novas passam a esperar pela sua aprovação, e as que faltam ficam até as remover.',
  'New replicas join on their own, and missing ones are removed after {minutes} minutes.':
    'As réplicas novas entram sozinhas, e as que faltam são removidas ao fim de {minutes} minutos.',
  'Membership saved': 'Adesão guardada',
  'Remove {node} now?': 'Remover {node} agora?',
  '{later} Once removed, it no longer counts towards the majority. If {node} comes back, its replica joins again as a new replica.':
    '{later} Depois de removida, deixa de contar para a maioria. Se {node} voltar, a réplica entra novamente como uma réplica nova.',
  'Remove replica': 'Remover réplica',
  'Removing…': 'A remover…',
  '{node} was removed from the cluster.': '{node} foi removida do cluster.',
  'It has been missing for {time}, and would be removed on its own after {minutes} minutes.':
    'Está em falta há {time}, e seria removida automaticamente ao fim de {minutes} minutos.',
  'It can’t be reached, and would be removed on its own after {minutes} minutes.':
    'Não está contactável, e seria removida automaticamente ao fim de {minutes} minutos.',
  'It has been missing for {time}.': 'Está em falta há {time}.',
  'It can’t be reached.': 'Não está contactável.',
  'Apiary runs as one instance, so there’s nothing to replicate. Deploy it as a Swarm stack to run several replicas.':
    'O Apiary corre como uma única instância, por isso não há nada para replicar. Implemente-o como stack do Swarm para ter várias réplicas.',
  'Every replica keeps a copy of the configuration and serves traffic. A majority of them must agree on each change.':
    'Cada réplica guarda uma cópia da configuração e serve tráfego. A maioria delas tem de concordar com cada alteração.',
  Loading: 'A carregar',
  Role: 'Função',
  Status: 'Estado',
  Joined: 'Entrou',
  'Unknown node': 'Nó desconhecido',
  '(this replica)': '(esta réplica)',
  'Remove now…': 'Remover agora…',
  Membership: 'Adesão',
  'How replicas join and leave. Either way, a replica must prove it has the root key before it can join.':
    'Como as réplicas entram e saem. Em qualquer caso, uma réplica tem de provar que tem a chave raiz antes de entrar.',
  'save the membership': 'guardar a adesão',
  Automatic: 'Automático',
  Manual: 'Manual',
  'New replicas join on their own, so the cluster grows and shrinks with the stack.':
    'As réplicas novas entram sozinhas, por isso o cluster cresce e diminui com a stack.',
  'New replicas wait here until an administrator approves them, and missing ones stay until removed.':
    'As réplicas novas esperam aqui até um administrador as aprovar, e as que faltam ficam até serem removidas.',
  'Remove missing replicas after': 'Remover réplicas em falta após',
  'From 5 to 1440 minutes.': 'De 5 a 1440 minutos.',
  minutes: 'minutos',
  'Saving…': 'A guardar…',
  Save: 'Guardar',
  'Danger zone': 'Zona de perigo',
  'Recover from a lost majority': 'Recuperar de uma maioria perdida',
  'Only when most voters are gone for good. This replica becomes the only voter, and anything only the lost voters had is lost.':
    'Só quando a maioria dos votantes desapareceu de vez. Esta réplica passa a ser o único votante, e perde-se o que só os votantes perdidos tinham.',
  'Start recovery…': 'Iniciar recuperação…',
  'Log index {index}.': 'Índice do registo {index}.',
  'Recover the cluster from {node}': 'Recuperar o cluster a partir de {node}',
  'Recover the cluster from this replica': 'Recuperar o cluster a partir desta réplica',
  '{node} is restarting': '{node} está a reiniciar',
  Recovery: 'Recuperação',
  Check: 'Verificar',
  Confirm: 'Confirmar',
  Recover: 'Recuperar',
  'Recovery isn’t needed': 'A recuperação não é necessária',
  'A majority of voters can be reached, so the cluster still agrees on changes. Recovery is only for when a majority is lost for good.':
    'A maioria dos votantes está contactável, por isso o cluster continua a concordar com as alterações. A recuperação é só para quando a maioria se perdeu de vez.',
  'Recover from {node} instead': 'Recupere antes a partir de {node}',
  'It has changes up to {other}, and this replica only up to {current}. Open the admin interface on {node} and recover from there, so nothing more is lost.':
    'Tem alterações até {other}, e esta réplica só até {current}. Abra a interface de administração em {node} e recupere a partir daí, para não perder mais nada.',
  '{names} can’t be reached.': 'Sem contacto com {names}.',
  'If they can come back, wait for them instead: recovery can’t be undone. This replica has every change up to':
    'Se puderem voltar, espere por elas: a recuperação não pode ser anulada. Esta réplica tem todas as alterações até',
  ', the last one at': ', a última às',
  'I checked that the missing replicas’ nodes are gone, not only slow or restarting':
    'Confirmei que os nós das réplicas em falta desapareceram, e não estão só lentos ou a reiniciar',
  'I understand that changes only the missing replicas had are lost, and that everyone is signed out':
    'Compreendo que se perdem as alterações que só as réplicas em falta tinham, e que a sessão de todos é terminada',
  'I have a recent backup, or accept running without one': 'Tenho uma cópia de segurança recente, ou aceito continuar sem uma',
  'Couldn’t check the cluster': 'Não foi possível verificar o cluster',
  'The replica that took this request didn’t answer. Try again, or open the admin interface of a surviving replica directly.':
    'A réplica que recebeu este pedido não respondeu. Tente novamente, ou abra diretamente a interface de administração de uma réplica sobrevivente.',
  Cancel: 'Cancelar',
  'Try again': 'Tentar novamente',
  Continue: 'Continuar',
  '{node} becomes the only voter, and changes resume. Then add voters back: the other replicas rejoin as new ones when their nodes return, or deploy the stack again on 3 nodes.':
    '{node} passa a ser o único votante, e as alterações são retomadas. Depois, volte a adicionar votantes: as outras réplicas entram como novas quando os nós voltarem, ou implemente a stack novamente em 3 nós.',
  recover: 'recuperar',
  'Type {node} to confirm': 'Escreva {node} para confirmar',
  'Your password': 'A sua palavra-passe',
  'Code from your authenticator app': 'Código da sua aplicação de autenticação',
  'Recovery codes don’t work here.': 'Os códigos de recuperação não funcionam aqui.',
  'Recovering…': 'A recuperar…',
  'Recover cluster': 'Recuperar o cluster',
  'When it’s back, in a minute or so, it’s the only voter of a new cluster and accepts changes again. Everyone was signed out.':
    'Quando voltar, dentro de um minuto, é o único votante de um cluster novo e volta a aceitar alterações. A sessão de todos foi terminada.',
  'Sign in again.': 'Inicie sessão novamente.',
  'Review users and roles, and redo recent changes that are missing.':
    'Reveja os utilizadores e as funções, e refaça as alterações recentes que faltem.',
  'Take a backup.': 'Faça uma cópia de segurança.',
  'Go to sign-in': 'Ir para o início de sessão',
};
