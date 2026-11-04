import { MessageCatalog } from './message-catalog';

export const portugueseMessages: MessageCatalog = {
  internal: () => 'Algo correu mal no servidor. Tente novamente; se continuar a acontecer, consulte os registos do Apiary.',
  'request.invalid': () => 'Não foi possível ler o pedido. Recarregue a página e tente novamente.',
  'request.notFound': () => 'Isto já não existe. Recarregue a página para ver o que lá está agora.',
  'request.tooMany': (p) => `Demasiados pedidos da sua rede. Aguarde ${p['retryAfter']} segundos e tente novamente.`,
  'auth.required': () => 'A sua sessão terminou. Inicie sessão novamente para continuar.',
  'auth.forbidden': () => 'A sua função não permite isto. Peça a um Administrador se precisar.',
  'cluster.noQuorum': () =>
    'As alterações estão em pausa enquanto o cluster não conseguir contactar a maioria dos votantes. Tente novamente quando recuperar.',
  'cluster.notReady': () =>
    'Esta réplica ainda se está a juntar ao cluster. Tente novamente daqui a um minuto, ou use o endereço de outra réplica.',
  'cluster.upgrading': () =>
    'Algumas réplicas ainda usam uma versão anterior que não consegue guardar esta alteração. Tente novamente quando a atualização terminar.',
  'network.offline': () => 'O Apiary não respondeu. Verifique a sua ligação e tente novamente.',
  required: () => 'Preencha este campo.',
  invalid: () => 'Verifique este valor.',
  tooLong: (p) => `Use no máximo ${p['max']} caracteres.`,
  range: (p) => `Introduza um número de ${p['min']} a ${p['max']}.`,
  'dateTime.format': () => 'Introduza uma data e hora como 2026-11-03 14:00, em UTC.',
  'hostname.required': () => 'Introduza um nome de anfitrião, como shop.example.com.',
  'hostname.invalid': () => 'Introduza um nome de anfitrião, como shop.example.com.',
  'hostname.scheme': () => 'Introduza só o nome do anfitrião, sem http:// nem https://.',
  'hostname.path': () => 'Introduza só o nome do anfitrião. Adicione um caminho no campo Caminho.',
  'hostname.address': () =>
    'Use um nome de anfitrião, não um endereço IP: não é possível emitir certificados para endereços IP.',
  'hostname.tooLong': () => 'Um nome de anfitrião pode ter no máximo 253 caracteres.',
  'hostname.notFull': () => 'Introduza um nome de anfitrião completo, como shop.example.com.',
  'hostname.consecutiveDots': () => 'Um nome de anfitrião não tem partes vazias: verifique se há dois pontos seguidos.',
  'hostname.label': () =>
    'Use letras, algarismos e hífenes em cada parte do nome do anfitrião, sem começar nem acabar com hífen.',
  'port.required': () => 'Introduza uma porta, como 8080.',
  'path.invalid': () => 'Introduza um caminho que comece por /, como /api, sem ? nem #.',
  'target.required': () => 'Introduza um destino, como o nome de serviço shop-v1.',
  'target.invalid': () => 'Use um nome de serviço, nome de anfitrião ou endereço IP.',
  'target.port': () => 'Introduza a porta no campo Porta.',
  'target.loopback': () =>
    'O Apiary não encaminha para endereços de loopback. Use o nome do serviço na rede partilhada, como shop-v1.',
  'target.linkLocal': () =>
    'O Apiary não encaminha para endereços link-local nem para endpoints de metadados da cloud. Use o nome do serviço na rede partilhada.',
  'target.unspecified': () => 'Use o endereço do próprio serviço, não 0.0.0.0 nem ::.',
  'password.tooShort': (p) => `Use pelo menos ${p['min']} caracteres.`,
  'password.tooLong': (p) => `Use no máximo ${p['max']} caracteres.`,
  'password.common': () => 'Esta palavra-passe é demasiado fácil de adivinhar. Experimente algumas palavras sem relação entre si.',
  'password.containsEmail': () => 'Não use o nome do seu email na palavra-passe.',
  'code.format': () => 'Introduza os 6 algarismos que a aplicação mostra.',
  'ipRange.invalid': () => 'Introduza um endereço ou intervalo IPv4 ou IPv6, como 10.0.0.0/8.',
};
