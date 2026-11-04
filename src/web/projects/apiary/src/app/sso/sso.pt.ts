import { TextCatalog } from '@datapoint/apiary-ui';

export const ssoPortuguese: TextCatalog = {
  'Single sign-on': 'Início de sessão único',
  'Let people sign in through your identity provider, with OpenID Connect.':
    'Permita que as pessoas iniciem sessão através do seu fornecedor de identidade, com OpenID Connect.',
  'Changed {time}': 'Alterado {time}',
  'Not set up yet': 'Ainda não configurado',
  'save single sign-on': 'guardar o início de sessão único',
  'Identity provider': 'Fornecedor de identidade',
  'Register Apiary at your provider as a confidential web client first, with this redirect URI.':
    'Registe primeiro o Apiary no seu fornecedor como cliente web confidencial, com este URI de redirecionamento.',
  'Redirect URI': 'URI de redirecionamento',
  'Use the address people open Apiary at. Each address needs its own redirect URI at the provider.':
    'Use o endereço onde as pessoas abrem o Apiary. Cada endereço precisa do seu próprio URI de redirecionamento no fornecedor.',
  'Name on the sign-in button': 'Nome no botão de início de sessão',
  'Such as Entra ID or Keycloak.': 'Como Entra ID ou Keycloak.',
  'Groups claim': 'Claim dos grupos',
  'The ID token claim that lists groups.': 'A claim do token de ID que lista os grupos.',
  Issuer: 'Emissor',
  'Apiary reads its configuration from /.well-known/openid-configuration under this address.':
    'O Apiary lê a configuração em /.well-known/openid-configuration neste endereço.',
  'Client id': 'ID de cliente',
  'Client secret': 'Segredo de cliente',
  'Saved. Leave it empty to keep it.': 'Guardado. Deixe vazio para o manter.',
  'Stored encrypted, and never shown again.': 'Guardado cifrado, e nunca mais mostrado.',
  'Roles from groups': 'Funções a partir de grupos',
  'One group per line, as the provider names it. Someone in several groups gets the highest role; someone in none can’t sign in.':
    'Um grupo por linha, com o nome que o fornecedor lhe dá. Quem estiver em vários grupos recebe a função mais alta; quem não estiver em nenhum não consegue iniciar sessão.',
  Administrators: 'Administradores',
  Operators: 'Operadores',
  Viewers: 'Observadores',
  'Keep a password account': 'Mantenha uma conta com palavra-passe',
  'Keep at least one Administrator who signs in with a password, for when the provider is down or misconfigured. Apiary never links a single sign-on identity to an existing password account.':
    'Mantenha pelo menos um administrador que inicie sessão com palavra-passe, para quando o fornecedor estiver em baixo ou mal configurado. O Apiary nunca associa uma identidade de início de sessão único a uma conta com palavra-passe existente.',
  'Sign-in page': 'Página de início de sessão',
  'Offer single sign-on': 'Oferecer início de sessão único',
  'Turning it off, or changing the issuer, signs out everyone who signed in through it.':
    'Desativá-lo, ou mudar o emissor, termina a sessão de todos os que a iniciaram através dele.',
  'Saving…': 'A guardar…',
  'Save single sign-on': 'Guardar início de sessão único',
  'Single sign-on saved. The sign-in page offers it now.':
    'Início de sessão único guardado. A página de início de sessão já o oferece.',
  'Single sign-on saved. It’s off.': 'Início de sessão único guardado. Está desativado.',
};
