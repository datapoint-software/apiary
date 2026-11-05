import { TextCatalog } from '@datapoint/apiary-ui';

export const proxiesPortuguese: TextCatalog = {
  'Trusted proxies': 'Proxies de confiança',
  'Load balancers, CDNs and other proxies in front of Apiary. Requests from them keep the client’s address in X-Forwarded-For and the scheme in X-Forwarded-Proto, and routes use them for allowlists, rate limits, password tries, HTTPS and the access log.':
    'Balanceadores de carga, CDN e outros proxies à frente do Apiary. Os pedidos que vêm deles mantêm o endereço do cliente em X-Forwarded-For e o esquema em X-Forwarded-Proto, e as rotas usam-nos nas listas de endereços permitidos, nos limites de pedidos, nas tentativas de palavra-passe, no HTTPS e no registo de acessos.',
  'Add proxy': 'Adicionar proxy',
  'Only public routes use this. The admin interface always checks the connection’s own address, so its allowlist can’t be fooled by a header.':
    'Só as rotas públicas usam isto. A interface de administração verifica sempre o endereço da própria ligação, por isso a sua lista de endereços permitidos não pode ser enganada por um cabeçalho.',
  '{count} range hasn’t sent a request for a day': '{count} intervalo não envia pedidos há um dia',
  '{count} ranges haven’t sent a request for a day': '{count} intervalos não enviam pedidos há um dia',
  '. If the provider changed its ranges, requests from the new ones are treated as coming from the proxy itself. Remove ranges that are no longer in use.':
    '. Se o fornecedor mudou os seus intervalos, os pedidos dos novos são tratados como vindos do próprio proxy. Remova os intervalos que já não estão em uso.',
  Proxies: 'Proxies',
  'Changes reach every replica within seconds. Last request is the latest on any replica since it started.':
    'As alterações chegam a todas as réplicas em segundos. O último pedido é o mais recente em qualquer réplica desde que arrancou.',
  'Only Administrators can change them. Last request is the latest on any replica since it started.':
    'Só os Administradores os podem mudar. O último pedido é o mais recente em qualquer réplica desde que arrancou.',
  Loading: 'A carregar',
  'No trusted proxies': 'Sem proxies de confiança',
  'Apiary uses the address of each connection, and replaces any X-Forwarded-For it receives. Add your load balancer or CDN if one sits in front of Apiary.':
    'O Apiary usa o endereço de cada ligação, e substitui qualquer X-Forwarded-For que receba. Adicione o seu balanceador de carga ou CDN, se houver um à frente do Apiary.',
  'Address or range': 'Endereço ou intervalo',
  'What it is': 'O que é',
  'Last request': 'Último pedido',
  Actions: 'Ações',
  Public: 'Público',
  'No note': 'Sem nota',
  'No requests yet': 'Ainda sem pedidos',
  'Last {ago}': 'Último {ago}',
  'Edit {name}': 'Editar {name}',
  'Remove {name}': 'Remover {name}',
  'Edit…': 'Editar…',
  'Remove…': 'Remover…',
  'Requests from {range} now keep their X-Forwarded-For, on every replica.':
    'Os pedidos de {range} passam a manter o X-Forwarded-For, em todas as réplicas.',
  'Proxy added': 'Proxy adicionado',
  Saved: 'Guardado',
  'Stop trusting {range}?': 'Deixar de confiar em {range}?',
  'Requests from it will count as coming from the proxy itself: route allowlists see the proxy’s address, everyone behind it shares one rate limit, and Apiary replaces the X-Forwarded-For it sends on.':
    'Os pedidos que vêm dele passam a contar como vindos do próprio proxy: as listas de endereços permitidos das rotas veem o endereço do proxy, todos os que estão atrás dele partilham um limite de pedidos, e o Apiary substitui o X-Forwarded-For que envia.',
  'It sent a request {ago}.': 'Enviou um pedido {ago}.',
  'Remove proxy': 'Remover proxy',
  'Removing…': 'A remover…',
  '{range} is no longer trusted.': '{range} deixou de ser de confiança.',
  'Add a trusted proxy': 'Adicionar um proxy de confiança',
  'Edit {range}': 'Editar {range}',
  'The address your proxy connects to Apiary from, or the range its provider publishes. IPv4 or IPv6.':
    'O endereço a partir do qual o seu proxy se liga ao Apiary, ou o intervalo que o fornecedor publica. IPv4 ou IPv6.',
  'So whoever reads this later knows why it’s trusted.': 'Para quem ler isto mais tarde saber porque é de confiança.',
  '{range} is a public range': '{range} é um intervalo público',
  'Anyone who can send requests from it can claim any client address and get past route allowlists. For a CDN or WAF, add only the ranges it publishes for its proxies, and keep them up to date when it changes them.':
    'Quem conseguir enviar pedidos a partir dele pode alegar qualquer endereço de cliente e passar as listas de endereços permitidos das rotas. Para uma CDN ou WAF, adicione só os intervalos que publica para os seus proxies, e mantenha-os atualizados quando os mudar.',
  'Only add proxies that replace X-Forwarded-For or add to the end of it, and that reach Apiary over HTTPS or a private network: Apiary believes the scheme they report.':
    'Só adicione proxies que substituem o X-Forwarded-For ou acrescentam ao fim dele, e que chegam ao Apiary por HTTPS ou por uma rede privada: o Apiary acredita no esquema que eles indicam.',
  Cancel: 'Cancelar',
  Save: 'Guardar',
  'Saving…': 'A guardar…',
  'Try a request': 'Experimentar um pedido',
  'See which address and scheme routes would use for a request, with the list above. Nothing is sent or saved.':
    'Veja que endereço e esquema as rotas usariam num pedido, com a lista acima. Nada é enviado nem guardado.',
  'Connection from': 'Ligação a partir de',
  'The address Apiary sees the request come from.': 'O endereço de onde o Apiary vê chegar o pedido.',
  'X-Forwarded-For received': 'X-Forwarded-For recebido',
  'Addresses separated by commas, as the proxy sent them.': 'Endereços separados por vírgulas, tal como o proxy os enviou.',
  'X-Forwarded-Proto received': 'X-Forwarded-Proto recebido',
  'Client address': 'Endereço do cliente',
  Scheme: 'Esquema',
  'X-Forwarded-For sent on': 'X-Forwarded-For enviado',
  Why: 'Porquê',
  'Enter an IPv4 or IPv6 address, such as 173.245.48.10.': 'Introduza um endereço IPv4 ou IPv6, como 173.245.48.10.',
  'Enter the address the connection comes from.': 'Introduza o endereço de onde vem a ligação.',
  'The connection isn’t from a trusted proxy, so its own address is the client’s.':
    'A ligação não vem de um proxy de confiança, por isso o seu próprio endereço é o do cliente.',
  'The connection isn’t from a trusted proxy, so Apiary ignores the headers it received and sends new ones.':
    'A ligação não vem de um proxy de confiança, por isso o Apiary ignora os cabeçalhos que recebeu e envia novos.',
  'X-Forwarded-For has more than {count} addresses, so Apiary ignores the headers and uses the proxy’s own address.':
    'O X-Forwarded-For tem mais de {count} endereços, por isso o Apiary ignora os cabeçalhos e usa o endereço do próprio proxy.',
  'X-Forwarded-For has something that isn’t an address, so Apiary ignores the headers and uses the proxy’s own address.':
    'O X-Forwarded-For tem algo que não é um endereço, por isso o Apiary ignora os cabeçalhos e usa o endereço do próprio proxy.',
  'The proxy sent no X-Forwarded-For, so Apiary uses the proxy’s own address.':
    'O proxy não enviou X-Forwarded-For, por isso o Apiary usa o endereço do próprio proxy.',
  'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary takes the first address it doesn’t trust.':
    'A ligação vem de um proxy de confiança. Lendo o X-Forwarded-For da direita para a esquerda, o Apiary fica com o primeiro endereço em que não confia.',
  'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary skips {count} more trusted address and takes the first address it doesn’t trust.':
    'A ligação vem de um proxy de confiança. Lendo o X-Forwarded-For da direita para a esquerda, o Apiary salta mais {count} endereço de confiança e fica com o primeiro endereço em que não confia.',
  'The connection is from a trusted proxy. Reading X-Forwarded-For from the right, Apiary skips {count} more trusted addresses and takes the first address it doesn’t trust.':
    'A ligação vem de um proxy de confiança. Lendo o X-Forwarded-For da direita para a esquerda, o Apiary salta mais {count} endereços de confiança e fica com o primeiro endereço em que não confia.',
  'X-Forwarded-Proto isn’t http or https, so it counts as http.': 'O X-Forwarded-Proto não é http nem https, por isso conta como http.',
};
