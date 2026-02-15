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
    var jwtKey = builder.Configuration["Jwt:Key"];
    var jwtIssuer = builder.Configuration["Jwt:Issuer"];
    var jwtAudience = builder.Configuration["Jwt:Audience"];
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
    builder.Services.AddSingleton(googleOAuthConfig);
    #endregion

    #region Database
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
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
