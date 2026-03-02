using Backend.Extensions;

#region App Builder
var builder = WebApplication.CreateBuilder(args)
.AddAppBuilder();
#endregion

#region JWT Authentication
builder.Services.AddJwtAuthentication();
#endregion

#region Google OAuth Configuration
builder.Services.AddGoogleOAuth();
#endregion

#region Database
builder.Services.AddAppDatabase();
#endregion

#region Services
builder.Services.AddAppServices();
#endregion

#region Rate Limiting
builder.Services.AddAppRateLimiting(builder.Configuration);
#endregion

#region App
var app = builder.Build();
#endregion

#region Database Seeding
await app.SeedDatabaseAsync();
#endregion

#region App Pipeline
app.UseAppPipeline().UseAppInfrastructure();
app.Run();
#endregion
