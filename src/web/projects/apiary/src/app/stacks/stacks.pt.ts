import { TextCatalog } from '@datapoint/apiary-ui';

export const stacksPortuguese: TextCatalog = {
  Stacks: 'Stacks',
  Stack: 'Stack',
  'Swarm stacks whose routes come from labels in their stack file. Their pipeline applies the file after each deploy.':
    'Stacks do Swarm cujas rotas vêm das etiquetas do ficheiro da stack. A pipeline de cada uma aplica o ficheiro depois de cada implementação.',
  'Add stack': 'Adicionar stack',
  'Add a stack': 'Adicionar uma stack',
  'No stacks yet': 'Ainda não há stacks',
  'Add the stacks you deploy from CI. Apiary gives each one a pipeline token, and its pipeline applies the routes in the stack file’s labels.':
    'Adicione as stacks que implementa a partir da CI. O Apiary dá a cada uma um token de pipeline, e a sua pipeline aplica as rotas das etiquetas do ficheiro da stack.',
  'Only Administrators can add stacks.': 'Só os Administradores podem adicionar stacks.',
  Declares: 'Declara',
  'Last applied': 'Última aplicação',
  Changes: 'Alterações',
  'From labels': 'Pelas etiquetas',
  'Last apply failed': 'A última aplicação falhou',
  'Applied {time} by': 'Aplicada {time} por',
  'Waiting for the first apply': 'À espera da primeira aplicação',
  Nothing: 'Nada',
  'No changes': 'Sem alterações',
  '{count} change': '{count} alteração',
  '{count} changes': '{count} alterações',
  '{count} route': '{count} rota',
  '{count} routes': '{count} rotas',
  '{count} stream route': '{count} rota TCP ou UDP',
  '{count} stream routes': '{count} rotas TCP ou UDP',
  '{count} redirect': '{count} redirecionamento',
  '{count} redirects': '{count} redirecionamentos',
  'Last applied {time} by pipeline': 'Aplicada {time} pela pipeline',
  commit: 'commit',
  'pipeline run': 'execução da pipeline',
  'Added {time}': 'Adicionada {time}',
  'This stack doesn’t exist': 'Esta stack não existe',
  'All stacks': 'Todas as stacks',
  'The last apply failed {time}': 'A última aplicação falhou {time}',
  Pipeline: 'Pipeline',
  error: 'erro',
  'Nothing changed. This clears when an apply succeeds.':
    'Nada mudou. Isto desaparece quando uma aplicação for bem-sucedida.',
  'Last apply': 'Última aplicação',
  '{date} UTC. Every apply is in the audit log.':
    '{date} UTC. Todas as aplicações estão no registo de auditoria.',
  'What it declares': 'O que declara',
  'Fields the labels set are locked on their pages. Disabling and maintenance windows stay available.':
    'Os campos definidos pelas etiquetas ficam bloqueados nas suas páginas. Desativar e as janelas de manutenção continuam disponíveis.',
  'Nothing: the last apply removed everything it declared.':
    'Nada: a última aplicação removeu tudo o que declarava.',
  'What {stack} declares': 'O que {stack} declara',
  Name: 'Nome',
  Kind: 'Tipo',
  Service: 'Serviço',
  Route: 'Rota',
  'Stream route': 'Rota TCP ou UDP',
  Redirect: 'Redirecionamento',
  'First apply': 'Primeira aplicação',
  'Nothing has applied {stack} yet': 'A stack {stack} ainda não foi aplicada',
  'Add the commands under Apply from your pipeline, below, to the pipeline that deploys {stack}, with its token as APIARY_TOKEN. After its first run, the routes in its labels appear here.':
    'Adicione os comandos de Aplicar a partir da pipeline, abaixo, à pipeline que implementa {stack}, com o seu token como APIARY_TOKEN. Depois da primeira execução, as rotas das suas etiquetas aparecem aqui.',
  'Pipeline tokens': 'Tokens de pipeline',
  'A pipeline needs one to apply {stack}.': 'Uma pipeline precisa de um para aplicar {stack}.',
  'Only Administrators can create or revoke them.':
    'Só os Administradores os podem criar ou revogar.',
  'Create token': 'Criar token',
  'No tokens': 'Sem tokens',
  'Nothing can apply {stack} until an Administrator creates a token.':
    'Nada pode aplicar {stack} até um Administrador criar um token.',
  'Apply from your pipeline': 'Aplicar a partir da pipeline',
  'Apiary never connects to Docker. Your pipeline reads the labels from the stack file and sends them here, so routes change in the same commit as the services. It calls the admin port, so it must run inside your network, like the people who use this interface.':
    'O Apiary nunca se liga ao Docker. A sua pipeline lê as etiquetas do ficheiro da stack e envia-as para aqui, para que as rotas mudem no mesmo commit que os serviços. Chama a porta de administração, por isso tem de correr dentro da sua rede, tal como as pessoas que usam esta interface.',
  'Add apiary.* labels under deploy.labels of each service:':
    'Adicione etiquetas apiary.* em deploy.labels de cada serviço:',
  'Passwords, sign-in links, certificates and allowed addresses can’t be set by labels: anyone who can inspect the service could read them.':
    'Palavras-passe, ligações de início de sessão, certificados e endereços permitidos não podem ser definidos por etiquetas: quem puder inspecionar o serviço conseguiria lê-los.',
  'In merge requests, show what an apply would change, without changing it:':
    'Nos merge requests, mostre o que uma aplicação mudaria, sem mudar nada:',
  'After the deploy, apply it. Routes of {stack} missing from the file are removed.':
    'Depois da implementação, aplique-o. As rotas de {stack} que faltem no ficheiro são removidas.',
  'If the admin certificate is self-signed, add --certificate-sha256 with its fingerprint, from the Certificates page.':
    'Se o certificado de administração for autoassinado, acrescente --certificate-sha256 com a sua impressão digital, que está na página Certificados.',
  'Danger zone': 'Zona de perigo',
  'Remove this stack': 'Remover esta stack',
  'After docker stack rm. Deletes everything it declared and revokes its tokens.':
    'Depois de docker stack rm. Elimina tudo o que declarava e revoga os seus tokens.',
  'Needs the Administrator role.': 'Requer a função de Administrador.',
  'Remove stack…': 'Remover stack…',
  'Remove stack': 'Remover stack',
  'Removing…': 'A remover…',
  'Remove stack {stack}?': 'Remover a stack {stack}?',
  'Apiary deletes its {items} on every replica, and requests to them get a 404 at once.':
    'O Apiary elimina {items} em todas as réplicas, e os pedidos para eles recebem um 404 de imediato.',
  'Its pipeline token stops working.': 'O seu token de pipeline deixa de funcionar.',
  'Its {count} pipeline tokens stop working.':
    'Os seus {count} tokens de pipeline deixam de funcionar.',
  'Do this after docker stack rm {stack}: Apiary never touches Docker, so the services keep running until you run it.':
    'Faça isto depois de docker stack rm {stack}: o Apiary nunca mexe no Docker, por isso os serviços continuam a correr até o executar.',
  'Stack {stack} was removed.': 'A stack {stack} foi removida.',
  'Stack name': 'Nome da stack',
  'The name your pipeline gives docker stack deploy, such as shop.':
    'O nome que a sua pipeline dá a docker stack deploy, como shop.',
  Project: 'Projeto',
  'Where its routes go when their labels don’t name a project.':
    'Para onde vão as suas rotas quando as etiquetas não indicam um projeto.',
  'Set by the apiary.project label': 'Definido pela etiqueta apiary.project',
  'Token name': 'Nome do token',
  'For the stack’s first pipeline token. It appears in the audit log for every apply, so name the pipeline that uses it.':
    'Para o primeiro token de pipeline da stack. Aparece no registo de auditoria em cada aplicação, por isso dê-lhe o nome da pipeline que o usa.',
  'Token expires after': 'O token expira ao fim de',
  '30 days': '30 dias',
  '90 days': '90 dias',
  '1 year': '1 ano',
  Cancel: 'Cancelar',
  'Adding…': 'A adicionar…',
  'Creating…': 'A criar…',
  'Create a pipeline token for {stack}': 'Criar um token de pipeline para {stack}',
  'Shown in the audit log for every apply, so name the pipeline that uses it.':
    'Aparece no registo de auditoria em cada aplicação, por isso dê-lhe o nome da pipeline que o usa.',
  'Expires after': 'Expira ao fim de',
  'Create a new one before it expires, and update the CI variable.':
    'Crie um novo antes de expirar, e atualize a variável da CI.',
  'It can only apply {stack}: it can’t change other stacks, routes not from a stack, users or settings.':
    'Só pode aplicar {stack}: não pode mudar outras stacks, rotas que não vêm de uma stack, utilizadores nem definições.',
  Token: 'Token',
  Tokens: 'Tokens',
  Created: 'Criado',
  'Last used': 'Última utilização',
  Expires: 'Expira',
  Never: 'Nunca',
  Actions: 'Ações',
  'Revoke {name}': 'Revogar {name}',
  'Revoke…': 'Revogar…',
  'Revoke {name}?': 'Revogar {name}?',
  'Pipelines that use it can’t apply {stack} anymore. The routes it applied stay as they are.':
    'As pipelines que o usam deixam de poder aplicar {stack}. As rotas que aplicou ficam como estão.',
  'Revoke token': 'Revogar token',
  'Revoking…': 'A revogar…',
  '{name} no longer works.': '{name} deixou de funcionar.',
  'Token {name}': 'Token {name}',
  'Store it as a masked, protected CI variable named':
    'Guarde-o como uma variável da CI mascarada e protegida chamada',
  '. You won’t see it again: Apiary keeps only a hash.':
    '. Não o voltará a ver: o Apiary guarda apenas um hash.',
  'Anyone with it can change or remove the routes of {stack} until {date}. If it leaks, revoke it.':
    'Quem o tiver pode mudar ou remover as rotas de {stack} até {date}. Se for divulgado, revogue-o.',
  'I stored it': 'Já o guardei',
  'A CI pipeline uses a token to sign in to Apiary and apply a stack file, so the routes in its labels change in the same deploy as the services. You only need one if you deploy from CI.':
    'Uma pipeline de CI usa um token para entrar no Apiary e aplicar um ficheiro de stack, para que as rotas das suas etiquetas mudem na mesma implementação que os serviços. Só precisa de um se implementar a partir da CI.',
  'Each token can only change the stack it was created for: it can’t change other stacks, routes not from a stack, users or settings. To create one, open the stack on the':
    'Cada token só pode mudar a stack para a qual foi criado: não pode mudar outras stacks, rotas que não vêm de uma stack, utilizadores nem definições. Para criar um, abra a stack na página',
  'page. Revoking a token stops its pipeline at once, and the routes it applied stay as they are.':
    '. Revogar um token trava de imediato a sua pipeline, e as rotas que aplicou ficam como estão.',
  'No pipeline tokens': 'Sem tokens de pipeline',
  'Nothing can apply a stack file yet, so routes change only here, in the API and through agents. To let a pipeline apply one, open its stack on the':
    'Ainda nada pode aplicar um ficheiro de stack, por isso as rotas só mudam aqui, na API e através de agentes. Para deixar uma pipeline aplicar um, abra a stack na página',
  'page and create a token.': 'e crie um token.',
  'Nothing changed: the stack file matched what Apiary had.':
    'Nada mudou: o ficheiro da stack correspondia ao que o Apiary tinha.',
  'It replaced a value {name} set {time}. A label sets it now, so it’s locked.':
    'Substituiu um valor que {name} definiu {time}. Agora é uma etiqueta que o define, por isso fica bloqueado.',
  Added: 'Adicionado',
  Changed: 'Alterado',
  'Replaced a change': 'Substituiu uma alteração',
  Removed: 'Removido',
  Hostname: 'Nome do anfitrião',
  Path: 'Caminho',
  Target: 'Destino',
  Timeout: 'Tempo limite',
  'Rate limit': 'Limite de pedidos',
  Protocol: 'Protocolo',
  'Listen port': 'Porta de escuta',
  'Target port': 'Porta do destino',
  From: 'De',
  To: 'Para',
  'Status code': 'Código de estado',
  'Declared in stack': 'Vem da stack',
  'Set in stack': 'Definido na stack',
  'Declared in stack {stack}': 'Vem da stack {stack}',
  Loading: 'A carregar',
};
