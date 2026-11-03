using Datapoint.Apiary.Commands;
using Datapoint.Apiary.Health;
using Datapoint.Apiary.Hosting;

if (args is ["health"])
{
    return await HealthCommand.RunAsync();
}

if (args is ["users", "create-admin", .. var options])
{
    return await CreateAdminCommand.RunAsync(options);
}

var builder = WebApplication.CreateBuilder(args);
builder.AddApiaryListeners();
builder.Services.AddApiary(builder.Configuration);

var app = builder.Build();
app.UseApiary();
await app.RunAsync();
return 0;
