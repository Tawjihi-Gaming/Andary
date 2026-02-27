using Microsoft.Extensions.DependencyInjection;
using Backend.Services;
using Backend.Hubs;    
using System;
using System.Text.Json.Serialization;

namespace Backend.Extensions
{
    public static class AppServicesExtensions
    {
        public static IServiceCollection AddAppServices(this IServiceCollection services)
        {
            // SignalR
            services
                .AddSignalR()
                .AddJsonProtocol(options =>
                {
                    // Send enum names (e.g. "CollectingAns") instead of numeric values.
                    // Frontend phase mapping expects string names.
                    options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            // HttpClient as Scoped
            services.AddScoped<HttpClient>();

            // Game services
            services.AddSingleton<GameManager>();
            services.AddScoped<QuestionsService>();

            // Email background queue
            services.AddSingleton<IEmailQueue, EmailQueue>();
            services.AddSingleton<EmailSender>();
            services.AddHostedService<EmailBackgroundService>();

            // Friend service
            services.AddScoped<FriendService>();

            // CORS
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL")
                                        ?.Trim()
                                        .TrimEnd('/');

                    var origins = new List<string> { "http://localhost:5173" };
                    if (!string.IsNullOrEmpty(frontendUrl))
                        origins.Add(frontendUrl);

                    policy.WithOrigins(origins.ToArray())
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            return services;
        }
    }
}
