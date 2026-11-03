namespace Datapoint.Apiary.Security.Passwords;

public static class CommonPasswords
{
    private const int MaximumRepeatedUnit = 4;

    private static readonly string[] s_sequences =
    [
        "abcdefghijklmnopqrstuvwxyz",
        "01234567890",
        "qwertyuiopasdfghjklzxcvbnm",
        "qwertzuiopasdfghjklyxcvbnm",
        "azertyuiopqsdfghjklmwxcvbn",
        "1qaz2wsx3edc4rfv5tgb6yhn7ujm8ik9ol0p",
        "zaq12wsxcde34rfvbgt56yhnmju78ik",
    ];

    private static readonly HashSet<string> s_known = new(StringComparer.Ordinal)
    {
        "passwordpassword", "password1234567", "password12345678", "password123456789", "passwordpassword1",
        "iloveyouiloveyou", "letmeinletmein1", "welcomewelcome1", "administrator1", "administrator123",
        "administrator1234", "adminadminadmin", "changemechangeme", "changeme1234567", "correcthorsebatterystaple",
        "thequickbrownfox", "thequickbrownfoxjumpsoverthelazydog", "trustno1trustno1", "football12345678",
        "baseball12345678", "superman12345678", "starwarsstarwars", "monkeymonkeymonkey", "dragondragondragon",
        "sunshinesunshine", "princessprincess", "masterkeymasterkey", "welcometoapiary", "apiaryapiaryapiary",
        "apiarypassword1", "apiaryadministrator", "datapointdatapoint", "mypasswordismypassword", "thisismypassword",
        "thisisapassword", "notmypassword123", "secretsecretsecret", "mysecretpassword", "verysecurepassword",
        "supersecretpassword", "strongpassword123", "securepassword123", "defaultpassword1", "temporarypassword",
        "newpasswordnewpassword", "passw0rdpassw0rd", "p@ssw0rdp@ssw0rd", "p@ssword12345678", "summer2024summer",
        "winter2024winter", "spring2025spring", "autumn2025autumn", "january2026january", "letmeinplease123",
    };

    public static bool IsCommon(string password)
    {
        var lower = password.ToLowerInvariant();
        return s_known.Contains(lower) || IsRepeatedUnit(lower) || IsSequence(lower) || IsFewDigits(lower);
    }

    private static bool IsRepeatedUnit(string password)
    {
        for (var unit = 1; unit <= MaximumRepeatedUnit; unit++)
        {
            if (IsRepetitionOf(password, unit))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsRepetitionOf(string password, int unit)
    {
        for (var i = unit; i < password.Length; i++)
        {
            if (password[i] != password[i % unit])
            {
                return false;
            }
        }

        return true;
    }

    private static bool IsSequence(string password) =>
        s_sequences.Any(sequence => Contains(sequence, password) || Contains(Reverse(sequence), password));

    private static bool Contains(string sequence, string password) =>
        (sequence + sequence).Contains(password, StringComparison.Ordinal);

    private static string Reverse(string value) => string.Concat(value.Reverse());

    private static bool IsFewDigits(string password) => password.All(char.IsAsciiDigit) && password.Distinct().Count() <= 3;
}
