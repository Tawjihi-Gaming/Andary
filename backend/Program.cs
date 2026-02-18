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

#region App Pipeline
var app = builder.Build();
app.UseAppPipeline().UseAppInfrastructure();
app.Run();
#endregion
