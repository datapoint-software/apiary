using System.Text;

namespace Datapoint.Apiary.Stacks;

public static class LabelInterpolation
{
    public static string Apply(string value, Func<string, string?> environment)
    {
        var result = new StringBuilder(value.Length);
        for (var i = 0; i < value.Length; i++)
        {
            if (value[i] != '$' || i == value.Length - 1)
            {
                result.Append(value[i]);
                continue;
            }

            i = Substitute(value, i, result, environment);
        }

        return result.ToString();
    }

    private static int Substitute(string value, int dollar, StringBuilder result, Func<string, string?> environment)
    {
        var next = value[dollar + 1];
        if (next == '$')
        {
            result.Append('$');
            return dollar + 1;
        }

        if (next == '{')
        {
            var close = value.IndexOf('}', dollar + 2);
            if (close < 0)
            {
                result.Append(value, dollar, value.Length - dollar);
                return value.Length;
            }

            result.Append(Braced(value[(dollar + 2)..close], environment));
            return close;
        }

        if (!char.IsAsciiLetter(next) && next != '_')
        {
            result.Append('$');
            return dollar;
        }

        var end = dollar + 1;
        while (end < value.Length && (char.IsAsciiLetterOrDigit(value[end]) || value[end] == '_'))
        {
            end++;
        }

        result.Append(environment(value[(dollar + 1)..end]) ?? "");
        return end - 1;
    }

    private static string Braced(string expression, Func<string, string?> environment)
    {
        var ifUnsetOrEmpty = expression.IndexOf(":-", StringComparison.Ordinal);
        if (ifUnsetOrEmpty > 0)
        {
            var set = environment(expression[..ifUnsetOrEmpty]);
            return string.IsNullOrEmpty(set) ? expression[(ifUnsetOrEmpty + 2)..] : set;
        }

        var ifUnset = expression.IndexOf('-', StringComparison.Ordinal);
        if (ifUnset > 0)
        {
            return environment(expression[..ifUnset]) ?? expression[(ifUnset + 1)..];
        }

        return environment(expression) ?? "";
    }
}
