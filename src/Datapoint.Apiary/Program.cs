using Datapoint.Apiary.Health;
using Datapoint.Apiary.Hosting;

if (args is ["health"])
{
    return await HealthCommand.RunAsync();
}

var builder = WebApplication.CreateBuilder(args);
builder.AddApiaryListeners();
builder.Services.AddApiary(builder.Configuration);

var app = builder.Build();
app.UseApiary();
await app.RunAsync();
return 0;
