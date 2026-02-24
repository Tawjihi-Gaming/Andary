using Microsoft.Extensions.DependencyInjection;
using System;
using System.IO;
using System.Text.Json;
using Backend.Models.Configs;

namespace Backend.Extensions
{
    public static class GoogleOAuthExtensions
    {
        public static IServiceCollection AddGoogleOAuth(this IServiceCollection services)
        {
            var googleOAuthJson = File.ReadAllText("Config/google.json");

            var googleOAuthConfig = JsonSerializer.Deserialize<GoogleOAuthConfig>(googleOAuthJson)
                ?? throw new InvalidOperationException("Google OAuth configuration is missing or invalid.");

            var envClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
            var envClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
            var envRedirectUri = Environment.GetEnvironmentVariable("GOOGLE_REDIRECT_URI");
            var envJsOrigins = Environment.GetEnvironmentVariable("FRONTEND_URL");

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
            services.AddSingleton(googleOAuthConfig);  

            return services;
        }
    }
}
