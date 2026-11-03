using System.Collections.Concurrent;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;

namespace Datapoint.Apiary.Auth;

public sealed class InMemoryKeyRing : IXmlRepository
{
    private readonly ConcurrentQueue<XElement> _elements = new();

    public IReadOnlyCollection<XElement> GetAllElements() => [.. _elements];

    public void StoreElement(XElement element, string friendlyName) => _elements.Enqueue(element);
}
