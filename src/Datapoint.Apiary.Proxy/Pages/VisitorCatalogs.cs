using System.Collections.Frozen;

namespace Datapoint.Apiary.Proxy.Pages;

public static class VisitorCatalogs
{
    public static readonly FrozenDictionary<string, string> Portuguese = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["Not found"] = "Não encontrado",
        ["There's nothing here"] = "Não há nada aqui",
        ["No site is set up at this address. If you expected one, check the address, or contact whoever runs it."] =
            "Não há nenhum site configurado neste endereço. Se esperava um, verifique o endereço ou contacte quem o gere.",
        ["Starting"] = "A iniciar",
        ["This server is starting"] = "Este servidor está a iniciar",
        ["It isn't ready to serve this site yet. Try again in a minute."] = "Ainda não está pronto para servir este site. Tente novamente daqui a um minuto.",
        ["Unavailable"] = "Indisponível",
        ["This site is unavailable"] = "Este site está indisponível",
        ["It's turned off for now. If you expected it to work, contact whoever runs it."] =
            "Está desligado por agora. Se esperava que funcionasse, contacte quem o gere.",
        ["Not allowed"] = "Não permitido",
        ["You can't open this site from here"] = "Não pode abrir este site a partir daqui",
        ["It only accepts visitors from certain networks. If you need it, contact whoever runs it."] =
            "Só aceita visitantes de certas redes. Se precisar dele, contacte quem o gere.",
        ["Too many requests"] = "Demasiados pedidos",
        ["This site got too many requests from your network. Wait a moment, then try again."] =
            "Este site recebeu demasiados pedidos da sua rede. Aguarde um momento e tente novamente.",
        ["Maintenance"] = "Manutenção",
        ["Down for maintenance"] = "Em manutenção",
        ["This site is being worked on. Try again after {0} UTC."] = "Este site está em manutenção. Tente novamente depois de {0} UTC.",
        ["Not ready"] = "Ainda não está pronto",
        ["This site needs a secure connection"] = "Este site precisa de uma ligação segura",
        ["It asks for a password, which is only sent over HTTPS, and HTTPS isn't ready for this address yet. Try again in a few minutes."] =
            "Pede uma palavra-passe, que só é enviada por HTTPS, e o HTTPS ainda não está pronto para este endereço. Tente novamente daqui a alguns minutos.",
        ["Password"] = "Palavra-passe",
        ["Restricted access"] = "Acesso restrito",
        ["Enter the password you were given."] = "Introduza a palavra-passe que lhe deram.",
        ["This sign-in link no longer works. Enter the password, or ask whoever sent it for a new link."] =
            "Esta ligação de acesso já não funciona. Introduza a palavra-passe, ou peça uma nova ligação a quem a enviou.",
        ["Enter the password."] = "Introduza a palavra-passe.",
        ["That password isn't right. Check it, or ask whoever sent you the link."] =
            "Essa palavra-passe não está correta. Verifique-a, ou peça-a a quem lhe enviou a ligação.",
        ["Too many tries from your network. Wait 5 minutes, then try again."] =
            "Demasiadas tentativas a partir da sua rede. Aguarde 5 minutos e tente novamente.",
        ["Continue"] = "Continuar",
        ["No password? Ask whoever sent you the link."] = "Não tem a palavra-passe? Peça-a a quem lhe enviou a ligação.",
        ["Someone shared this site with you."] = "Alguém partilhou este site consigo.",
        ["You stay signed in on this browser for 1 day."] = "Mantém a sessão neste navegador durante 1 dia.",
        ["You stay signed in on this browser for {0} days."] = "Mantém a sessão neste navegador durante {0} dias.",
        ["Powered by Apiary"] = "Com tecnologia Apiary",
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
