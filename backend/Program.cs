using Backend.Data;
using Backend.Models.Configs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;

try
{
    #region App Builder
    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddControllers();
    builder.Services.AddOpenApi();
    DotNetEnv.Env.Load();

    #endregion

    #region JWT Authentication
    var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");
    var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER");
    var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE");

    if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
    {
        throw new InvalidOperationException("JWT configuration is missing (Jwt:Key, Jwt:Issuer, Jwt:Audience).");
    }

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                ClockSkew = TimeSpan.Zero,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var jwtToken = context.Request.Cookies["jwt"];
                    if (!string.IsNullOrEmpty(jwtToken))
                    {
                        context.Token = jwtToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });
    #endregion

    #region Google OAuth Configuration
    var googleOAuthJson = File.ReadAllText("Config/google.json");

    var googleOAuthConfig = JsonSerializer.Deserialize<GoogleOAuthConfig>(googleOAuthJson)
        ?? throw new InvalidOperationException("Google OAuth configuration is missing or invalid.");

    var envClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
    var envClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
    var envRedirectUri = Environment.GetEnvironmentVariable("GOOGLE_REDIRECT_URI");
    var envJsOrigins = Environment.GetEnvironmentVariable("GOOGLE_JAVASCRIPT_ORIGINS");

    if (string.IsNullOrWhiteSpace(envClientId)
        || string.IsNullOrWhiteSpace(envClientSecret)
        || string.IsNullOrWhiteSpace(envRedirectUri)
        || string.IsNullOrWhiteSpace(envJsOrigins))
    {
        throw new InvalidOperationException("Google OAuth env vars are missing. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_JAVASCRIPT_ORIGINS.");
    }

    googleOAuthConfig.web.client_id = envClientId;
    googleOAuthConfig.web.client_secret = envClientSecret;
    googleOAuthConfig.web.redirect_uris = new[] { envRedirectUri };
    googleOAuthConfig.web.javascript_origins = new[] { envJsOrigins };
    builder.Services.AddSingleton(googleOAuthConfig);
    #endregion

    #region Database

    var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Database connection is missing. Set DB_CONNECTION env var.");
    }

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString)
    );

    #endregion

    #region App Pipeline
    var app = builder.Build();

    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new { msg = "Server error" });
        });
    });
    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseAuthentication();
    app.UseAuthorization();
    app.UseHttpsRedirection();
    app.MapControllers();
    #endregion

    #region Database Seeding
    using (var scope = app.Services.CreateScope())
    {
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<AppDbContext>();
            await context.Database.EnsureCreatedAsync();
            await DbInitializer.SeedAsync(context);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred seeding the database.");
        }
    }
    #endregion

    #region Run
    app.Run();
    #endregion
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Startup failed: {ex.Message}");
    Console.Error.WriteLine(ex);
    Environment.ExitCode = 1;
}
